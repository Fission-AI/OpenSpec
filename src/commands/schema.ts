import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import ora from 'ora';
import { stringify as stringifyYaml, parseDocument } from 'yaml';
import {
  getSchemaDir,
  getProjectSchemasDir,
  getUserSchemasDir,
  getPackageSchemasDir,
  isSchemaDir,
  listSchemas,
  type SchemaResolutionContext,
} from '../core/artifact-graph/resolver.js';
import { parseSchema, SchemaValidationError } from '../core/artifact-graph/schema.js';
import type { SchemaYaml, Artifact } from '../core/artifact-graph/types.js';
import { resolveRootForCommand } from '../core/root-selection.js';
import { FileSystemUtils } from '../utils/file-system.js';

/**
 * Schema source location type
 */
type SchemaSource = 'project' | 'store' | 'user' | 'package';

/**
 * Result of checking a schema location
 */
interface SchemaLocation {
  source: SchemaSource;
  path: string;
  exists: boolean;
  storeId?: string;
}

/**
 * Schema resolution info with shadowing details
 */
interface SchemaResolution {
  name: string;
  source: SchemaSource;
  path: string;
  storeId?: string;
  shadows: Array<{ source: SchemaSource; path: string; storeId?: string }>;
}

function schemaStoreWriteError(
  schemaContext: SchemaResolutionContext,
  command: 'fork' | 'init'
): { message: string; storeId?: string } | null {
  if (schemaContext.source !== 'store') {
    return null;
  }

  const storeLabel = schemaContext.storeId
    ? ` '${schemaContext.storeId}'`
    : '';
  return {
    message:
      `Cannot create project-local schemas while schemaStore${storeLabel} is configured. ` +
      `Edit the registered Schema Store directly, or remove schemaStore from openspec/config.yaml ` +
      `before using "openspec schema ${command}".`,
    ...(schemaContext.storeId ? { storeId: schemaContext.storeId } : {}),
  };
}

/**
 * Validation issue structure
 */
interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

/**
 * Check all three locations for a schema and return which ones exist.
 */
function checkAllLocations(
  name: string,
  schemaContext: SchemaResolutionContext
): SchemaLocation[] {
  const locations: SchemaLocation[] = [];

  // Active project layer: local project or configured schema Store.
  const projectDir = path.join(getProjectSchemasDir(schemaContext.root), name);
  const projectSchemaPath = path.join(projectDir, 'schema.yaml');
  const visible =
    schemaContext.source === 'project' ||
    schemaContext.visibleSchemas === '*' ||
    schemaContext.visibleSchemas.includes(name);
  if (visible) {
    locations.push({
      source: schemaContext.source,
      path: projectDir,
      exists: fs.existsSync(projectSchemaPath),
      ...(schemaContext.source === 'store' && schemaContext.storeId
        ? { storeId: schemaContext.storeId }
        : {}),
    });
  }

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
  schemaContext: SchemaResolutionContext
): SchemaResolution | null {
  const locations = checkAllLocations(name, schemaContext);
  const existingLocations = locations.filter((loc) => loc.exists);

  if (existingLocations.length === 0) {
    return null;
  }

  const active = existingLocations[0];
  const shadows = existingLocations.slice(1).map((loc) => ({
    source: loc.source,
    path: loc.path,
    ...(loc.storeId ? { storeId: loc.storeId } : {}),
  }));

  return {
    name,
    source: active.source,
    path: active.path,
    ...(active.storeId ? { storeId: active.storeId } : {}),
    shadows,
  };
}

/**
 * Get all schemas with resolution info.
 */
