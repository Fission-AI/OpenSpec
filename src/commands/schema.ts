import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import ora from 'ora';
import { stringify as stringifyYaml, parseDocument } from 'yaml';
import {
  getSchemaDir,
  getRemoteSchemaDir,
  getProjectSchemasDir,
  getUserSchemasDir,
  getPackageSchemasDir,
  isSchemaDir,
  listSchemas,
} from '../core/artifact-graph/resolver.js';
import { parseSchema } from '../core/artifact-graph/schema.js';
import {
  inspectLocalSchemaDirectory,
  SchemaDirectoryValidationError,
} from '../core/artifact-graph/schema-directory.js';
import type { SchemaYaml, Artifact } from '../core/artifact-graph/types.js';
import { syncRemoteSchemas } from '../core/remote-schema/sync.js';
import { getSchemaLockPath } from '../core/remote-schema/lockfile.js';
import { readSchemaLock } from '../core/remote-schema/lockfile.js';
import type { RemoteSchemaLockEntry } from '../core/remote-schema/types.js';
import {
  assertProjectSchemaNameUnclaimed,
  RemoteSchemaResolutionError,
} from '../core/remote-schema/authority.js';
import { resolveSchemaConsumerRoot } from '../core/remote-schema/consumer-root.js';
import { SchemaSyncLockError } from '../core/remote-schema/sync-lock.js';
import { FileSystemUtils } from '../utils/file-system.js';

/**
 * Schema source location type
 */
type SchemaSource = 'project' | 'remote' | 'user' | 'package';

const SCHEMA_SOURCE_PRECEDENCE: Record<SchemaSource, number> = {
  project: 0,
  remote: 1,
  user: 2,
  package: 3,
};

/**
 * Result of checking a schema location
 */
interface SchemaLocation {
  source: SchemaSource;
  path: string;
  exists: boolean;
  remote?: RemoteSchemaLockEntry;
}

/**
 * Schema resolution info with shadowing details
 */
interface SchemaResolution {
  name: string;
  available: boolean;
  source: SchemaSource;
  path: string | null;
  shadows: Array<
    { source: SchemaSource; path: string } & Partial<RemoteSchemaLockEntry>
  >;
  status: Array<{
    level: 'error';
    code: string;
    message: string;
  }>;
  git?: string;
  requestedRef?: string;
  resolvedCommit?: string;
  bundlePath?: string;
  integrity?: string;
}

/**
 * Validation issue structure
 */
interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

function schemaSyncFailureStatus(error: unknown): Array<{
  level: 'error';
  code: string;
  message: string;
  path?: string;
}> {
  if (error instanceof SchemaDirectoryValidationError) {
    return error.issues.map((issue) => ({
      level: 'error',
      code: 'remote_schema_invalid',
      path: issue.path,
      message: issue.message,
    }));
  }
  const code =
    error instanceof RemoteSchemaResolutionError
      ? error.code
      : error instanceof SchemaSyncLockError
        ? error.code
        : 'schema_sync_failed';
  return [{
    level: 'error',
    code,
    message: error instanceof Error ? error.message : String(error),
  }];
}

/**
 * Check all schema locations and return which ones exist.
 */
function checkAllLocations(
  name: string,
  projectRoot: string
): SchemaLocation[] {
  const locations: SchemaLocation[] = [];

  // Project location
  const projectDir = path.join(getProjectSchemasDir(projectRoot), name);
  const projectSchemaPath = path.join(projectDir, 'schema.yaml');
  locations.push({
    source: 'project',
    path: projectDir,
    exists: fs.existsSync(projectSchemaPath),
  });

  // Locked remote location. A declared remote owns its name; conflicts and
  // unavailable cache state are reported by getSchemaResolution().
  let remoteDir: string | null = null;
  let remoteEntry: RemoteSchemaLockEntry | undefined;
  try {
    remoteEntry = readSchemaLock(projectRoot)?.schemas[name];
  } catch {
    remoteEntry = undefined;
  }
  try {
    remoteDir = getRemoteSchemaDir(name, projectRoot);
  } catch {
    remoteDir = null;
  }
  locations.push({
    source: 'remote',
    path: remoteDir ?? path.join(getUserSchemasDir(), '..', 'schema-cache'),
    exists: remoteDir !== null,
    ...(remoteEntry ? { remote: remoteEntry } : {}),
  });

  // User location
  const userDir = path.join(getUserSchemasDir(), name);
  const userSchemaPath = path.join(userDir, 'schema.yaml');
  locations.push({
    source: 'user',
    path: userDir,
    exists: fs.existsSync(userSchemaPath),
  });

  // Package location
  const packageDir = path.join(getPackageSchemasDir(), name);
  const packageSchemaPath = path.join(packageDir, 'schema.yaml');
  locations.push({
    source: 'package',
    path: packageDir,
    exists: fs.existsSync(packageSchemaPath),
  });

  return locations;
}

/**
 * Get resolution info for a schema including shadow detection.
 */
