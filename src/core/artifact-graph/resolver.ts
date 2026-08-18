import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalDataDir } from '../global-config.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  applySchemaOverride,
  parseSchema,
  parseSchemaOverride,
  SchemaOverrideValidationError,
  SchemaValidationError,
} from './schema.js';
import type { SchemaYaml } from './types.js';

export const SCHEMA_FILE_NAME = 'schema.yaml';
export const SCHEMA_OVERRIDE_FILE_NAME = 'schema.override.yaml';

export type SchemaSource = 'project' | 'user' | 'package';
export type SchemaResolutionMode =
  | 'project'
  | 'user-replacement'
  | 'package'
  | 'package-with-user-overlay';

export interface SchemaSourceLocation {
  source: SchemaSource;
  dir: string;
  schemaPath: string;
}

export interface SchemaOverlayLocation {
  source: 'user';
  path: string;
  templatesDir: string;
}

export interface SchemaTemplateRoot {
  source: SchemaSource;
  dir: string;
}

export interface ResolvedSchemaSources {
  name: string;
  mode: SchemaResolutionMode;
  base: SchemaSourceLocation;
  overlay?: SchemaOverlayLocation;
  templateRoots: SchemaTemplateRoot[];
}

export interface ResolvedTemplate {
  path: string;
  source: SchemaSource;
}

/** Error thrown when loading a schema or schema overlay fails. */
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

/** Gets the package's built-in schemas directory path. */
export function getPackageSchemasDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas');
}

/** Gets the user's schema data directory path. */
export function getUserSchemasDir(): string {
  return path.join(getGlobalDataDir(), 'schemas');
}

/** Gets the project-local schemas directory path. */
export function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'schemas');
}

/** Directories temporarily owned by the schema fork/override commands. */
function isOwnedSchemaTempDir(name: string): boolean {
  return (
    name.startsWith('.fork-staging-') ||
    name.includes('.fork-backup-') ||
    name.startsWith('.override-staging-') ||
    name.includes('.override-backup-')
  );
}

/** Reports whether a directory entry is a usable schema directory rather than command-owned state. */
export function isSchemaDir(parentDir: string, entry: fs.Dirent): boolean {
  if (isOwnedSchemaTempDir(entry.name)) return false;
  if (entry.isDirectory()) return true;
  if (entry.isSymbolicLink()) {
    try {
      return fs.statSync(path.join(parentDir, entry.name)).isDirectory();
    } catch {
      return false;
    }
  }
  return false;
}

/** Removes an optional YAML extension accepted by schema lookup APIs. */
function normalizeSchemaName(name: string): string {
  return name.replace(/\.ya?ml$/u, '');
}

/** Rejects empty and path-like values before joining a schema name to trusted roots. */
function isValidLookupName(name: string): boolean {
  return !(
    name.length === 0 ||
    name === '.' ||
    name === '..' ||
    /[\\/]/u.test(name) ||
    /^[A-Za-z]:/u.test(name) ||
    path.posix.isAbsolute(name) ||
    path.win32.isAbsolute(name)
  );
}

/**
 * Returns a schema-owned file only when it remains inside the canonical schema
 * directory. The schema directory itself may be a symlink.
 */
function getSchemaCandidateFile(
  schemasDir: string,
  name: string,
  fileName: string
): string | null {
  const schemaDir = path.join(schemasDir, name);
  const filePath = path.join(schemaDir, fileName);
  if (!fs.existsSync(filePath)) return null;

  try {
    FileSystemUtils.assertPathWithin(schemaDir, filePath);
    return filePath;
  } catch {
    return null;
  }
}

/** Describes a located schema file and its containing source directory. */
function locationFor(
  source: SchemaSource,
  schemaPath: string
): SchemaSourceLocation {
  return { source, dir: path.dirname(schemaPath), schemaPath };
}

/**
 * Resolves every source participating in an effective schema.
 *
 * Precedence:
 * 1. complete project schema
 * 2. complete user schema
 * 3. package schema plus optional user overlay
 */