function getAllSchemasWithResolution(
  schemaContext: SchemaResolutionContext
): SchemaResolution[] {
  const schemaNames = listSchemas(schemaContext);
  const results: SchemaResolution[] = [];

  for (const name of schemaNames) {
    const resolution = getSchemaResolution(name, schemaContext);
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
  const issues: ValidationIssue[] = [];
  const schemaPath = path.join(schemaDir, 'schema.yaml');

  // Check schema.yaml exists
  if (verbose) {
    console.log('  Checking schema.yaml exists...');
  }
  if (!fs.existsSync(schemaPath)) {
    issues.push({
      level: 'error',
      path: 'schema.yaml',
      message: 'schema.yaml not found',
    });
    return { valid: false, issues };
  }

  // Parse YAML
  if (verbose) {
    console.log('  Parsing YAML...');
  }
  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    issues.push({
      level: 'error',
      path: 'schema.yaml',
      message: `Failed to read file: ${(err as Error).message}`,
    });
    return { valid: false, issues };
  }

  // Validate against Zod schema
  if (verbose) {
    console.log('  Validating schema structure...');
  }
  let schema: SchemaYaml;
  try {
    schema = parseSchema(content);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      issues.push({
        level: 'error',
        path: 'schema.yaml',
        message: err.message,
      });
    } else {
      issues.push({
        level: 'error',
        path: 'schema.yaml',
        message: `Parse error: ${(err as Error).message}`,
      });
    }
    return { valid: false, issues };
  }

  // Check template files exist in the same directory used at runtime.
  if (verbose) {
    console.log('  Checking template files...');
  }
  for (const artifact of schema.artifacts) {
    const templatesDir = path.join(schemaDir, 'templates');
    const existingTemplatePath = path.join(templatesDir, artifact.template);

    if (!fs.existsSync(existingTemplatePath)) {
      issues.push({
        level: 'error',
        path: `artifacts.${artifact.id}.template`,
        message: `Template file '${artifact.template}' not found for artifact '${artifact.id}'`,
      });
      continue;
    }

    try {
      FileSystemUtils.assertPathWithin(templatesDir, existingTemplatePath);
    } catch {
      issues.push({
        level: 'error',
        path: `artifacts.${artifact.id}.template`,
        message: `Template file '${artifact.template}' points outside the schema templates directory`,
      });
    }
  }

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

  // schema which
  schemaCmd
    .command('which [name]')
    .description('Show where a schema resolves from')
    .option('--json', 'Output as JSON')
    .option('--all', 'List all schemas with their resolution sources')
    .action(async (name?: string, options?: { json?: boolean; all?: boolean }) => {
      try {
        const root = await resolveRootForCommand({}, { json: options?.json });
        if (!root) return;
        const schemaContext = root.schemaContext;

        if (options?.all) {
          // List all schemas
          const schemas = getAllSchemasWithResolution(schemaContext);

          if (options?.json) {
            console.log(JSON.stringify(schemas, null, 2));
          } else {
            if (schemas.length === 0) {
              console.log('No schemas found.');
              return;
            }

            // Group by source
            const bySource = {
              project: schemas.filter((s) => s.source === 'project'),
              store: schemas.filter((s) => s.source === 'store'),
              user: schemas.filter((s) => s.source === 'user'),
              package: schemas.filter((s) => s.source === 'package'),
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

            if (bySource.store.length > 0) {
              console.log('\nStore schemas:');
              for (const schema of bySource.store) {
                const shadowInfo =
                  schema.shadows.length > 0
                    ? ` (shadows: ${schema.shadows.map((s) => s.source).join(', ')})`
                    : '';
                console.log(
                  `  ${schema.name} (${schema.storeId})${shadowInfo}`
                );
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
          }
          return;
        }

        if (!name) {
          console.error('Error: Schema name is required (or use --all to list all schemas)');
          process.exitCode = 1;
          return;
        }

        const resolution = getSchemaResolution(name, schemaContext);

        if (!resolution) {
          const available = listSchemas(schemaContext);
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

        if (options?.json) {
          console.log(JSON.stringify(resolution, null, 2));
        } else {
          console.log(`Schema: ${resolution.name}`);
          console.log(
            `Source: ${
              resolution.source === 'store'
                ? `Store (${resolution.storeId})`
                : resolution.source
            }`
          );
          console.log(`Path: ${resolution.path}`);

          if (resolution.shadows.length > 0) {
            console.log('\nShadows:');
            for (const shadow of resolution.shadows) {
              console.log(`  ${shadow.source}: ${shadow.path}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
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
        const root = await resolveRootForCommand({}, { json: options?.json });
        if (!root) return;
        const schemaContext = root.schemaContext;

        if (!name) {
          // Validate all schemas in the active project layer.
          const projectSchemasDir = getProjectSchemasDir(schemaContext.root);

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
            if (
              schemaContext.source === 'store' &&
              schemaContext.visibleSchemas !== '*' &&
              !schemaContext.visibleSchemas.includes(entry.name)
            ) {
              continue;
            }

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
        const schemaDir = getSchemaDir(name, schemaContext);

        if (!schemaDir) {
          const available = listSchemas(schemaContext);
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
        const root = await resolveRootForCommand({}, { json: options?.json });
        if (!root) {
          spinner?.stop();
          return;
        }
        const projectRoot = root.consumerRoot;
        const schemaContext = root.schemaContext;
        const destinationName = name || `${source}-custom`;
        const writeError = schemaStoreWriteError(schemaContext, 'fork');
        if (writeError) {
          if (options?.json) {
            console.log(JSON.stringify({
              forked: false,
              error: writeError.message,
              ...(writeError.storeId ? { storeId: writeError.storeId } : {}),
            }, null, 2));
          } else {
            console.error(`Error: ${writeError.message}`);
          }
          process.exitCode = 1;
          return;
        }

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

        // Find source schema
        const sourceDir = getSchemaDir(source, schemaContext);
        if (!sourceDir) {
          const available = listSchemas(schemaContext);
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
        const sourceResolution = getSchemaResolution(source, schemaContext);
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
        const root = await resolveRootForCommand({}, { json: options?.json });
        if (!root) {
          spinner?.stop();
          return;
        }
        const projectRoot = root.consumerRoot;
        const writeError = schemaStoreWriteError(root.schemaContext, 'init');
        if (writeError) {
          if (options?.json) {
            console.log(JSON.stringify({
              created: false,
              error: writeError.message,
              ...(writeError.storeId ? { storeId: writeError.storeId } : {}),
            }, null, 2));
          } else {
            console.error(`Error: ${writeError.message}`);
          }
          process.exitCode = 1;
          return;
        }

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
