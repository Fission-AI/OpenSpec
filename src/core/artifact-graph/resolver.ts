import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalDataDir } from '../global-config.js';
import { readProjectConfig, type ProjectConfig } from '../project-config.js';
import { verifyRemoteSchemaCache } from '../remote-schema/cache.js';
import { readSchemaLock } from '../remote-schema/lockfile.js';
import {
  assertNoProjectSchemaConflict,
  RemoteSchemaResolutionError,
} from '../remote-schema/authority.js';
import { validateRemoteSchemaDirectory } from './schema-directory.js';
import { FileSystemUtils } from '../../utils/file-system.js';
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

export function getRemoteSchemaDir(
  name: string,
  projectRoot: string,
  projectConfig?: ProjectConfig | null
): string | null {
  const config =
    projectConfig === undefined ? readProjectConfig(projectRoot) : projectConfig;
  const source = config?.schemaSources?.[name];
  if (!source) {
    return null;
  }
  assertNoProjectSchemaConflict(projectRoot, name);

  let lock;
  try {
    lock = readSchemaLock(projectRoot);
  } catch (error) {
    throw new RemoteSchemaResolutionError(
      'remote_lock_invalid',
      `${error instanceof Error ? error.message : String(error)}; run 'openspec schema sync'`
    );
  }
  const entry = lock?.schemas[name];
  if (!entry) {
    throw new RemoteSchemaResolutionError(
      'remote_not_locked',
      `Remote schema '${name}' is not locked; run 'openspec schema sync ${name}'`
    );
  }
  if (
    entry.git !== source.git ||
    entry.requestedRef !== source.ref ||
    entry.bundlePath !== source.path
  ) {
    throw new RemoteSchemaResolutionError(
      'remote_lock_mismatch',
      `Remote schema '${name}' lock does not match openspec/config.yaml; run 'openspec schema sync ${name}'`
    );
  }

  let cacheDir: string;
  try {
    cacheDir = verifyRemoteSchemaCache(entry.integrity);
  } catch (error) {
    throw new RemoteSchemaResolutionError(
      'remote_cache_invalid',
      `Remote schema '${name}' cache is unavailable or corrupt: ${
        error instanceof Error ? error.message : String(error)
      }; run 'openspec schema sync ${name} --locked'`
    );
  }
  try {
    validateRemoteSchemaDirectory(cacheDir, name);
  } catch (error) {
    throw new RemoteSchemaResolutionError(
      'remote_cache_invalid',
      `Remote schema '${name}' cache is invalid: ${
        error instanceof Error ? error.message : String(error)
      }; run 'openspec schema sync ${name} --locked'`
    );
  }
  return cacheDir;
}

/**
 * Determines whether a directory entry represents a schema directory candidate.
 *
 * Returns true for real directories and for symlinks whose target is a
 * directory. `fs.Dirent.isDirectory()` reports the raw entry type, so a symlink
 * (even one pointing at a directory) has `isDirectory() === false`; we
 * dereference such entries via `fs.statSync` to admit symlinked schema dirs
 * while still rejecting symlinks-to-files and broken/dangling symlinks.
 *
 * @param parentDir - The directory containing the entry
 * @param entry - The directory entry from `fs.readdirSync(..., { withFileTypes: true })`
 */
/**
 * Directories `schema fork` creates transiently while swapping a fork into
 * place: a staging copy (`.fork-staging-<rand>`, created via mkdtemp) and a
 * backup of the previous destination (`<name>.fork-backup-<pid>-<ts>`). Either
 * can briefly coexist with real schemas in the schemas dir, so discovery must
 * never surface them. Real schema names are kebab-case (no dots), so excluding
 * these dot-bearing temp names can never hide a legitimate schema.
 */
function isOwnedForkTempDir(name: string): boolean {
  return name.startsWith('.fork-staging-') || name.includes('.fork-backup-');
}

export function isSchemaDir(parentDir: string, entry: fs.Dirent): boolean {
  if (isOwnedForkTempDir(entry.name)) {
    return false;
  }
  if (entry.isDirectory()) {
    return true;
  }
  if (entry.isSymbolicLink()) {
    try {
      // statSync follows the link; isDirectory() reflects the target type.
      return fs.statSync(path.join(parentDir, entry.name)).isDirectory();
    } catch {
      // Broken symlink (dangling target) — statSync throws; treat as non-dir.
      return false;
    }
  }
  return false;
}

