# Design: Project Config

## Context

OpenSpec currently has a fixed schema resolution order:
1. `--schema` CLI flag
2. `.openspec.yaml` in change directory
3. Hardcoded default: `"spec-driven"`

This forces users who want project-level customization to fork entire schemas, even for simple additions like injecting tech stack context or adding artifact-specific rules.

The proposal introduces `openspec/config.yaml` as a lightweight customization layer that sits between preset schemas and full forking. It allows teams to:
- Set a default schema
- Inject project context into all artifacts
- Add per-artifact rules

**Constraints:**
- Must not break existing changes that lack config
- Must maintain clean separation between "configure" (this) and "fork" (project-local-schemas)
- Config is project-level only (no global/user-level config)

**Key stakeholders:**
- OpenSpec users who need light customization without forking
- Teams sharing workflow conventions via committed config

## Goals / Non-Goals

**Goals:**
- Load and parse `openspec/config.yaml` using Zod schema
- Use config's `schema` field as default in schema resolution
- Inject `context` into all artifact instructions
- Inject `rules` into matching artifact instructions only
- Gracefully handle missing or invalid config (fallback to defaults)

**Non-Goals:**
- Structural changes to schemas (`skip`, `add`, inheritance) - those belong in fork path
- File references for context (`context: ./file.md`) - start with strings
- Global user-level config (XDG dirs, etc.)
- Config management commands (`openspec config init`) - manual creation for now
- Migration from old setups (no existing config to migrate from)

## Decisions

### 1. Config File Format: YAML vs JSON

**Decision:** Use YAML (`.yaml` extension, support `.yml` alias)

**Rationale:**
- YAML supports multi-line strings naturally (`context: |`)
- More readable for documentation-heavy content
- Consistent with `.openspec.yaml` used in changes
- Easy to parse with existing `yaml` library

**Alternatives considered:**
- JSON: More strict, but poor multi-line string UX
- TOML: Less familiar to most users

### 2. Config Location: Project Root vs openspec/ Directory

**Decision:** `./openspec/config.yaml` (inside openspec directory)

**Rationale:**
- Co-located with `openspec/schemas/` (project-local-schemas)
- Keeps project root clean
- Natural namespace for OpenSpec configuration
- Mirrors structure used by other tools (e.g., `.github/`)

**Alternatives considered:**
- `./openspec.config.yaml` in root: Pollutes root, less clear ownership
- XDG config directories: Out of scope, no global config yet

### 3. Context Injection: XML Tags vs Markdown Sections

**Decision:** Use XML-style tags `<context>` and `<rules>`

**Rationale:**
- Clear delimiters that don't conflict with Markdown
- Agents can easily parse structure
- Matches existing patterns in the codebase for special sections

**Example:**
```xml
<context>
Tech stack: TypeScript, React
</context>

<rules>
- Include rollback plan
</rules>

<template>
## Summary
...
</template>
```

**Alternatives considered:**
- Markdown headers: Conflicts with template content
- Comments: Less visible to agents

### 4. Schema Resolution: Insert Position

**Decision:** Config's `schema` field goes between change metadata and hardcoded default

**New resolution order:**
1. `--schema` CLI flag (explicit override)
2. `.openspec.yaml` in change directory (change-specific binding)
3. **`openspec/config.yaml` schema field** (NEW - project default)
4. `"spec-driven"` (hardcoded fallback)

**Rationale:**
- Preserves CLI and change-level overrides (most specific wins)
- Makes config act as a "project default"
- Backwards compatible (no existing configs to conflict with)

### 5. Rules Validation: Strict vs Permissive

**Decision:** Warn on unknown artifact IDs, don't error

**Rationale:**
- Future-proof: If schema adds new artifacts, old configs don't break
- Dev experience: Typos show warnings, but don't halt workflow
- User can fix incrementally

**Example:**
```yaml
rules:
  proposal: [...]
  testplan: [...]  # Schema doesn't have this artifact → WARN, not ERROR
```

### 6. Error Handling: Config Parse Failures