function getSchemaResolution(
  name: string,
  projectRoot: string
): SchemaResolution | null {
  let resolvedDir: string | null;
  try {
    resolvedDir = getSchemaDir(name, projectRoot);
  } catch (error) {
    if (error instanceof RemoteSchemaResolutionError) {
      let remote: RemoteSchemaLockEntry | undefined;
      try {
        remote = readSchemaLock(projectRoot)?.schemas[name];
      } catch {
        remote = undefined;
      }
      return {
        name,
        available: false,
        source: 'remote',
        path: null,
        shadows: [],
        status: [
          {
            level: 'error',
            code: error.code,
            message: error.message,
          },
        ],
        ...(remote ?? {}),
      };
    }
    throw error;
  }
  if (!resolvedDir) {
    return null;
  }
  const locations = checkAllLocations(name, projectRoot);
  const existingLocations = locations.filter((loc) => loc.exists);
  const normalizedResolvedDir = path.resolve(resolvedDir);
  const active = existingLocations.find(
    (location) => path.resolve(location.path) === normalizedResolvedDir
  ) ?? {
    source: 'remote' as const,
    path: resolvedDir,
    exists: true,
    remote: locations.find((location) => location.source === 'remote')?.remote,
  };
  const activeRank = SCHEMA_SOURCE_PRECEDENCE[active.source];
  const shadows = existingLocations
    .filter(
      (location) =>
        SCHEMA_SOURCE_PRECEDENCE[location.source] > activeRank &&
        path.resolve(location.path) !== normalizedResolvedDir
    )
    .map((loc) => ({
      source: loc.source,
      path: loc.path,
      ...(loc.remote ?? {}),
    }));
  return {
    name,
    available: true,
    source: active.source,
    path: active.path,
    shadows,
    status: [],
    ...(active.remote ?? {}),
  };
}

/**
 * Get all schemas with resolution info.
 */
function getAllSchemasWithResolution(
  projectRoot: string
): SchemaResolution[] {
  const schemaNames = listSchemas(projectRoot);
  const results: SchemaResolution[] = [];

  for (const name of schemaNames) {
    const resolution = getSchemaResolution(name, projectRoot);
    if (resolution) {
      results.push(resolution);
    }
  }

  return results;
}

/**
 * Validate a schema and return issues.
 */