export function resolveSchemaSources(
  name: string,
  projectRoot?: string
): ResolvedSchemaSources | null {
  const normalizedName = normalizeSchemaName(name);
  if (!isValidLookupName(normalizedName)) return null;

  if (projectRoot) {
    const projectSchemaPath = getSchemaCandidateFile(
      getProjectSchemasDir(projectRoot),
      normalizedName,
      SCHEMA_FILE_NAME
    );
    if (projectSchemaPath) {
      const base = locationFor('project', projectSchemaPath);
      return {
        name: normalizedName,
        mode: 'project',
        base,
        templateRoots: [{ source: 'project', dir: path.join(base.dir, 'templates') }],
      };
    }
  }

  const userSchemasDir = getUserSchemasDir();
  const userSchemaPath = getSchemaCandidateFile(
    userSchemasDir,
    normalizedName,
    SCHEMA_FILE_NAME
  );
  const userOverlayPath = getSchemaCandidateFile(
    userSchemasDir,
    normalizedName,
    SCHEMA_OVERRIDE_FILE_NAME
  );

  if (userSchemaPath && userOverlayPath) {
    throw new SchemaLoadError(
      `Schema '${normalizedName}' has both a complete user replacement (${userSchemaPath}) and a layered override (${userOverlayPath}). Remove one and choose either complete replacement or layered customization.`,
      userOverlayPath
    );
  }

  if (userSchemaPath) {
    const base = locationFor('user', userSchemaPath);
    return {
      name: normalizedName,
      mode: 'user-replacement',
      base,
      templateRoots: [{ source: 'user', dir: path.join(base.dir, 'templates') }],
    };
  }

  const packageSchemaPath = getSchemaCandidateFile(
    getPackageSchemasDir(),
    normalizedName,
    SCHEMA_FILE_NAME
  );

  if (!packageSchemaPath) {
    if (userOverlayPath) {
      throw new SchemaLoadError(
        `Schema override '${userOverlayPath}' has no packaged schema '${normalizedName}' to extend. Layered overrides can only customize packaged schemas.`,
        userOverlayPath
      );
    }
    return null;
  }

  const base = locationFor('package', packageSchemaPath);
  if (!userOverlayPath) {
    return {
      name: normalizedName,
      mode: 'package',
      base,
      templateRoots: [{ source: 'package', dir: path.join(base.dir, 'templates') }],
    };
  }

  const overlayDir = path.dirname(userOverlayPath);
  const overlayTemplatesDir = path.join(overlayDir, 'templates');
  return {
    name: normalizedName,
    mode: 'package-with-user-overlay',
    base,
    overlay: {
      source: 'user',
      path: userOverlayPath,
      templatesDir: overlayTemplatesDir,
    },
    templateRoots: [
      { source: 'user', dir: overlayTemplatesDir },
      { source: 'package', dir: path.join(base.dir, 'templates') },
    ],
  };
}

/** Compatibility helper returning the complete base schema directory. */
export function getSchemaDir(name: string, projectRoot?: string): string | null {
  return resolveSchemaSources(name, projectRoot)?.base.dir ?? null;
}

/** Reads and validates one complete schema while preserving file-specific error context. */
function readSchemaFile(schemaPath: string): SchemaYaml {
  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (error) {
    const ioError = error instanceof Error ? error : new Error(String(error));
    throw new SchemaLoadError(
      `Failed to read schema at '${schemaPath}': ${ioError.message}`,
      schemaPath,
      ioError
    );
  }

  try {
    return parseSchema(content);
  } catch (error) {
    const parseError = error instanceof Error ? error : new Error(String(error));
    const prefix = error instanceof SchemaValidationError ? 'Invalid schema' : 'Failed to parse schema';
    throw new SchemaLoadError(
      `${prefix} at '${schemaPath}': ${parseError.message}`,
      schemaPath,
      parseError
    );
  }
}