**Decision:** Log warning and fall back to defaults (don't halt commands)

**Rationale:**
- Syntax errors in config shouldn't break all of OpenSpec
- User can fix config incrementally
- Commands remain usable during config development

**Warning message:**
```
⚠️  Failed to parse openspec/config.yaml: [error details]
    Falling back to default schema (spec-driven)
```

## Implementation Plan

### Phase 1: Core Types and Loading

**File: `src/core/project-config.ts` (NEW)**

```typescript
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { findProjectRoot } from '../utils/path-utils';

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
  schema: z.string().min(1).describe('The workflow schema to use (e.g., "spec-driven", "tdd")'),
  context: z.string().optional().describe('Project context injected into all artifact instructions'),
  rules: z.record(
    z.string(),
    z.array(z.string())
  ).optional().describe('Per-artifact rules, keyed by artifact ID'),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

const MAX_CONTEXT_SIZE = 50 * 1024; // 50KB hard limit

/**
 * Read and parse openspec/config.yaml from project root.
 * Uses resilient parsing - validates each field independently using Zod safeParse.
 * Returns null if file doesn't exist.
 * Returns partial config if some fields are invalid (with warnings).
 */
export function readProjectConfig(): ProjectConfig | null {
  const projectRoot = findProjectRoot();

  // Try both .yaml and .yml, prefer .yaml
  let configPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (!existsSync(configPath)) {
    configPath = path.join(projectRoot, 'openspec', 'config.yml');
    if (!existsSync(configPath)) {
      return null; // No config is OK
    }
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const raw = parseYaml(content);

    if (!raw || typeof raw !== 'object') {
      console.warn(`⚠️  openspec/config.yaml is not a valid YAML object`);
      return null;
    }

    const config: Partial<ProjectConfig> = {};

    // Parse schema field using Zod
    const schemaField = z.string().min(1);
    const schemaResult = schemaField.safeParse(raw.schema);
    if (schemaResult.success) {
      config.schema = schemaResult.data;
    } else if (raw.schema !== undefined) {
      console.warn(`⚠️  Invalid 'schema' field in config (must be non-empty string)`);
    }

    // Parse context field with size limit
    if (raw.context !== undefined) {
      const contextField = z.string();
      const contextResult = contextField.safeParse(raw.context);

      if (contextResult.success) {
        const contextSize = Buffer.byteLength(contextResult.data, 'utf-8');
        if (contextSize > MAX_CONTEXT_SIZE) {
          console.warn(
            `⚠️  Context too large (${(contextSize / 1024).toFixed(1)}KB, limit: ${MAX_CONTEXT_SIZE / 1024}KB)`
          );
          console.warn(`   Ignoring context field`);
        } else {
          config.context = contextResult.data;
        }
      } else {
        console.warn(`⚠️  Invalid 'context' field in config (must be string)`);
      }
    }

    // Parse rules field using Zod
    if (raw.rules !== undefined) {
      const rulesField = z.record(z.string(), z.array(z.string()));

      // First check if it's an object structure
      if (typeof raw.rules === 'object' && !Array.isArray(raw.rules)) {
        const parsedRules: Record<string, string[]> = {};
        let hasValidRules = false;

        for (const [artifactId, rules] of Object.entries(raw.rules)) {
          const rulesArrayResult = z.array(z.string()).safeParse(rules);

          if (rulesArrayResult.success) {
            // Filter out empty strings
            const validRules = rulesArrayResult.data.filter(r => r.length > 0);
            if (validRules.length > 0) {
              parsedRules[artifactId] = validRules;
              hasValidRules = true;
            }
            if (validRules.length < rulesArrayResult.data.length) {
              console.warn(
                `⚠️  Some rules for '${artifactId}' are empty strings, ignoring them`
              );
            }
          } else {
            console.warn(
              `⚠️  Rules for '${artifactId}' must be an array of strings, ignoring this artifact's rules`
            );
          }
        }

        if (hasValidRules) {
          config.rules = parsedRules;
        }
      } else {
        console.warn(`⚠️  Invalid 'rules' field in config (must be object)`);
      }
    }

    // Return partial config even if some fields failed
    return Object.keys(config).length > 0 ? (config as ProjectConfig) : null;

  } catch (error) {
    console.warn(`⚠️  Failed to parse openspec/config.yaml:`, error);
    return null;
  }
}