function validateSchema(
  schemaDir: string,
  verbose: boolean = false
): { valid: boolean; issues: ValidationIssue[] } {
  if (verbose) {
    console.log('  Checking schema.yaml exists...');
    console.log('  Parsing YAML...');
    console.log('  Validating schema structure...');
    console.log('  Checking template files...');
  }
  let inspection;
  try {
    inspection = inspectLocalSchemaDirectory(schemaDir);
  } catch (error) {
    return {
      valid: false,
      issues: [{
        level: 'error',
        path: 'schema.yaml',
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }
  const issues: ValidationIssue[] = inspection.issues.map((issue) => ({
    level: 'error',
    path: issue.path,
    message: issue.message,
  }));

  // Dependency graph validation is already done by parseSchema
  // (it throws on cycles and invalid references)
  if (verbose) {
    console.log('  Dependency graph validation passed (via parseSchema)');
  }
  return { valid: issues.length === 0, issues };
}

/**
 * Validate schema name format (kebab-case).
 */
function isValidSchemaName(name: string): boolean {
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
}

/**
 * Copy a directory recursively.
 */
function resolveSchemaCopyPath(allowedRoot: string, sourcePath: string): string {
  try {
    const canonicalRoot = fs.realpathSync(allowedRoot);
    const canonicalPath = fs.realpathSync(sourcePath);
    FileSystemUtils.assertPathWithin(canonicalRoot, canonicalPath);
    return canonicalPath;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot fork schema with linked or unsupported entry: ${sourcePath}: ${detail}`,
      { cause: error }
    );
  }
}

function copyDirRecursive(
  src: string,
  dest: string,
  allowedRoot = src,
  ancestors = new Set<string>()
): void {
  const canonicalSrc = resolveSchemaCopyPath(allowedRoot, src);
  if (ancestors.has(canonicalSrc)) {
    throw new Error(`Cannot fork schema with a linked directory cycle: ${src}`);
  }
  ancestors.add(canonicalSrc);
  fs.mkdirSync(dest, { recursive: true });

  try {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      const canonicalEntry = resolveSchemaCopyPath(allowedRoot, srcPath);
      const stats = fs.statSync(canonicalEntry);

      if (stats.isDirectory()) {
        copyDirRecursive(canonicalEntry, destPath, allowedRoot, ancestors);
      } else if (stats.isFile()) {
        // Dereference confined links so the fork is an independent schema.
        fs.copyFileSync(canonicalEntry, destPath);
      } else {
        throw new Error(`Cannot fork schema with linked or unsupported entry: ${srcPath}`);
      }
    }
  } finally {
    ancestors.delete(canonicalSrc);
  }
}

/**
 * Verifies a schema tree before replacing or creating the fork destination.
 */
function assertSchemaTreeCanBeCopied(
  src: string,
  allowedRoot = src,
  ancestors = new Set<string>()
): void {
  const canonicalSrc = resolveSchemaCopyPath(allowedRoot, src);
  if (ancestors.has(canonicalSrc)) {
    throw new Error(`Cannot fork schema with a linked directory cycle: ${src}`);
  }
  ancestors.add(canonicalSrc);

  try {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const entryPath = path.join(src, entry.name);
      const canonicalEntry = resolveSchemaCopyPath(allowedRoot, entryPath);
      const stats = fs.statSync(canonicalEntry);
      if (stats.isDirectory()) {
        assertSchemaTreeCanBeCopied(canonicalEntry, allowedRoot, ancestors);
      } else if (!stats.isFile()) {
        throw new Error(`Cannot fork schema with linked or unsupported entry: ${entryPath}`);
      }
    }
  } finally {
    ancestors.delete(canonicalSrc);
  }
}

/**
 * Produces a stable content fingerprint of a directory: a SHA-256 over every
 * file's relative path AND its bytes (plus directory paths), walked in sorted
 * order. Two directories with byte-identical trees produce the same digest, and
 * ANY change to a file's contents, size, or the set of paths changes it. Used to
 * detect a concurrent modification of a fork destination between the moment the
 * overwrite is authorized and the moment it is actually moved/deleted, so those
 * changes are never silently destroyed.
 */
function fingerprintDir(dir: string): string {
  const hash = createHash('sha256');
  const walk = (current: string, rel: string): void => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      // Use the entry type from readdir (no separate lstat), then read the file
      // directly — avoiding a stat-then-read check/use gap. Size is derived from
      // the bytes actually read, so the digest still covers content and length.
      if (entry.isDirectory()) {
        hash.update(`D:${relPath}\n`);
        walk(abs, relPath);
      } else if (entry.isFile()) {
        const contents = fs.readFileSync(abs);
        hash.update(`F:${relPath}:${contents.length}:`);
        hash.update(contents);
        hash.update('\n');
      } else {
        // Symlinks / other entry types: record the type + path (and the link
        // target when readable) so a swap of one for another is still detected.
        let target = '';
        try {
          target = fs.readlinkSync(abs);
        } catch {
          // Non-symlink or unreadable target; the type marker below suffices.
        }
        hash.update(`O:${relPath}:${target}\n`);
      }
    }
  };
  walk(dir, '');
  return hash.digest('hex');
}

/**
 * Default artifacts with descriptions for schema init.
 */
const DEFAULT_ARTIFACTS: Array<{
  id: string;
  description: string;
  generates: string;
  template: string;
}> = [
  {
    id: 'proposal',
    description: 'High-level description of the change, its motivation, and scope',
    generates: 'proposal.md',
    template: 'proposal.md',
  },
  {
    id: 'specs',
    description: 'Detailed specifications with requirements and scenarios',
    generates: 'specs/**/*.md',
    template: 'specs/spec.md',
  },
  {
    id: 'design',
    description: 'Technical design decisions and implementation approach',
    generates: 'design.md',
    template: 'design.md',
  },
  {
    id: 'tasks',
    description: 'Implementation checklist with trackable tasks',
    generates: 'tasks.md',
    template: 'tasks.md',
  },
];

/**
 * Register the schema command and all its subcommands.
 */
export function registerSchemaCommand(program: Command): void {
  const schemaCmd = program
    .command('schema')
    .description('Manage workflow schemas [experimental]');

  // Experimental warning
  schemaCmd.hook('preAction', () => {
    console.error('Note: Schema commands are experimental and may change.');
  });

  // schema sync
  schemaCmd
    .command('sync [name]')
    .description('Synchronize project-declared Git schema sources')
    .option('--locked', 'Restore exactly the commits and content in the lockfile')
    .option('--json', 'Output as JSON')
    .action(
      async (
        name?: string,
        options?: { locked?: boolean; json?: boolean }
      ) => {
        let projectRoot: string | null = null;
        try {
          projectRoot = resolveSchemaConsumerRoot(process.cwd());
          if (!projectRoot) {
            throw new Error(
              `No consumer OpenSpec project found from '${process.cwd()}' or its ancestors`
            );
          }
          const result = await syncRemoteSchemas(projectRoot, {
            name,
            locked: options?.locked,
          });
          if (options?.json) {
            console.log(JSON.stringify({ synced: true, ...result }, null, 2));
          } else {
            for (const schema of result.schemas) {
              const action = schema.restored
                ? 'Restored'
                : result.locked
                  ? 'Verified'
                  : 'Synced';
              console.log(
                `${action} '${schema.name}': ${schema.requestedRef} → ${schema.resolvedCommit}`
              );
              console.log(`  Cache: ${schema.cachePath} (${schema.integrity})`);
            }
            console.log(
              `${result.locked ? 'Verified' : 'Updated'} ${result.lockfile}`
            );
          }
        } catch (error) {
          const status = schemaSyncFailureStatus(error);
          if (options?.json) {
            console.log(
              JSON.stringify(
                {
                  synced: false,
                  mode: options?.locked ? 'locked' : 'update',
                  lockfile: projectRoot ? getSchemaLockPath(projectRoot) : null,
                  schemas: [],
                  status,
                  error: (error as Error).message,
                },
                null,
                2
              )
            );
          } else {
            for (const diagnostic of status) {
              const location = diagnostic.path ? `${diagnostic.path}: ` : '';
              console.error(`Error: ${location}${diagnostic.message}`);
            }
          }
          process.exitCode = 1;
        }
      }
    );

  // schema which
  schemaCmd
    .command('which [name]')
    .description('Show where a schema resolves from')
    .option('--json', 'Output as JSON')
    .option('--all', 'List all schemas with their resolution sources')
    .action(async (name?: string, options?: { json?: boolean; all?: boolean }) => {
      try {
        const projectRoot =
          resolveSchemaConsumerRoot(process.cwd()) ?? process.cwd();

        if (options?.all) {
          // List all schemas
          const schemas = getAllSchemasWithResolution(projectRoot);

          if (options?.json) {
            console.log(JSON.stringify(schemas, null, 2));
          } else {
            if (schemas.length === 0) {
              console.log('No schemas found.');
              return;
            }

            // Group by source
            const bySource = {
              project: schemas.filter((s) => s.available && s.source === 'project'),
              remote: schemas.filter((s) => s.available && s.source === 'remote'),
              user: schemas.filter((s) => s.available && s.source === 'user'),
              package: schemas.filter((s) => s.available && s.source === 'package'),
              unavailable: schemas.filter((s) => !s.available),
            };

            if (bySource.project.length > 0) {
              console.log('\nProject schemas:');
              for (const schema of bySource.project) {
                const shadowInfo = schema.shadows.length > 0
                  ? ` (shadows: ${schema.shadows.map((s) => s.source).join(', ')})`
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.remote.length > 0) {
              console.log('\nRemote schemas:');
              for (const schema of bySource.remote) {
                const shadowInfo = schema.shadows.length > 0
                  ? ` (shadows: ${schema.shadows.map((s) => s.source).join(', ')})`
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.user.length > 0) {
              console.log('\nUser schemas:');
              for (const schema of bySource.user) {
                const shadowInfo = schema.shadows.length > 0
                  ? ` (shadows: ${schema.shadows.map((s) => s.source).join(', ')})`
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.package.length > 0) {
              console.log('\nPackage schemas:');
              for (const schema of bySource.package) {
                console.log(`  ${schema.name}`);
              }
            }

            if (bySource.unavailable.length > 0) {
              console.log('\nUnavailable schemas:');
              for (const schema of bySource.unavailable) {
                console.log(`  ${schema.name}: ${schema.status[0]?.message ?? 'Unavailable'}`);
              }
            }
          }
          return;
        }

        if (!name) {
          const message = 'Schema name is required (or use --all to list all schemas)';
          if (options?.json) {
            console.log(
              JSON.stringify(
                {
                  name: null,
                  source: null,
                  path: null,
                  shadows: [],
                  status: [
                    {
                      level: 'error',
                      code: 'schema_name_required',
                      message,
                    },
                  ],
                },
                null,
                2
              )
            );
          } else {
            console.error(`Error: ${message}`);
          }
          process.exitCode = 1;
          return;
        }

        const resolution = getSchemaResolution(name, projectRoot);

        if (!resolution) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              error: `Schema '${name}' not found`,
              available,
            }, null, 2));
          } else {
            console.error(`Error: Schema '${name}' not found`);
            console.error(`Available schemas: ${available.join(', ')}`);
          }
          process.exitCode = 1;
          return;
        }

        if (!resolution.available) {
          if (options?.json) {
            console.log(JSON.stringify(resolution, null, 2));
          } else {
            console.error(`Error: ${resolution.status[0]?.message ?? `Schema '${name}' is unavailable`}`);
          }
          process.exitCode = 1;
          return;
        }

        if (options?.json) {
          console.log(JSON.stringify(resolution, null, 2));
        } else {
          console.log(`Schema: ${resolution.name}`);
          console.log(`Source: ${resolution.source}`);
          console.log(`Path: ${resolution.path}`);
          if (resolution.requestedRef && resolution.resolvedCommit) {
            console.log(
              `Locked: ${resolution.requestedRef} → ${resolution.resolvedCommit}`
            );
            console.log(`Integrity: ${resolution.integrity}`);
          }

          if (resolution.shadows.length > 0) {
            console.log('\nShadows:');
            for (const shadow of resolution.shadows) {
              console.log(`  ${shadow.source}: ${shadow.path}`);
            }
          }
        }
      } catch (error) {
        if (options?.json) {
          console.log(
            JSON.stringify(
              {
                name: name ?? null,
                source: null,
                path: null,
                shadows: [],
                status: [
                  {
                    level: 'error',
                    code: 'schema_resolution_failed',
                    message: (error as Error).message,
                  },
                ],
              },
              null,
              2
            )
          );
        } else {
          console.error(`Error: ${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });

  // schema validate
  schemaCmd
    .command('validate [name]')
    .description('Validate a schema structure and templates')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Show detailed validation steps')
    .action(async (name?: string, options?: { json?: boolean; verbose?: boolean }) => {
      try {
        const projectRoot =
          resolveSchemaConsumerRoot(process.cwd()) ?? process.cwd();

        if (!name) {
          // Validate all project schemas
          const projectSchemasDir = getProjectSchemasDir(projectRoot);

          if (!fs.existsSync(projectSchemasDir)) {
            if (options?.json) {
              console.log(JSON.stringify({
                valid: true,
                message: 'No project schemas directory found',
                schemas: [],
              }, null, 2));
            } else {
              console.log('No project schemas directory found.');
            }
            return;
          }

          const entries = fs.readdirSync(projectSchemasDir, { withFileTypes: true });
          const schemaResults: Array<{
            name: string;
            path: string;
            valid: boolean;
            issues: ValidationIssue[];
          }> = [];

          let anyInvalid = false;

          for (const entry of entries) {
            if (!isSchemaDir(projectSchemasDir, entry)) continue;

            const schemaDir = path.join(projectSchemasDir, entry.name);
            const schemaPath = path.join(schemaDir, 'schema.yaml');

            if (!fs.existsSync(schemaPath)) continue;

            if (options?.verbose && !options?.json) {
              console.log(`\nValidating ${entry.name}...`);
            }

            const result = validateSchema(schemaDir, options?.verbose && !options?.json);
            schemaResults.push({
              name: entry.name,
              path: schemaDir,
              valid: result.valid,
              issues: result.issues,
            });

            if (!result.valid) {
              anyInvalid = true;
            }
          }

          if (options?.json) {
            console.log(JSON.stringify({
              valid: !anyInvalid,
              schemas: schemaResults,
            }, null, 2));
          } else {
            if (schemaResults.length === 0) {
              console.log('No schemas found in project.');
              return;
            }

            console.log('\nValidation Results:');
            for (const result of schemaResults) {
              const status = result.valid ? '✓' : '✗';
              console.log(`  ${status} ${result.name}`);
              for (const issue of result.issues) {
                console.log(`    ${issue.level}: ${issue.message}`);
              }
            }
          }

          if (anyInvalid) {
            process.exitCode = 1;
          }
          return;
        }

        // Validate specific schema
        const schemaDir = getSchemaDir(name, projectRoot);

        if (!schemaDir) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              valid: false,
              error: `Schema '${name}' not found`,
              available,
            }, null, 2));
          } else {
            console.error(`Error: Schema '${name}' not found`);
            console.error(`Available schemas: ${available.join(', ')}`);
          }
          process.exitCode = 1;
          return;
        }

        if (options?.verbose && !options?.json) {
          console.log(`Validating ${name}...`);
        }

        const result = validateSchema(schemaDir, options?.verbose && !options?.json);

        if (options?.json) {
          console.log(JSON.stringify({
            name,
            path: schemaDir,
            valid: result.valid,
            issues: result.issues,
          }, null, 2));
        } else {
          if (result.valid) {
            console.log(`✓ Schema '${name}' is valid`);
          } else {
            console.log(`✗ Schema '${name}' has errors:`);
            for (const issue of result.issues) {
              console.log(`  ${issue.level}: ${issue.message}`);
            }
          }
        }
        if (!result.valid) {
          process.exitCode = 1;
        }
      } catch (error) {
        if (options?.json) {
          console.log(JSON.stringify({
            valid: false,
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(`Error: ${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });

  // schema fork
  schemaCmd
    .command('fork <source> [name]')
    .description('Copy an existing schema to project for customization')
    .option('--json', 'Output as JSON')
    .option('--force', 'Overwrite existing destination')
    .action(async (source: string, name?: string, options?: { json?: boolean; force?: boolean }) => {
      const spinner = options?.json ? null : ora();

      try {
        const projectRoot =
          resolveSchemaConsumerRoot(process.cwd()) ?? process.cwd();
        const destinationName = name || `${source}-custom`;

        // Validate destination name
        if (!isValidSchemaName(destinationName)) {
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: `Invalid schema name '${destinationName}'. Use kebab-case (e.g., my-workflow)`,
            }, null, 2));
          } else {
            console.error(`Error: Invalid schema name '${destinationName}'`);
            console.error('Schema names must be kebab-case (e.g., my-workflow)');
          }
          process.exitCode = 1;
          return;
        }

        assertProjectSchemaNameUnclaimed(projectRoot, destinationName);

        // Find source schema
        const sourceDir = getSchemaDir(source, projectRoot);
        if (!sourceDir) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: `Schema '${source}' not found`,
              available,
            }, null, 2));
          } else {
            console.error(`Error: Schema '${source}' not found`);
            console.error(`Available schemas: ${available.join(', ')}`);
          }
          process.exitCode = 1;
          return;
        }

        // Determine source location
        const sourceResolution = getSchemaResolution(source, projectRoot);
        const sourceLocation = sourceResolution?.source || 'package';

        // Validate the complete source before a forced fork removes anything.
        const trustedSourceDir = fs.realpathSync(sourceDir);
        assertSchemaTreeCanBeCopied(trustedSourceDir);

        // Validate the source's schema content up front too, so a structurally
        // invalid source is rejected before the --force path can remove an
        // existing destination. This keeps `fork --force` atomic — an unusable
        // source never destroys a valid destination — matching `schema init`,
        // which likewise validates before it overwrites.
        parseSchema(
          fs.readFileSync(path.join(trustedSourceDir, 'schema.yaml'), 'utf-8')
        );

        // Check destination
        const schemasDir = getProjectSchemasDir(projectRoot);
        const destinationDir = path.join(schemasDir, destinationName);

        // Reject a self-fork. Forking a schema onto itself with --force would
        // otherwise remove the source at the replacement step below and then
        // fail the copy, destroying the only copy of the schema. Resolve both
        // sides to their real paths (realpathSync follows symlinks; path.resolve
        // is a fallback only for a destination that does not exist yet) so a
        // symlink or a `.`/`..` spelling of the same directory is still caught.
        const resolvedDestination = fs.existsSync(destinationDir)
          ? fs.realpathSync(destinationDir)
          : path.resolve(destinationDir);
        if (resolvedDestination === trustedSourceDir) {
          throw new Error(
            `Cannot fork schema '${source}' onto itself; choose a different destination name`
          );
        }

        const destinationExists = fs.existsSync(destinationDir);
        if (destinationExists && !options?.force) {
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: `Schema '${destinationName}' already exists`,
              suggestion: 'Use --force to overwrite',
            }, null, 2));
          } else {
            console.error(`Error: Schema '${destinationName}' already exists at ${destinationDir}`);
            console.error('Use --force to overwrite');
          }
          process.exitCode = 1;
          return;
        }

        // Fingerprint the destination the user authorized us to overwrite, BEFORE
        // we spend time staging. Staging can take a while, and a concurrent
        // process may edit the destination in that window; the fingerprint lets
        // us detect such a change and abort rather than clobber it.
        const authorizedDestinationFingerprint = destinationExists
          ? fingerprintDir(destinationDir)
          : null;

        // Stage the complete fork in a temporary sibling directory first, then
        // swap it into place. This keeps `fork --force` atomic: an existing
        // destination is only removed once the new fork has been fully copied,
        // name-updated, and (via the up-front parseSchema above) validated. Any
        // failure while staging leaves both the source and the existing
        // destination exactly as they were.
        if (spinner) spinner.start(`Forking '${source}' to '${destinationName}'...`);
        fs.mkdirSync(schemasDir, { recursive: true });
        const stagingDir = fs.mkdtempSync(path.join(schemasDir, '.fork-staging-'));
        try {
          copyDirRecursive(trustedSourceDir, stagingDir);

          // Update name in the staged schema.yaml via yaml's Document API
          // instead of re-serializing the parsed object, so block scalars,
          // comments, and key order in the source schema.yaml survive the fork.
          const stagedSchemaPath = path.join(stagingDir, 'schema.yaml');
          const schemaContent = fs.readFileSync(stagedSchemaPath, 'utf-8');
          const doc = parseDocument(schemaContent);
          doc.set('name', destinationName);
          fs.writeFileSync(stagedSchemaPath, doc.toString());

          // Authoritative gate: validate the COMPLETED staged schema — the exact
          // bytes we are about to install — not just the source at the pre-check.
          // The source files copyDirRecursive reads can change mid-copy, so a
          // source that was valid up front can still produce an invalid staged
          // fork. Validating here, before ANY destructive step, guarantees we
          // never install an invalid fork or delete a valid destination for one.
          try {
            parseSchema(fs.readFileSync(stagedSchemaPath, 'utf-8'));
          } catch (validationError) {
            throw new Error(
              `The staged fork of '${source}' is not a valid schema (the source may have changed during copy); ` +
                `aborted, '${destinationName}' was not modified.`,
              { cause: validationError }
            );
          }

          // Swap the staged fork into place. When a destination already exists,
          // move it aside to a sibling backup FIRST, then install the staged
          // fork; only once the install succeeds is the backup discarded. If the
          // install rename itself fails (e.g. a Windows lock), the backup is
          // moved back so the user's original destination is never lost.
          if (destinationExists) {
            if (spinner) spinner.text = `Replacing existing schema '${destinationName}'...`;

            // Revalidate immediately before the destructive move: if the
            // destination changed on disk while we were staging (or was removed),
            // its fingerprint no longer matches what the user authorized. Abort
            // WITHOUT touching it, so the concurrent changes are preserved. The
            // outer catch cleans up staging.
            const currentFingerprint = fs.existsSync(destinationDir)
              ? fingerprintDir(destinationDir)
              : null;
            if (currentFingerprint !== authorizedDestinationFingerprint) {
              throw new Error(
                `Schema '${destinationName}' at ${destinationDir} changed on disk while the fork was being prepared. ` +
                  `Aborted to preserve those concurrent changes; nothing was overwritten. Re-run the fork to overwrite the current contents.`
              );
            }

            const backupDir = `${destinationDir}.fork-backup-${process.pid}-${Date.now()}`;
            fs.renameSync(destinationDir, backupDir);
            try {
              fs.renameSync(stagingDir, destinationDir);
            } catch (installError) {
              // Install failed after the original was moved aside. Try to move
              // it back. If that restore ALSO fails, the original is stranded in
              // the backup dir — surface an error naming both the backup and the
              // destination so the user can recover manually, and attach the
              // original install error as the cause. Never swallow this.
              try {
                fs.renameSync(backupDir, destinationDir);
              } catch (restoreError) {
                throw new Error(
                  `Failed to install the forked schema and could not restore the previous '${destinationName}'. ` +
                    `Your previous schema is preserved at ${backupDir}; move it back to ${destinationDir} to restore. ` +
                    `Restore error: ${(restoreError as Error).message}`,
                  { cause: installError }
                );
              }
              throw installError;
            }

            // Revalidate before discarding the backup: only delete it if it is
            // still byte-for-byte the original destination we moved aside. If it
            // changed during the install window (a concurrent write to the
            // moved-aside directory), do NOT delete it — leave it in place and
            // surface where it is so nothing is lost.
            if (fingerprintDir(backupDir) === authorizedDestinationFingerprint) {
              fs.rmSync(backupDir, { recursive: true, force: true });
            } else {
              console.error(
                `Warning: the previous '${destinationName}' changed during the fork and was NOT deleted; ` +
                  `its pre-fork copy is preserved at ${backupDir}.`
              );
            }
          } else {
            fs.renameSync(stagingDir, destinationDir);
          }
        } catch (error) {
          // Remove only the staging directory we created this run; the source
          // and any existing destination are left exactly as we found them.
          // Guard the cleanup in its own try/catch so a failed removal (e.g. a
          // locked file on Windows) can never mask the original error, then
          // rethrow so the real failure still drives the JSON/exit-code report.
          try {
            fs.rmSync(stagingDir, { recursive: true, force: true });
          } catch {
            // Best-effort cleanup; the original error below is what matters.
          }
          throw error;
        }

        if (spinner) spinner.succeed(`Forked '${source}' to '${destinationName}'`);

        if (options?.json) {
          console.log(JSON.stringify({
            forked: true,
            source,
            sourcePath: sourceDir,
            sourceLocation,
            destination: destinationName,
            destinationPath: destinationDir,
          }, null, 2));
        } else {
          console.log(`\nSource: ${sourceDir} (${sourceLocation})`);
          console.log(`Destination: ${destinationDir}`);
          console.log(`\nYou can now customize the schema at:`);
          console.log(`  ${destinationDir}/schema.yaml`);
        }
      } catch (error) {
        if (spinner) spinner.fail(`Fork failed`);
        if (options?.json) {
          console.log(JSON.stringify({
            forked: false,
            ...(error instanceof RemoteSchemaResolutionError
              ? { code: error.code }
              : {}),
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(`Error: ${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });

  // schema init
  schemaCmd
    .command('init <name>')
    .description('Create a new project-local schema')
    .option('--json', 'Output as JSON')
    .option('--description <text>', 'Schema description')
    .option('--artifacts <list>', 'Comma-separated artifact IDs (proposal,specs,design,tasks)')
    .option('--default', 'Set as project default schema')
    .option('--no-default', 'Do not prompt to set as default')
    .option('--force', 'Overwrite existing schema')
    .action(async (
      name: string,
      options?: {
        json?: boolean;
        description?: string;
        artifacts?: string;
        default?: boolean;
        force?: boolean;
      }
    ) => {
      const spinner = options?.json ? null : ora();

      try {
        const projectRoot =
          resolveSchemaConsumerRoot(process.cwd()) ?? process.cwd();

        // Validate name
        if (!isValidSchemaName(name)) {
          if (options?.json) {
            console.log(JSON.stringify({
              created: false,
              error: `Invalid schema name '${name}'. Use kebab-case (e.g., my-workflow)`,
            }, null, 2));
          } else {
            console.error(`Error: Invalid schema name '${name}'`);
            console.error('Schema names must be kebab-case (e.g., my-workflow)');
          }
          process.exitCode = 1;
          return;
        }

        assertProjectSchemaNameUnclaimed(projectRoot, name);

        const schemaDir = path.join(getProjectSchemasDir(projectRoot), name);

        // Check overwrite permission without mutating the destination
        const schemaExists = fs.existsSync(schemaDir);
        if (schemaExists) {
          if (!options?.force) {
            if (options?.json) {
              console.log(JSON.stringify({
                created: false,
                error: `Schema '${name}' already exists`,
                suggestion: 'Use --force to overwrite or "openspec schema fork" to copy',
              }, null, 2));
            } else {
              console.error(`Error: Schema '${name}' already exists at ${schemaDir}`);
              console.error('Use --force to overwrite or "openspec schema fork" to copy');
            }
            process.exitCode = 1;
            return;
          }
        }

        // Determine artifacts and description
        let description: string;
        let selectedArtifactIds: string[];

        // Check if we have explicit flags (non-interactive mode)
        const hasExplicitOptions = options?.description !== undefined || options?.artifacts !== undefined;
        const isInteractive = !options?.json && !hasExplicitOptions && process.stdout.isTTY;

        if (isInteractive) {
          // Interactive mode
          const { input, checkbox, confirm } = await import('@inquirer/prompts');

          description = await input({
            message: 'Schema description:',
            default: `Custom workflow schema for ${name}`,
          });

          const artifactChoices = DEFAULT_ARTIFACTS.map((a) => ({
            name: a.id,
            value: a.id,
            checked: true,
          }));

          selectedArtifactIds = await checkbox({
            message: 'Select artifacts to include:',
            theme: {
              icon: {
                checked: '[x]',
                unchecked: '[ ]',
              },
            },
            choices: artifactChoices,
          });

          if (selectedArtifactIds.length === 0) {
            console.error('Error: At least one artifact must be selected');
            process.exitCode = 1;
            return;
          }

          // Ask about setting as default (unless --no-default was passed)
          if (options?.default === undefined) {
            const setAsDefault = await confirm({
              message: 'Set as project default schema?',
              default: false,
            });

            if (setAsDefault) {
              options = { ...options, default: true };
            }
          }
        } else {
          // Non-interactive mode
          description = options?.description || `Custom workflow schema for ${name}`;

          if (options?.artifacts) {
            selectedArtifactIds = options.artifacts.split(',').map((a) => a.trim());

            // Validate artifact IDs
            const validIds = DEFAULT_ARTIFACTS.map((a) => a.id);
            for (const id of selectedArtifactIds) {
              if (!validIds.includes(id)) {
                if (options?.json) {
                  console.log(JSON.stringify({
                    created: false,
                    error: `Unknown artifact '${id}'`,
                    valid: validIds,
                  }, null, 2));
                } else {
                  console.error(`Error: Unknown artifact '${id}'`);
                  console.error(`Valid artifacts: ${validIds.join(', ')}`);
                }
                process.exitCode = 1;
                return;
              }
            }
          } else {
            // Default to all artifacts
            selectedArtifactIds = DEFAULT_ARTIFACTS.map((a) => a.id);
          }
        }

        // Build artifacts array with proper dependencies
        const selectedArtifacts = selectedArtifactIds.map((id) => {
          const template = DEFAULT_ARTIFACTS.find((a) => a.id === id)!;
          const artifact: Artifact = {
            id: template.id,
            generates: template.generates,
            description: template.description,
            template: template.template,
            requires: [],
          };

          // Set up dependencies based on typical workflow
          if (id === 'specs' && selectedArtifactIds.includes('proposal')) {
            artifact.requires = ['proposal'];
          } else if (id === 'design' && selectedArtifactIds.includes('specs')) {
            artifact.requires = ['specs'];
          } else if (id === 'tasks') {
            const requires: string[] = [];
            if (selectedArtifactIds.includes('design')) requires.push('design');
            else if (selectedArtifactIds.includes('specs')) requires.push('specs');
            artifact.requires = requires;
          }

          return artifact;
        });

        // Create schema.yaml
        const schema: SchemaYaml = {
          name,
          version: 1,
          description,
          artifacts: selectedArtifacts,
        };

        // Add apply phase if tasks is included
        if (selectedArtifactIds.includes('tasks')) {
          schema.apply = {
            requires: ['tasks'],
            tracks: 'tasks.md',
          };
        }

        // Replace only after all inputs have been collected and validated
        if (schemaExists) {
          if (spinner) spinner.start(`Removing existing schema '${name}'...`);
          fs.rmSync(schemaDir, { recursive: true });
        }

        // Create schema directory
        if (spinner) spinner.start(`Creating schema '${name}'...`);
        fs.mkdirSync(schemaDir, { recursive: true });

        fs.writeFileSync(
          path.join(schemaDir, 'schema.yaml'),
          stringifyYaml(schema)
        );

        // Create template files in templates/ subdirectory (standard location)
        const templatesDir = path.join(schemaDir, 'templates');
        for (const artifact of selectedArtifacts) {
          const templatePath = path.join(templatesDir, artifact.template);
          const templateDir = path.dirname(templatePath);

          if (!fs.existsSync(templateDir)) {
            fs.mkdirSync(templateDir, { recursive: true });
          }

          // Create default template content
          const templateContent = createDefaultTemplate(artifact.id);
          fs.writeFileSync(templatePath, templateContent);
        }

        // Update config if --default
        if (options?.default) {
          const configPath = path.join(projectRoot, 'openspec', 'config.yaml');

          if (fs.existsSync(configPath)) {
            const { parse: parseYaml, stringify: stringifyYaml2 } = await import('yaml');
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = parseYaml(configContent) || {};
            config.defaultSchema = name;
            fs.writeFileSync(configPath, stringifyYaml2(config));
          } else {
            // Create config file
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(configPath, stringifyYaml({ defaultSchema: name }));
          }
        }

        if (spinner) spinner.succeed(`Created schema '${name}'`);

        if (options?.json) {
          console.log(JSON.stringify({
            created: true,
            path: schemaDir,
            schema: name,
            artifacts: selectedArtifactIds,
            setAsDefault: options?.default || false,
          }, null, 2));
        } else {
          console.log(`\nSchema created at: ${schemaDir}`);
          console.log(`\nArtifacts: ${selectedArtifactIds.join(', ')}`);
          if (options?.default) {
            console.log(`\nSet as project default schema.`);
          }
          console.log(`\nNext steps:`);
          console.log(`  1. Edit ${schemaDir}/schema.yaml to customize artifacts`);
          console.log(`  2. Modify templates in the schema directory`);
          console.log(`  3. Use with: openspec new --schema ${name}`);
        }
      } catch (error) {
        if (spinner) spinner.fail(`Creation failed`);
        if (options?.json) {
          console.log(JSON.stringify({
            created: false,
            ...(error instanceof RemoteSchemaResolutionError
              ? { code: error.code }
              : {}),
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(`Error: ${(error as Error).message}`);
        }
        process.exitCode = 1;
      }
    });
}

/**
 * Create default template content for an artifact.
 */
function createDefaultTemplate(artifactId: string): string {
  switch (artifactId) {
    case 'proposal':
      return `## Why

<!-- Describe the motivation for this change -->

## What Changes

<!-- Describe what will change -->

## Capabilities

### New Capabilities
<!-- List new capabilities -->

### Modified Capabilities
<!-- List modified capabilities -->

## Impact

<!-- Describe the impact on existing functionality -->
`;

    case 'specs':
      return `## ADDED Requirements

### Requirement: Example requirement

Description of the requirement.

#### Scenario: Example scenario
- **WHEN** some condition
- **THEN** some outcome
`;

    case 'design':
      return `## Context

<!-- Background and context -->

## Goals / Non-Goals

**Goals:**
<!-- List goals -->

**Non-Goals:**
<!-- List non-goals -->

## Decisions

### 1. Decision Name

Description and rationale.

**Alternatives considered:**
- Alternative 1: Rejected because...

## Risks / Trade-offs

<!-- List risks and trade-offs -->
`;

    case 'tasks':
      return `## Implementation Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`;

    default:
      return `## ${artifactId}

<!-- Add content here -->
`;
  }
}
