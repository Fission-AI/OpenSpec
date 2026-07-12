import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * Zod schema for project configuration.
 *
 * Purpose:
 * 1. Documentation - clearly defines the config file structure
 * 2. Type safety - TypeScript infers ProjectConfig type from schema
 * 3. Runtime validation - uses safeParse() for resilient field-by-field validation
 *
 * Why Zod over manual validation:
 * - Helps understand OpenSpec's data interfaces at a glance
 * - Single source of truth for type and validation
 * - Consistent with other OpenSpec schemas
 */
export const ProjectConfigSchema = z.object({
  // Required: which schema to use (e.g., "spec-driven", or project-local schema name)
  schema: z
    .string()
    .min(1)
    .describe('The workflow schema to use (e.g., "spec-driven")'),

  // Optional: project context (injected into all artifact instructions)
  // Max size: 50KB (enforced during parsing)
  context: z
    .string()
    .optional()
    .describe('Project context injected into all artifact instructions'),

  // Optional: per-artifact rules (additive to schema's built-in guidance)
  rules: z
    .record(
      z.string(), // artifact ID
      z.array(z.string()) // list of rules
    )
    .optional()
    .describe('Per-artifact rules, keyed by artifact ID'),

  // Note: the `references` field (id strings or {id, remote} maps) is
  // deliberately absent here — readProjectConfig parses and normalizes
  // it by hand (see DeclarationEntry below); a schema entry nothing
  // parses would only drift from the real behavior.

  // Optional: the declared default store. Only consulted by root
  // resolution when this openspec/ directory is config-only (no specs/
  // or changes/); a fallback, never an override.
  store: z
    .string()
    .optional()
    .describe('Store id used as the OpenSpec root when no local planning shape exists'),
});

/** Normalized in-memory shape of a referenced store declaration. */
export interface DeclarationEntry {
  id: string;
  /** Clone source rendered into onboarding fixes. */
  remote?: string;
}

export type ProjectConfig = z.infer<typeof ProjectConfigSchema> & {
  references?: DeclarationEntry[];
};

/**
 * Parser for `references:` declarations: string entries or
 * {id, remote} maps, normalized to DeclarationEntry[]. Dedup keys on
 * id and keeps the first position; the first entry carrying a remote
 * supplies it (a later duplicate fills a missing remote, never
 * overrides). Invalid entries drop with a warning like other resilient
 * fields; returns undefined when the field is absent or normalizes to
 * empty.
 */
function parseDeclarationList(raw: unknown): DeclarationEntry[] | undefined {
  const fieldName = 'references';
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    console.warn(`Invalid '${fieldName}' field in config (must be an array of store ids)`);
    return undefined;
  }

  const byId = new Map<string, DeclarationEntry>();
  let droppedEntries = false;
  let droppedRemotes = false;

  for (const entry of raw) {
    let declaration: DeclarationEntry | null = null;
    if (typeof entry === 'string') {
      declaration = { id: entry };
    } else if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const candidate = entry as Record<string, unknown>;
      if (typeof candidate.id === 'string') {
        declaration = { id: candidate.id };
        if (typeof candidate.remote === 'string' && candidate.remote.length > 0) {
          declaration.remote = candidate.remote;
        } else if (candidate.remote !== undefined) {
          droppedRemotes = true; // remote dropped, id kept
        }
      }
    }

    if (!declaration) {
      droppedEntries = true;
      continue;
    }

    const existing = byId.get(declaration.id);
    if (!existing) {
      byId.set(declaration.id, declaration);
    } else if (existing.remote === undefined && declaration.remote !== undefined) {
      existing.remote = declaration.remote;
    }
  }

  if (droppedEntries) {
    console.warn(`Some '${fieldName}' entries are invalid, ignoring them`);
  }
  if (droppedRemotes) {
    console.warn(
      `Some '${fieldName}' remotes are not non-empty strings; the ids are kept without a clone source`
    );
  }
  return byId.size > 0 ? [...byId.values()] : undefined;
}

export const MAX_CONTEXT_SIZE = 50 * 1024; // 50KB hard limit, shared with the references index

/**
 * Read and parse openspec/config.yaml from project root.
 * Uses resilient parsing - validates each field independently using Zod safeParse.
 * Returns null if file doesn't exist.
 * Returns partial config if some fields are invalid (with warnings).
 *
 * Performance note (Jan 2025):
 * Benchmarks showed direct file reads are fast enough without caching:
 * - Typical config (1KB): ~0.5ms per read
 * - Large config (50KB): ~1.6ms per read
 * - Missing config: ~0.01ms per read
 * Config is read 1-2 times per command (schema resolution + instruction loading),
 * adding ~1-3ms total overhead. Caching would add complexity (mtime checks,
 * invalidation logic) for negligible benefit. Direct reads also ensure config
 * changes are reflected immediately without stale cache issues.
 *
 * @param projectRoot - The root directory of the project (where `openspec/` lives)
 * @returns Parsed config or null if file doesn't exist
 */