/**
 * Validate artifact IDs in rules against a schema's artifacts.
 * Called during instruction loading (when schema is known).
 * Returns warnings for unknown artifact IDs.
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
    .map(s => ({ ...s, distance: levenshtein(invalidSchemaName, s.name) }))
    .filter(s => s.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const builtIn = availableSchemas.filter(s => s.isBuiltIn).map(s => s.name);
  const projectLocal = availableSchemas.filter(s => !s.isBuiltIn).map(s => s.name);

  let message = `❌ Schema '${invalidSchemaName}' not found in openspec/config.yaml\n\n`;

  if (suggestions.length > 0) {
    message += `Did you mean one of these?\n`;
    suggestions.forEach(s => {
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
```

### Phase 2: Schema Resolution

**File: `src/utils/change-metadata.ts`**

Update `resolveSchemaForChange()` to check config:

```typescript
export function resolveSchemaForChange(
  changeName: string,
  cliSchema?: string
): string {
  // 1. CLI flag wins
  if (cliSchema) {
    return cliSchema;
  }

  // 2. Change metadata (.openspec.yaml)
  const metadata = readChangeMetadata(changeName);
  if (metadata?.schema) {
    return metadata.schema;
  }

  // 3. Project config (NEW)
  const projectConfig = readProjectConfig();
  if (projectConfig?.schema) {
    return projectConfig.schema;
  }

  // 4. Hardcoded default
  return 'spec-driven';
}
```

**File: `src/utils/change-utils.ts`**

Update `createNewChange()` to use config schema:

```typescript
export function createNewChange(
  changeName: string,
  schema?: string
): void {
  // Use schema from config if not specified
  const resolvedSchema = schema ?? readProjectConfig()?.schema ?? 'spec-driven';

  // ... rest of change creation logic
}
```

### Phase 3: Instruction Injection and Validation

**File: `src/core/artifact-graph/instruction-loader.ts`**

Update `loadInstructions()` to inject context, rules, and validate artifact IDs:

```typescript
// Session-level cache for validation warnings (avoid repeating same warnings)
const shownWarnings = new Set<string>();

export function loadInstructions(
  changeName: string,
  artifactId: string
): InstructionOutput {
  const projectConfig = readProjectConfig();

  // Load base instructions from schema
  const baseInstructions = loadSchemaInstructions(changeName, artifactId);
  const schema = getSchemaForChange(changeName); // Assumes we have schema loaded

  // Validate rules artifact IDs (only once per session)
  if (projectConfig?.rules) {
    const validArtifactIds = new Set(schema.artifacts.map(a => a.id));
    const warnings = validateConfigRules(
      projectConfig.rules,
      validArtifactIds,
      schema.name
    );

    // Show each unique warning only once per session
    for (const warning of warnings) {
      if (!shownWarnings.has(warning)) {
        console.warn(`⚠️  ${warning}`);
        shownWarnings.add(warning);
      }
    }
  }

  // Build enriched instruction with XML sections
  let enrichedInstruction = '';

  // Add context (all artifacts)
  if (projectConfig?.context) {
    enrichedInstruction += `<context>\n${projectConfig.context}\n</context>\n\n`;
  }

  // Add rules (only for matching artifact)
  const rulesForArtifact = projectConfig?.rules?.[artifactId];
  if (rulesForArtifact && rulesForArtifact.length > 0) {
    enrichedInstruction += `<rules>\n`;
    for (const rule of rulesForArtifact) {
      enrichedInstruction += `- ${rule}\n`;
    }
    enrichedInstruction += `</rules>\n\n`;
  }

  // Add original template
  enrichedInstruction += `<template>\n${baseInstructions.template}\n</template>`;

  return {
    ...baseInstructions,
    instruction: enrichedInstruction,
  };
}
```

**Note on validation timing:** Rules are validated lazily during instruction loading (not at config load time) because:
1. Schema isn't known at config load time (circular dependency)
2. Warnings shown when user actually uses the feature (better UX)
3. Validation warnings cached per session to avoid spam

### Phase 4: Performance and Caching

**Why config is read multiple times:**

```typescript
// Example: "openspec instructions proposal --change my-feature"

// 1. Schema resolution (to know which schema to use)
resolveSchemaForChange('my-feature')
  → readProjectConfig()  // Read #1

// 2. Instruction loading (to inject context and rules)
loadInstructions('my-feature', 'proposal')
  → readProjectConfig()  // Read #2

// Result: Config read twice per command
// More complex commands may read 3-5 times
```

**Performance Strategy:**

V1 approach: No caching, read config fresh each time
- Simpler implementation
- No cache invalidation complexity
- Acceptable if config reads are fast enough

**Benchmark targets:**
- Typical config (1KB context, 5 artifact rules): **< 10ms** per read (imperceptible even 5x)
- Large config (50KB context limit): **< 50ms** per read (acceptable for rare case)

**If benchmarks fail:** Add simple caching:

```typescript
// Simple in-memory cache with no invalidation
let cachedConfig: { mtime: number; config: ProjectConfig | null } | null = null;

export function readProjectConfig(): ProjectConfig | null {
  const projectRoot = findProjectRoot();
  const configPath = path.join(projectRoot, 'openspec', 'config.yaml');

  if (!existsSync(configPath)) {
    return null;
  }

  const stats = statSync(configPath);
  const mtime = stats.mtimeMs;

  // Return cached config if file hasn't changed
  if (cachedConfig && cachedConfig.mtime === mtime) {
    return cachedConfig.config;
  }

  // Read and parse config
  const config = parseConfigFile(configPath); // Extracted logic

  // Cache result
  cachedConfig = { mtime, config };
  return config;
}
```

**Performance testing task:** Add to Phase 6 (Testing)
- Measure typical config read time (1KB context)
- Measure large config read time (50KB context limit)
- Measure repeated reads within single command
- Document results, add caching only if needed

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  User runs: openspec instructions proposal --change foo     │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  resolveSchemaForChange("foo")                               │
│                                                              │
│  1. Check CLI flag ✗                                         │
│  2. Check .openspec.yaml ✗                                   │
│  3. Check openspec/config.yaml ✓ → "spec-driven"             │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  loadInstructions("foo", "proposal")                         │
│                                                              │
│  1. Load spec-driven/artifacts/proposal.yaml                 │
│  2. Read openspec/config.yaml                                │
│  3. Build enriched instruction:                              │
│     - <context>...</context>                                 │
│     - <rules>...</rules>  (if rules.proposal exists)         │
│     - <template>...</template>                               │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  Return InstructionOutput with enriched content              │
│                                                              │
│  Agent sees project context + rules + schema template        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

**[Risk]** Config typos silently ignored (e.g., wrong artifact ID in rules)
→ **Mitigation:** Validate and warn on unknown artifact IDs during config load. Don't error to allow forward compatibility.

**[Risk]** Context grows too large, pollutes all artifact instructions
→ **Mitigation:** Document recommended size (< 500 chars). If this becomes an issue, add per-artifact context override later.

**[Risk]** YAML parsing errors break OpenSpec commands
→ **Mitigation:** Catch parse errors, log warning, fall back to defaults. Commands remain functional.

**[Risk]** Config cached incorrectly across commands
→ **Mitigation:** Read config fresh on each `readProjectConfig()` call. No caching layer for v1 (simplicity over perf).

**[Trade-off]** Context is injected into ALL artifacts
→ **Benefit:** Consistent project knowledge across workflow
→ **Cost:** Can't scope context to specific artifacts (yet)
→ **Future:** Add `context: { global: "...", proposal: "..." }` if needed

**[Trade-off]** Rules use artifact IDs, not human names
→ **Benefit:** Stable identifiers (IDs don't change)
→ **Cost:** User needs to know artifact IDs from schema
→ **Mitigation:** Document common artifact IDs, show in `openspec status` output

## Migration Plan

**No migration needed** - this is a new feature with no existing state.

**Rollout steps:**
1. Deploy with config loading behind feature flag (optional, for safety)
2. Test with internal project (this repo)
3. Document in README with examples
4. Remove feature flag if used

**Rollback strategy:**
- Config is additive only (doesn't break existing changes)
- If bugs found, config parsing can be disabled with env var
- Users can delete config file to restore old behavior

## Open Questions

**Q: Should context support file references (`context: ./CONTEXT.md`)?**
**A (deferred):** Start with string-only. Add file reference later if users request it. Keeps v1 simple.

**Q: Should we support `.yml` alias in addition to `.yaml`?**
**A:** Yes, check both extensions. Prefer `.yaml` in docs, but accept `.yml` for users who prefer it.

**Q: What if config's schema field references a non-existent schema?**
**A:** Schema resolution will fail downstream. Show error when trying to load schema, suggest valid schema names.

**Q: Should rules be validated against the resolved schema's artifact IDs?**
**A:** Yes, validate and warn, but don't halt. This allows forward compatibility if schema evolves.
