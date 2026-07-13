import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalDataDir } from '../global-config.js';
import { readProjectConfig } from '../project-config.js';
import {
  getStoreRegistryPath,
  parseStoreRegistryState,
} from '../store/foundation.js';
import { getStoreRootForBackend } from '../store/registry.js';
import { parseSchema, SchemaValidationError } from './schema.js';
import type { SchemaYaml } from './types.js';

/**
 * Error thrown when loading a schema fails.
 */
export class SchemaLoadError extends Error {
  constructor(
    message: string,
    public readonly schemaPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SchemaLoadError';
  }
}

/**
 * Gets the package's built-in schemas directory path.
 * Uses import.meta.url to resolve relative to the current module.
 */
export function getPackageSchemasDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // Navigate from dist/core/artifact-graph/ to package root's schemas/
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas');
}

/**
 * Gets the user's schema override directory path.
 */
export function getUserSchemasDir(): string {
  return path.join(getGlobalDataDir(), 'schemas');
}

/**
 * Gets the project-local schemas directory path.
 * @param projectRoot - The project root directory
 * @returns The path to the project's schemas directory
 */
export function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'schemas');
}

/** A referenced store whose schemas this root inherits. */
export interface ReferencedSchemaSource {
  storeId: string;
  /** The store's openspec/schemas directory. */
  dir: string;
}

/**
 * The schema directories of every store this root references, in
 * declaration order — a repo that declares `references: [team-hub]`
 * inherits team-hub's schemas the way it already sees its specs.
 *
 * Deliberately tolerant and synchronous: schema resolution runs deep in
 * sync call chains, and a missing config, registry, or checkout must
 * degrade to "no inherited schemas", never an error. One hop only —
 * references of references are not followed.
 */
export function getReferencedSchemaSources(
  projectRoot: string
): ReferencedSchemaSource[] {
  let references;
  try {
    references = readProjectConfig(projectRoot)?.references;
  } catch {
    return [];
  }
  if (!references || references.length === 0) return [];

  let registry;
  try {
    registry = parseStoreRegistryState(
      fs.readFileSync(getStoreRegistryPath({}), 'utf-8')
    );
  } catch {
    return [];
  }

  const resolvedRoot = path.resolve(projectRoot);
  const sources: ReferencedSchemaSource[] = [];
  for (const reference of references) {
    const entry = registry.stores[reference.id];
    if (!entry) continue;
    let storeRoot;
    try {
      storeRoot = getStoreRootForBackend(entry.backend);
    } catch {
      continue;
    }
    // A store referencing itself must not shadow its own project dir.
    if (path.resolve(storeRoot) === resolvedRoot) continue;
    sources.push({
      storeId: reference.id,
      dir: getProjectSchemasDir(storeRoot),
    });
  }
  return sources;
}

/**
 * Resolves a schema name to its directory path.
 *
 * Resolution order (when projectRoot is provided):
 * 1. Project-local: <projectRoot>/openspec/schemas/<name>/schema.yaml
 * 2. Referenced stores (declaration order): <storeRoot>/openspec/schemas/<name>/schema.yaml
 * 3. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 4. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * When projectRoot is not provided, only user override and package built-in are checked
 * (backward compatible behavior).
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @param projectRoot - Optional project root directory for project-local schema resolution
 * @returns The path to the schema directory, or null if not found
 */
export function getSchemaDir(
  name: string,
  projectRoot?: string
): string | null {
  // 1. Check project-local directory (if projectRoot provided)
  if (projectRoot) {
    const projectDir = path.join(getProjectSchemasDir(projectRoot), name);
    const projectSchemaPath = path.join(projectDir, 'schema.yaml');
    if (fs.existsSync(projectSchemaPath)) {
      return projectDir;
    }

    // 1b. Check referenced stores (declaration order): schemas inherit
    // through `references:` the way specs already surface through them.
    for (const source of getReferencedSchemaSources(projectRoot)) {
      const storeDir = path.join(source.dir, name);
      if (fs.existsSync(path.join(storeDir, 'schema.yaml'))) {
        return storeDir;
      }
    }
  }

  // 2. Check user override directory
  const userDir = path.join(getUserSchemasDir(), name);
  const userSchemaPath = path.join(userDir, 'schema.yaml');
  if (fs.existsSync(userSchemaPath)) {
    return userDir;
  }

  // 3. Check package built-in directory
  const packageDir = path.join(getPackageSchemasDir(), name);
  const packageSchemaPath = path.join(packageDir, 'schema.yaml');
  if (fs.existsSync(packageSchemaPath)) {
    return packageDir;
  }

  return null;
}

/**
 * Resolves a schema name to a SchemaYaml object.
 *
 * Resolution order (when projectRoot is provided):
 * 1. Project-local: <projectRoot>/openspec/schemas/<name>/schema.yaml
 * 2. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 3. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * When projectRoot is not provided, only user override and package built-in are checked
 * (backward compatible behavior).
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @param projectRoot - Optional project root directory for project-local schema resolution
 * @returns The resolved schema object
 * @throws Error if schema is not found in any location
 */