export function readProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = resolveConfigFilePath(projectRoot);
  if (configPath === null) {
    return null; // No config is OK
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const raw = parseYaml(content);

    if (!raw || typeof raw !== 'object') {
      console.warn(`openspec/config.yaml is not a valid YAML object`);
      return null;
    }

    const config: Partial<ProjectConfig> = {};

    // Parse schema field using Zod
    const schemaField = z.string().min(1);
    const schemaResult = schemaField.safeParse(raw.schema);
    if (schemaResult.success) {
      config.schema = schemaResult.data;
    } else if (raw.schema !== undefined) {
      console.warn(`Invalid 'schema' field in config (must be non-empty string)`);
    }

    // Parse context field with size limit
    if (raw.context !== undefined) {
      const contextField = z.string();
      const contextResult = contextField.safeParse(raw.context);

      if (contextResult.success) {
        const contextSize = Buffer.byteLength(contextResult.data, 'utf-8');
        if (contextSize > MAX_CONTEXT_SIZE) {
          console.warn(
            `Context too large (${(contextSize / 1024).toFixed(1)}KB, limit: ${MAX_CONTEXT_SIZE / 1024}KB)`
          );
          console.warn(`Ignoring context field`);
        } else {
          config.context = contextResult.data;
        }
      } else {
        console.warn(`Invalid 'context' field in config (must be string)`);
      }
    }

    // Parse rules field using Zod
    if (raw.rules !== undefined) {
      const rulesField = z.record(z.string(), z.array(z.string()));

      // First check if it's an object structure (guard against null since typeof null === 'object')
      if (typeof raw.rules === 'object' && raw.rules !== null && !Array.isArray(raw.rules)) {
        const parsedRules: Record<string, string[]> = {};
        let hasValidRules = false;

        for (const [artifactId, rules] of Object.entries(raw.rules)) {
          const rulesArrayResult = z.array(z.string()).safeParse(rules);

          if (rulesArrayResult.success) {
            // Filter out empty strings
            const validRules = rulesArrayResult.data.filter((r) => r.length > 0);
            if (validRules.length > 0) {
              parsedRules[artifactId] = validRules;
              hasValidRules = true;
            }
            if (validRules.length < rulesArrayResult.data.length) {
              console.warn(
                `Some rules for '${artifactId}' are empty strings, ignoring them`
              );
            }
          } else {
            console.warn(
              `Rules for '${artifactId}' must be an array of strings, ignoring this artifact's rules`
            );
          }
        }

        if (hasValidRules) {
          config.rules = parsedRules;
        }
      } else {
        console.warn(`Invalid 'rules' field in config (must be object)`);
      }
    }

    const references = parseDeclarationList(raw.references);
    if (references) {
      config.references = references;
    }

    // Parse store pointer field: a string, or dropped with a warning.
    // (Root resolution does NOT use this parse — it uses readStorePointer
    // below, which errors on malformed pointers instead of dropping.)
    if (raw.store !== undefined) {
      if (typeof raw.store === 'string') {
        config.store = raw.store;
      } else {
        console.warn(
          `Warning: ignoring invalid store: field in ${configPathForWarnings(projectRoot)} (must be a single store id string).`
        );
      }
    }

    // Return partial config even if some fields failed
    return Object.keys(config).length > 0 ? (config as ProjectConfig) : null;
  } catch (error) {
    console.warn(
      `Warning: could not parse ${configPathForWarnings(projectRoot)} (${error instanceof Error ? error.message.split('\n')[0] : String(error)}); ignoring it.`
    );
    return null;
  }
}

function configPathForWarnings(projectRoot: string): string {
  return resolveConfigFilePath(projectRoot) ?? path.join(projectRoot, 'openspec', 'config.yaml');
}

/**
 * Validate artifact IDs in rules against a schema's artifacts.
 * Called during instruction loading (when schema is known).
 * Returns warnings for unknown artifact IDs.
 *
 * @param rules - The rules object from config
 * @param validArtifactIds - Set of valid artifact IDs from the schema
 * @param schemaName - Name of the schema for error messages
 * @returns Array of warning messages for unknown artifact IDs
 */
export function validateConfigRules(
  rules: Record<string, string[]>,
  validArtifactIds: Set<string>,
  schemaName: string
): string[] {
  const warnings: string[] = [];

  for (const artifactId of Object.keys(rules)) {
    if (!validArtifactIds.has(artifactId)) {
      const validIds = Array.from(validArtifactIds).sort().join(', ');
      warnings.push(
        `Unknown artifact ID in rules: "${artifactId}". ` +
          `Valid IDs for schema "${schemaName}": ${validIds}`
      );
    }
  }

  return warnings;
}