/**
 * Returns a schema directory only when its schema file stays within that
 * directory's canonical trust boundary. The directory itself may be a symlink;
 * external user schema links are an intentionally supported workflow.
 */
function getSchemaCandidateDir(schemasDir: string, name: string): string | null {
  const schemaDir = path.join(schemasDir, name);
  const schemaPath = path.join(schemaDir, 'schema.yaml');
  if (!fs.existsSync(schemaPath)) {
    return null;
  }

  try {
    FileSystemUtils.assertPathWithin(schemaDir, schemaPath);
    return schemaDir;
  } catch {
    return null;
  }
}

/**
 * Resolves a schema name to its directory path.
 *
 * Resolution order (when projectRoot is provided):
 * 1. A declared remote owns its name and conflicts with a same-named project schema
 * 2. Otherwise, project-local: <projectRoot>/openspec/schemas/<name>/schema.yaml
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
  projectRoot?: string,
  projectConfig?: ProjectConfig | null
): string | null {
  if (
    name.length === 0 ||
    name === '.' ||
    name === '..' ||
    /[\\/]/u.test(name) ||
    /^[A-Za-z]:/u.test(name) ||
    path.posix.isAbsolute(name) ||
    path.win32.isAbsolute(name)
  ) {
    return null;
  }

  // 1. Check project-local directory (if projectRoot provided)
  if (projectRoot) {
    const config =
      projectConfig === undefined ? readProjectConfig(projectRoot) : projectConfig;
    const declaredRemote = config?.schemaSources?.[name];
    if (declaredRemote) {
      return getRemoteSchemaDir(name, projectRoot, config);
    }

    const projectDir = getSchemaCandidateDir(getProjectSchemasDir(projectRoot), name);
    if (projectDir) {
      return projectDir;
    }

    const remoteDir = getRemoteSchemaDir(name, projectRoot, config);
    if (remoteDir) {
      return remoteDir;
    }
  }

  // 3. Check user override directory
  const userDir = getSchemaCandidateDir(getUserSchemasDir(), name);
  if (userDir) {
    return userDir;
  }

  // 4. Check package built-in directory
  const packageDir = getSchemaCandidateDir(getPackageSchemasDir(), name);
  if (packageDir) {
    return packageDir;
  }

  return null;
}

/**
 * Resolves a schema name to a SchemaYaml object.
 *
 * Resolution order (when projectRoot is provided):
 * 1. A declared remote owns its name and conflicts with a same-named project schema
 * 2. Otherwise, project-local: <projectRoot>/openspec/schemas/<name>/schema.yaml
 * 3. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 4. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * When projectRoot is not provided, only user override and package built-in are checked
 * (backward compatible behavior).
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @param projectRoot - Optional project root directory for project-local schema resolution
 * @returns The resolved schema object
 * @throws Error if schema is not found in any location
 */
