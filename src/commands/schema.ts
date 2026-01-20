import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ora from 'ora';
import { stringify as stringifyYaml } from 'yaml';
import {
  getSchemaDir,
  getProjectSchemasDir,
  getUserSchemasDir,
  getPackageSchemasDir,
  listSchemas,
} from '../core/artifact-graph/resolver.js';
import { parseSchema, SchemaValidationError } from '../core/artifact-graph/schema.js';
import type { SchemaYaml, Artifact } from '../core/artifact-graph/types.js';

/**
 * Schema source location type
 */
type SchemaSource = 'project' | 'user' | 'package';

/**
 * Result of checking a schema location
 */
interface SchemaLocation {
  source: SchemaSource;
  path: string;
  exists: boolean;
}

/**
 * Schema resolution info with shadowing details
 */
interface SchemaResolution {
  name: string;
  source: SchemaSource;
  path: string;
  shadows: Array<{ source: SchemaSource; path: string }>;
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
  const locations = checkAllLocations(name, projectRoot);
  const existingLocations = locations.filter((loc) => loc.exists);

  if (existingLocations.length === 0) {
    return null;
  }

  const active = existingLocations[0];
  const shadows = existingLocations.slice(1).map((loc) => ({
    source: loc.source,
    path: loc.path,
  }));

  return {
    name,
    source: active.source,
    path: active.path,
    shadows,
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

  // Check template files exist
  // Templates can be in schemaDir directly or in a templates/ subdirectory
  if (verbose) {
    console.log('  Checking template files...');
  }
  for (const artifact of schema.artifacts) {
    // Try templates subdirectory first (standard location), then root
    const templatePathInTemplates = path.join(schemaDir, 'templates', artifact.template);
    const templatePathInRoot = path.join(schemaDir, artifact.template);

    if (!fs.existsSync(templatePathInTemplates) && !fs.existsSync(templatePathInRoot)) {
      issues.push({
        level: 'error',
        path: `artifacts.${artifact.id}.template`,
        message: `Template file '${artifact.template}' not found for artifact '${artifact.id}'`,
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
function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
        const projectRoot = process.cwd();

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
              project: schemas.filter((s) => s.source === 'project'),
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

        if (options?.json) {
          console.log(JSON.stringify(resolution, null, 2));
        } else {
          console.log(`Schema: ${resolution.name}`);
          console.log(`Source: ${resolution.source}`);
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
        const projectRoot = process.cwd();

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
            if (!entry.isDirectory()) continue;

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

            if (anyInvalid) {
              process.exitCode = 1;
            }
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
            process.exitCode = 1;
          }
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
        const projectRoot = process.cwd();
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

        // Check destination
        const destinationDir = path.join(getProjectSchemasDir(projectRoot), destinationName);

        if (fs.existsSync(destinationDir)) {
          if (!options?.force) {
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

          // Remove existing
          if (spinner) spinner.start(`Removing existing schema '${destinationName}'...`);
          fs.rmSync(destinationDir, { recursive: true });
        }

        // Copy schema
        if (spinner) spinner.start(`Forking '${source}' to '${destinationName}'...`);
        copyDirRecursive(sourceDir, destinationDir);

        // Update name in schema.yaml
        const destSchemaPath = path.join(destinationDir, 'schema.yaml');
        const schemaContent = fs.readFileSync(destSchemaPath, 'utf-8');
        const schema = parseSchema(schemaContent);
        schema.name = destinationName;

        fs.writeFileSync(destSchemaPath, stringifyYaml(schema));

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
        const projectRoot = process.cwd();

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

        // Check if exists
        if (fs.existsSync(schemaDir)) {
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

          if (spinner) spinner.start(`Removing existing schema '${name}'...`);
          fs.rmSync(schemaDir, { recursive: true });
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

        // Create schema directory
        if (spinner) spinner.start(`Creating schema '${name}'...`);
        fs.mkdirSync(schemaDir, { recursive: true });

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