/** Resolves and loads the effective schema, including a user overlay when active. */
export function resolveSchema(name: string, projectRoot?: string): SchemaYaml {
  const normalizedName = normalizeSchemaName(name);
  const sources = resolveSchemaSources(normalizedName, projectRoot);
  if (!sources) {
    const availableSchemas = listSchemas(projectRoot);
    throw new Error(
      `Schema '${normalizedName}' not found. Available schemas: ${availableSchemas.join(', ')}`
    );
  }

  const base = readSchemaFile(sources.base.schemaPath);
  if (!sources.overlay) return base;

  let overrideContent: string;
  try {
    overrideContent = fs.readFileSync(sources.overlay.path, 'utf-8');
  } catch (error) {
    const ioError = error instanceof Error ? error : new Error(String(error));
    throw new SchemaLoadError(
      `Failed to read schema override at '${sources.overlay.path}': ${ioError.message}`,
      sources.overlay.path,
      ioError
    );
  }

  try {
    return applySchemaOverride(base, parseSchemaOverride(overrideContent));
  } catch (error) {
    const overrideError = error instanceof Error ? error : new Error(String(error));
    const prefix = error instanceof SchemaOverrideValidationError
      ? 'Invalid schema override'
      : 'Failed to apply schema override';
    throw new SchemaLoadError(
      `${prefix} at '${sources.overlay.path}': ${overrideError.message}`,
      sources.overlay.path,
      overrideError
    );
  }
}

/** Adds complete schema directory names from one precedence root to a shared set. */
function addSchemaDirectoryNames(schemas: Set<string>, schemasDir: string): void {
  if (!fs.existsSync(schemasDir)) return;
  for (const entry of fs.readdirSync(schemasDir, { withFileTypes: true })) {
    if (!isSchemaDir(schemasDir, entry)) continue;
    const schemaPath = path.join(schemasDir, entry.name, SCHEMA_FILE_NAME);
    if (fs.existsSync(schemaPath)) schemas.add(entry.name);
  }
}

/** Lists complete schema names. Overlay-only names are supplied by package discovery. */
export function listSchemas(projectRoot?: string): string[] {
  const schemas = new Set<string>();
  addSchemaDirectoryNames(schemas, getPackageSchemasDir());
  addSchemaDirectoryNames(schemas, getUserSchemasDir());
  if (projectRoot) addSchemaDirectoryNames(schemas, getProjectSchemasDir(projectRoot));
  return Array.from(schemas).sort();
}

export interface SchemaInfo {
  name: string;
  description: string;
  artifacts: string[];
  source: SchemaSource;
  overlay?: { source: 'user'; path: string };
}

/** Lists available schemas using their effective composed metadata. */
export function listSchemasWithInfo(projectRoot?: string): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  for (const name of listSchemas(projectRoot)) {
    try {
      const sources = resolveSchemaSources(name, projectRoot);
      if (!sources) continue;
      const schema = resolveSchema(name, projectRoot);
      schemas.push({
        name,
        description: schema.description ?? '',
        artifacts: schema.artifacts.map((artifact) => artifact.id),
        source: sources.base.source,
        ...(sources.overlay
          ? { overlay: { source: 'user' as const, path: sources.overlay.path } }
          : {}),
      });
    } catch {
      // Preserve existing discovery behavior: invalid schemas are omitted.
      // Explicit resolution and validation surface the detailed error.
    }
  }
  return schemas.sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolves one concrete template from the effective schema's trusted roots. */
export function resolveSchemaTemplate(
  schemaName: string,
  templatePath: string,
  projectRoot?: string
): ResolvedTemplate {
  const sources = resolveSchemaSources(schemaName, projectRoot);
  if (!sources) {
    throw new Error(`Schema '${normalizeSchemaName(schemaName)}' not found`);
  }

  const checked: string[] = [];
  for (const root of sources.templateRoots) {
    const candidate = path.join(root.dir, templatePath);
    checked.push(candidate);
    FileSystemUtils.assertPathWithin(root.dir, candidate);
    if (!fs.existsSync(candidate)) continue;
    if (!fs.statSync(candidate).isFile()) continue;
    return {
      path: FileSystemUtils.canonicalizeExistingPath(candidate),
      source: root.source,
    };
  }

  throw new Error(`Template not found. Checked: ${checked.join(', ')}`);
}