export function resolveSchema(
  name: string,
  projectRoot?: string,
  projectConfig?: ProjectConfig | null
): SchemaYaml {
  // Normalize name (remove .yaml extension if provided)
  const normalizedName = name.replace(/\.ya?ml$/, '');

  const schemaDir = getSchemaDir(normalizedName, projectRoot, projectConfig);
  if (!schemaDir) {
    const availableSchemas = listSchemas(projectRoot, projectConfig);
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
    return parseSchema(content);
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
 * Lists all available schema names.
 * Combines project-local, user override, and package built-in schemas.
 *
 * @param projectRoot - Optional project root directory for project-local schema resolution
 */
export function listSchemas(
  projectRoot?: string,
  projectConfig?: ProjectConfig | null
): string[] {
  const schemas = new Set<string>();

  // Add package built-in schemas
  const packageDir = getPackageSchemasDir();
  if (fs.existsSync(packageDir)) {
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (isSchemaDir(packageDir, entry)) {
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
      if (isSchemaDir(userDir, entry)) {
        const schemaPath = path.join(userDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  // Add project-local schemas (if projectRoot provided)
  if (projectRoot) {
    const config =
      projectConfig === undefined ? readProjectConfig(projectRoot) : projectConfig;
    const remoteNames = Object.keys(
      config?.schemaSources ?? {}
    );
    for (const name of remoteNames) {
      schemas.add(name);
    }

    const projectDir = getProjectSchemasDir(projectRoot);
    if (fs.existsSync(projectDir)) {
      for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
        if (isSchemaDir(projectDir, entry)) {
          const schemaPath = path.join(projectDir, entry.name, 'schema.yaml');
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
  source: 'project' | 'remote' | 'user' | 'package';
  available?: boolean;
  error?: string;
  status?: Array<{
    level: 'error';
    code: string;
    message: string;
  }>;
}

/**
 * Lists all available schemas with their descriptions and artifact lists.
 * Useful for agent skills to present schema selection to users.
 *
 * @param projectRoot - Optional project root directory for project-local schema resolution
 */
export function listSchemasWithInfo(
  projectRoot?: string,
  projectConfig?: ProjectConfig | null
): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const seenNames = new Set<string>();
  const config = projectRoot
    ? projectConfig === undefined
      ? readProjectConfig(projectRoot)
      : projectConfig
    : null;
  const remoteNames = projectRoot
    ? Object.keys(config?.schemaSources ?? {}).sort()
    : [];
  const remoteNameSet = new Set(remoteNames);

  // Add unclaimed project-local schemas first (if projectRoot provided).
  if (projectRoot) {
    const projectDir = getProjectSchemasDir(projectRoot);
    if (fs.existsSync(projectDir)) {
      for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
        if (isSchemaDir(projectDir, entry)) {
          const schemaPath = path.join(projectDir, entry.name, 'schema.yaml');
          if (fs.existsSync(schemaPath) && !remoteNameSet.has(entry.name)) {
            try {
              const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
              schemas.push({
                name: entry.name,
                description: schema.description || '',
                artifacts: schema.artifacts.map((a) => a.id),
                source: 'project',
              });
              seenNames.add(entry.name);
            } catch {
              // Skip invalid schemas
            }
          }
        }
      }
    }

    for (const name of remoteNames) {
      if (seenNames.has(name)) continue;
      try {
        const remoteDir = getRemoteSchemaDir(name, projectRoot, config);
        if (!remoteDir) continue;
        const schema = parseSchema(
          fs.readFileSync(path.join(remoteDir, 'schema.yaml'), 'utf8')
        );
        schemas.push({
          name,
          description: schema.description || '',
          artifacts: schema.artifacts.map((artifact) => artifact.id),
          source: 'remote',
        });
        seenNames.add(name);
      } catch (error) {
        const code =
          error instanceof RemoteSchemaResolutionError
            ? error.code
            : 'remote_schema_unavailable';
        const message = error instanceof Error ? error.message : String(error);
        schemas.push({
          name,
          description: '',
          artifacts: [],
          source: 'remote',
          available: false,
          error: message,
          status: [{ level: 'error', code, message }],
        });
        seenNames.add(name);
      }
    }
  }

  // Add user override schemas (if not overridden by project)
  const userDir = getUserSchemasDir();
  if (fs.existsSync(userDir)) {
    for (const entry of fs.readdirSync(userDir, { withFileTypes: true })) {
      if (isSchemaDir(userDir, entry) && !seenNames.has(entry.name)) {
        const schemaPath = path.join(userDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          try {
            const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
            schemas.push({
              name: entry.name,
              description: schema.description || '',
              artifacts: schema.artifacts.map((a) => a.id),
              source: 'user',
            });
            seenNames.add(entry.name);
          } catch {
            // Skip invalid schemas
          }
        }
      }
    }
  }

  // Add package built-in schemas (if not overridden by project or user)
  const packageDir = getPackageSchemasDir();
  if (fs.existsSync(packageDir)) {
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (isSchemaDir(packageDir, entry) && !seenNames.has(entry.name)) {
        const schemaPath = path.join(packageDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          try {
            const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
            schemas.push({
              name: entry.name,
              description: schema.description || '',
              artifacts: schema.artifacts.map((a) => a.id),
              source: 'package',
            });
          } catch {
            // Skip invalid schemas
          }
        }
      }
    }
  }

  return schemas.sort((a, b) => a.name.localeCompare(b.name));
}