/**
 * Suggest valid schema names when user provides invalid schema.
 * Uses fuzzy matching to find similar names.
 *
 * @param invalidSchemaName - The invalid schema name from config
 * @param availableSchemas - List of available schemas with their type (built-in or project-local)
 * @returns Error message with suggestions and available schemas
 */
export function suggestSchemas(
  invalidSchemaName: string,
  availableSchemas: { name: string; isBuiltIn: boolean }[]
): string {
  // Simple fuzzy match: Levenshtein distance
  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Find closest matches (distance <= 3)
  const suggestions = availableSchemas
    .map((s) => ({ ...s, distance: levenshtein(invalidSchemaName, s.name) }))
    .filter((s) => s.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const builtIn = availableSchemas.filter((s) => s.isBuiltIn).map((s) => s.name);
  const projectLocal = availableSchemas.filter((s) => !s.isBuiltIn).map((s) => s.name);

  let message = `Schema '${invalidSchemaName}' not found in openspec/config.yaml\n\n`;

  if (suggestions.length > 0) {
    message += `Did you mean one of these?\n`;
    suggestions.forEach((s) => {
      const type = s.isBuiltIn ? 'built-in' : 'project-local';
      message += `  - ${s.name} (${type})\n`;
    });
    message += '\n';
  }

  message += `Available schemas:\n`;
  if (builtIn.length > 0) {
    message += `  Built-in: ${builtIn.join(', ')}\n`;
  }
  if (projectLocal.length > 0) {
    message += `  Project-local: ${projectLocal.join(', ')}\n`;
  } else {
    message += `  Project-local: (none found)\n`;
  }

  message += `\nFix: Edit openspec/config.yaml and change 'schema: ${invalidSchemaName}' to a valid schema name`;

  return message;
}

// -----------------------------------------------------------------------------
// Store pointer (declared default store)
// -----------------------------------------------------------------------------

export interface StorePointerRead {
  /** The declared store id, when present and a string. */
  value?: string;
  /** Set when the pointer cannot be trusted: the config file could not be
   * read as YAML, or the store key is present but not a string. An empty
   * or comments-only config is NOT malformed - it simply has no pointer. */
  malformed?: 'unparseable' | 'non_string';
  /** Absolute path of the config file actually read, or null when none exists. */
  filePath: string | null;
}

/**
 * Warning-silent targeted read of the `store:` pointer. Used by root
 * resolution (which must not re-emit the resilient parser's field
 * warnings) and by `openspec init`'s pointer guard. Unlike
 * `readProjectConfig`, a malformed value is REPORTED, not dropped —
 * a dropped pointer would silently flip where work lands.
 */
export function readStorePointer(projectRoot: string): StorePointerRead {
  const configPath = resolveConfigFilePath(projectRoot);
  if (configPath === null) {
    return { filePath: null };
  }

  try {
    const raw = parseYaml(readFileSync(configPath, 'utf-8'));
    // Empty, comments-only, or non-mapping configs carry no pointer;
    // they are imperfect, not malformed (readProjectConfig owns the
    // field warnings for those).
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { filePath: configPath };
    }
    const value = (raw as Record<string, unknown>).store;
    if (value === undefined) {
      return { filePath: configPath };
    }
    if (typeof value === 'string') {
      return { value, filePath: configPath };
    }
    return { malformed: 'non_string', filePath: configPath };
  } catch {
    return { malformed: 'unparseable', filePath: configPath };
  }
}

/** Shared .yaml/.yml probe used by readProjectConfig and readStorePointer. */
export function resolveConfigFilePath(projectRoot: string): string | null {
  const yamlPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (existsSync(yamlPath)) {
    return yamlPath;
  }
  const ymlPath = path.join(projectRoot, 'openspec', 'config.yml');
  return existsSync(ymlPath) ? ymlPath : null;
}

/** Human rendering of a malformed pointer reason, shared by every surface. */
export function storePointerProblem(reason: 'unparseable' | 'non_string'): string {
  return reason === 'unparseable'
    ? 'the config file could not be read as YAML'
    : 'the store key must be a single store id string';
}

export interface OpenSpecDirClassification {
  /** True when openspec/specs or openspec/changes exists as a directory. */
  hasPlanningShape: boolean;
  pointer: StorePointerRead;
}

/**
 * One classification for "real root vs config-only pointer dir", shared
 * by root resolution and the init pointer guard so they can never
 * disagree (slice 3.2).
 */
export function classifyOpenSpecDir(projectRoot: string): OpenSpecDirClassification {
  const openspecDir = path.join(projectRoot, 'openspec');
  const hasPlanningShape =
    isDirectorySync(path.join(openspecDir, 'specs')) ||
    isDirectorySync(path.join(openspecDir, 'changes'));
  return { hasPlanningShape, pointer: readStorePointer(projectRoot) };
}

function isDirectorySync(candidatePath: string): boolean {
  try {
    return statSync(candidatePath).isDirectory();
  } catch {
    return false;
  }
}