export function resolveSchema(name: string, projectRoot?: string): SchemaYaml {
  // Normalize name (remove .yaml extension if provided)
  const normalizedName = name.replace(/\.ya?ml$/, '');

  const schemaDir = getSchemaDir(normalizedName, projectRoot);
  if (!schemaDir) {
    const availableSchemas = listSchemas(projectRoot);
    throw new Error(
      `Schema '${normalizedName}' not found. Available schemas: ${availableSchemas.join(', ')}`
    );
  }

  const schemaPath = path.join(schemaDir, 'schema.yaml');

  // Load and parse the schema
  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to read schema at '${schemaPath}': ${ioError.message}`,
      schemaPath,
      ioError
    );
  }

  try {
    return applyInstructionFiles(parseSchema(content), schemaDir);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      throw new SchemaLoadError(
        `Invalid schema at '${schemaPath}': ${err.message}`,
        schemaPath,
        err
      );
    }
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to parse schema at '${schemaPath}': ${parseError.message}`,
      schemaPath,
      parseError
    );
  }
}

/**
 * Long-form guidance can live beside the schema instead of inline YAML:
 * `<schemaDir>/instructions/<artifact-id>.md` supplies an artifact's
 * instruction (and `instructions/apply.md` the apply phase's), the same
 * way templates already live in `<schemaDir>/templates/`. A file wins
 * over an inline `instruction:` value.
 */
function applyInstructionFiles(schema: SchemaYaml, schemaDir: string): SchemaYaml {
  const instructionsDir = path.join(schemaDir, 'instructions');
  if (!fs.existsSync(instructionsDir)) {
    return schema;
  }

  const readInstruction = (id: string): string | undefined => {
    const filePath = path.join(instructionsDir, `${id}.md`);
    try {
      return fs.existsSync(filePath)
        ? fs.readFileSync(filePath, 'utf-8').trim()
        : undefined;
    } catch {
      return undefined;
    }
  };

  for (const artifact of schema.artifacts) {
    const fromFile = readInstruction(artifact.id);
    if (fromFile) {
      artifact.instruction = fromFile;
    }
  }
  if (schema.apply) {
    const fromFile = readInstruction('apply');
    if (fromFile) {
      schema.apply.instruction = fromFile;
    }
  }
  return schema;
}

/**
 * Lists all available schema names.
 * Combines project-local, user override, and package built-in schemas.
 *
 * @param projectRoot - Optional project root directory for project-local schema resolution
 */
export function listSchemas(projectRoot?: string): string[] {
  const schemas = new Set<string>();

  // Add package built-in schemas
  const packageDir = getPackageSchemasDir();
  if (fs.existsSync(packageDir)) {
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(packageDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  // Add user override schemas (may override package schemas)
  const userDir = getUserSchemasDir();
  if (fs.existsSync(userDir)) {
    for (const entry of fs.readdirSync(userDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(userDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  // Add project-local and referenced-store schemas (if projectRoot provided)
  if (projectRoot) {
    const dirs = [
      getProjectSchemasDir(projectRoot),
      ...getReferencedSchemaSources(projectRoot).map((source) => source.dir),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const schemaPath = path.join(dir, entry.name, 'schema.yaml');
          if (fs.existsSync(schemaPath)) {
            schemas.add(entry.name);
          }
        }
      }
    }
  }

  return Array.from(schemas).sort();
}

/**
 * Schema info with metadata (name, description, artifacts).
 */
export interface SchemaInfo {
  name: string;
  description: string;
  artifacts: string[];
  source: 'project' | 'store' | 'user' | 'package';
  /** The referenced store the schema is inherited from (source: 'store'). */
  store?: string;
}

/**
 * Lists all available schemas with their descriptions and artifact lists.
 * Useful for agent skills to present schema selection to users.
 *
 * @param projectRoot - Optional project root directory for project-local schema resolution
 */
export function listSchemasWithInfo(projectRoot?: string): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const seenNames = new Set<string>();

  const collectFromDir = (
    dir: string,
    source: SchemaInfo['source'],
    store?: string
  ): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || seenNames.has(entry.name)) continue;
      const schemaPath = path.join(dir, entry.name, 'schema.yaml');
      if (!fs.existsSync(schemaPath)) continue;
      try {
        const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
        schemas.push({
          name: entry.name,
          description: schema.description || '',
          artifacts: schema.artifacts.map((a) => a.id),
          source,
          ...(store !== undefined ? { store } : {}),
        });
        seenNames.add(entry.name);
      } catch {
        // Skip invalid schemas
      }
    }
  };

  // Add project-local schemas first, then schemas inherited from
  // referenced stores (declaration order) — mirrors getSchemaDir.
  if (projectRoot) {
    collectFromDir(getProjectSchemasDir(projectRoot), 'project');
    for (const source of getReferencedSchemaSources(projectRoot)) {
      collectFromDir(source.dir, 'store', source.storeId);
    }
  }

  // Add user override schemas (if not shadowed), then package built-ins.
  collectFromDir(getUserSchemasDir(), 'user');
  collectFromDir(getPackageSchemasDir(), 'package');

  return schemas.sort((a, b) => a.name.localeCompare(b.name));
}
