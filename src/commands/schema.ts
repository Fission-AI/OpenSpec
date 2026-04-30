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
import { SCHEMA_MESSAGES, CLI_MESSAGES, CONFIG_MESSAGES } from '../messages/index.js';

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
    console.log(SCHEMA_MESSAGES.checkingSchemaExists);
  }
  if (!fs.existsSync(schemaPath)) {
    issues.push({
      level: 'error',
      path: 'schema.yaml',
      message: SCHEMA_MESSAGES.schemaNotFound,
    });
    return { valid: false, issues };
  }

  // Parse YAML
  if (verbose) {
    console.log(SCHEMA_MESSAGES.parsingYaml);
  }
  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    issues.push({
      level: 'error',
      path: 'schema.yaml',
      message: SCHEMA_MESSAGES.failedToReadFile((err as Error).message),
    });
    return { valid: false, issues };
  }

  // Validate against Zod schema
  if (verbose) {
    console.log(SCHEMA_MESSAGES.validatingSchemaStructure);
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
        message: SCHEMA_MESSAGES.parseError((err as Error).message),
      });
    }
    return { valid: false, issues };
  }

  // Check template files exist
  // Templates can be in schemaDir directly or in a templates/ subdirectory
  if (verbose) {
    console.log(SCHEMA_MESSAGES.checkingTemplateFiles);
  }
  for (const artifact of schema.artifacts) {
    // Try templates subdirectory first (standard location), then root
    const templatePathInTemplates = path.join(schemaDir, 'templates', artifact.template);
    const templatePathInRoot = path.join(schemaDir, artifact.template);

    if (!fs.existsSync(templatePathInTemplates) && !fs.existsSync(templatePathInRoot)) {
      issues.push({
        level: 'error',
        path: `artifacts.${artifact.id}.template`,
        message: SCHEMA_MESSAGES.templateNotFound(artifact.template, artifact.id),
      });
    }
  }

  // Dependency graph validation is already done by parseSchema
  // (it throws on cycles and invalid references)
  if (verbose) {
    console.log(SCHEMA_MESSAGES.dependencyGraphPassed);
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
    .description(SCHEMA_MESSAGES.manageWorkflows);

  // Experimental warning
  schemaCmd.hook('preAction', () => {
    console.error(SCHEMA_MESSAGES.experimentalWarning);
  });

  // schema which
  schemaCmd
    .command('which [name]')
    .description(SCHEMA_MESSAGES.showResolve)
    .option('--json', SCHEMA_MESSAGES.outputAsJson)
    .option('--all', SCHEMA_MESSAGES.listAllSchemasOption)
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
              console.log(SCHEMA_MESSAGES.noSchemasFound);
              return;
            }

            // Group by source
            const bySource = {
              project: schemas.filter((s) => s.source === 'project'),
              user: schemas.filter((s) => s.source === 'user'),
              package: schemas.filter((s) => s.source === 'package'),
            };

            if (bySource.project.length > 0) {
              console.log('\n' + SCHEMA_MESSAGES.projectSchemasHeader);
              for (const schema of bySource.project) {
                const shadowInfo = schema.shadows.length > 0
                  ? SCHEMA_MESSAGES.shadowsLabel(schema.shadows.map((s) => s.source).join(', '))
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.user.length > 0) {
              console.log('\n' + SCHEMA_MESSAGES.userSchemasHeader);
              for (const schema of bySource.user) {
                const shadowInfo = schema.shadows.length > 0
                  ? SCHEMA_MESSAGES.shadowsLabel(schema.shadows.map((s) => s.source).join(', '))
                  : '';
                console.log(`  ${schema.name}${shadowInfo}`);
              }
            }

            if (bySource.package.length > 0) {
              console.log('\n' + SCHEMA_MESSAGES.packageSchemasHeader);
              for (const schema of bySource.package) {
                console.log(`  ${schema.name}`);
              }
            }
          }
          return;
        }

        if (!name) {
          console.error(SCHEMA_MESSAGES.schemaNameRequired);
          process.exitCode = 1;
          return;
        }

        const resolution = getSchemaResolution(name, projectRoot);

        if (!resolution) {
          const available = listSchemas(projectRoot);
          if (options?.json) {
            console.log(JSON.stringify({
              error: SCHEMA_MESSAGES.schemaNotFoundError(name),
              available,
            }, null, 2));
          } else {
            console.error(SCHEMA_MESSAGES.schemaNotFoundError(name));
            console.error(SCHEMA_MESSAGES.availableSchemas(available.join(', ')));
          }
          process.exitCode = 1;
          return;
        }

        if (options?.json) {
          console.log(JSON.stringify(resolution, null, 2));
        } else {
          console.log(SCHEMA_MESSAGES.schemaLabel(resolution.name));
          console.log(SCHEMA_MESSAGES.sourceLabel(resolution.source));
          console.log(SCHEMA_MESSAGES.pathLabel(resolution.path));

          if (resolution.shadows.length > 0) {
            console.log('\n' + SCHEMA_MESSAGES.shadowsHeader);
            for (const shadow of resolution.shadows) {
              console.log(SCHEMA_MESSAGES.shadowEntry(shadow.source, shadow.path));
            }
          }
        }
      } catch (error) {
        console.error(CLI_MESSAGES.error((error as Error).message));
        process.exitCode = 1;
      }
    });

  // schema validate
  schemaCmd
    .command('validate [name]')
    .description(SCHEMA_MESSAGES.validateStructure)
    .option('--json', SCHEMA_MESSAGES.outputAsJson)
    .option('--verbose', SCHEMA_MESSAGES.verboseOption)
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
                message: SCHEMA_MESSAGES.noProjectSchemasDir,
                schemas: [],
              }, null, 2));
            } else {
              console.log(SCHEMA_MESSAGES.noProjectSchemasDir + '.');
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
              console.log('\n' + SCHEMA_MESSAGES.validatingEntry(entry.name));
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
              console.log(SCHEMA_MESSAGES.noSchemasInProject);
              return;
            }

            console.log('\n' + SCHEMA_MESSAGES.validationResultsHeader);
            for (const result of schemaResults) {
              console.log(SCHEMA_MESSAGES.validationStatus(result.valid, result.name));
              for (const issue of result.issues) {
                console.log(SCHEMA_MESSAGES.issueLine(issue.level, issue.message));
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
              error: SCHEMA_MESSAGES.schemaNotFoundError(name),
              available,
            }, null, 2));
          } else {
            console.error(SCHEMA_MESSAGES.schemaNotFoundError(name));
            console.error(SCHEMA_MESSAGES.availableSchemas(available.join(', ')));
          }
          process.exitCode = 1;
          return;
        }

        if (options?.verbose && !options?.json) {
          console.log(SCHEMA_MESSAGES.validatingEntry(name));
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
            console.log(SCHEMA_MESSAGES.schemaIsValid(name));
          } else {
            console.log(SCHEMA_MESSAGES.schemaHasErrors(name));
            for (const issue of result.issues) {
              console.log(SCHEMA_MESSAGES.issueLine(issue.level, issue.message));
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
          console.error(CLI_MESSAGES.error((error as Error).message));
        }
        process.exitCode = 1;
      }
    });

  // schema fork
  schemaCmd
    .command('fork <source> [name]')
    .description(SCHEMA_MESSAGES.copySchema)
    .option('--json', SCHEMA_MESSAGES.outputAsJson)
    .option('--force', SCHEMA_MESSAGES.forceOption)
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
              error: SCHEMA_MESSAGES.invalidSchemaName(destinationName),
            }, null, 2));
          } else {
            console.error(SCHEMA_MESSAGES.invalidSchemaName(destinationName).replace(/^Nome/, 'Erro: Nome'));
            console.error(SCHEMA_MESSAGES.schemaNamesKebabCase);
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
              error: SCHEMA_MESSAGES.schemaSourceNotFound(source),
              available,
            }, null, 2));
          } else {
            console.error(SCHEMA_MESSAGES.schemaNotFoundError(source).replace(/^Esquema/, 'Erro: Esquema'));
            console.error(SCHEMA_MESSAGES.availableSchemas(available.join(', ')));
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
                error: SCHEMA_MESSAGES.schemaAlreadyExists(destinationName),
                suggestion: SCHEMA_MESSAGES.suggestionForceOverwrite,
              }, null, 2));
            } else {
              console.error(SCHEMA_MESSAGES.schemaAlreadyExistsAt(destinationName, destinationDir));
              console.error(SCHEMA_MESSAGES.suggestionForceOverwrite);
            }
            process.exitCode = 1;
            return;
          }

          // Remove existing
          if (spinner) spinner.start(SCHEMA_MESSAGES.removingExistingSchema(destinationName));
          fs.rmSync(destinationDir, { recursive: true });
        }

        // Copy schema
        if (spinner) spinner.start(SCHEMA_MESSAGES.forkingSchema(source, destinationName));
        copyDirRecursive(sourceDir, destinationDir);

        // Update name in schema.yaml
        const destSchemaPath = path.join(destinationDir, 'schema.yaml');
        const schemaContent = fs.readFileSync(destSchemaPath, 'utf-8');
        const schema = parseSchema(schemaContent);
        schema.name = destinationName;

        fs.writeFileSync(destSchemaPath, stringifyYaml(schema));

        if (spinner) spinner.succeed(SCHEMA_MESSAGES.forkedSchema(source, destinationName));

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
          console.log('\n' + SCHEMA_MESSAGES.sourceLabel2(sourceDir, sourceLocation));
          console.log(SCHEMA_MESSAGES.destinationLabel(destinationDir));
          console.log('\n' + SCHEMA_MESSAGES.customizeSchemaAt);
          console.log(`  ${destinationDir}/schema.yaml`);
        }
      } catch (error) {
        if (spinner) spinner.fail(SCHEMA_MESSAGES.forkFailed);
        if (options?.json) {
          console.log(JSON.stringify({
            forked: false,
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(CLI_MESSAGES.error((error as Error).message));
        }
        process.exitCode = 1;
      }
    });

  // schema init
  schemaCmd
    .command('init <name>')
    .description(SCHEMA_MESSAGES.createSchema)
    .option('--json', SCHEMA_MESSAGES.outputAsJson)
    .option('--description <text>', SCHEMA_MESSAGES.descriptionOption)
    .option('--artifacts <list>', 'Comma-separated artifact IDs (proposal,specs,design,tasks)')
    .option('--default', SCHEMA_MESSAGES.defaultOption)
    .option('--no-default', SCHEMA_MESSAGES.noDefaultOption)
    .option('--force', SCHEMA_MESSAGES.forceOption2)
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
              error: SCHEMA_MESSAGES.invalidSchemaName(name),
            }, null, 2));
          } else {
            console.error(SCHEMA_MESSAGES.invalidSchemaName(name).replace(/^Nome/, 'Erro: Nome'));
            console.error(SCHEMA_MESSAGES.schemaNamesKebabCase);
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
                error: SCHEMA_MESSAGES.schemaAlreadyExists(name),
                suggestion: SCHEMA_MESSAGES.suggestionForkOrForce,
              }, null, 2));
            } else {
              console.error(SCHEMA_MESSAGES.schemaAlreadyExistsAt(name, schemaDir));
              console.error(SCHEMA_MESSAGES.suggestionForkOrForce);
            }
            process.exitCode = 1;
            return;
          }

          if (spinner) spinner.start(SCHEMA_MESSAGES.removingExistingSchema(name));
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
            message: CONFIG_MESSAGES.schemaDescription,
            default: `Custom workflow schema for ${name}`,
          });

          const artifactChoices = DEFAULT_ARTIFACTS.map((a) => ({
            name: a.id,
            value: a.id,
            checked: true,
          }));

          selectedArtifactIds = await checkbox({
            message: CONFIG_MESSAGES.selectArtifacts,
            choices: artifactChoices,
          });

          if (selectedArtifactIds.length === 0) {
            console.error(SCHEMA_MESSAGES.atLeastOneArtifact);
            process.exitCode = 1;
            return;
          }

          // Ask about setting as default (unless --no-default was passed)
          if (options?.default === undefined) {
            const setAsDefault = await confirm({
              message: CONFIG_MESSAGES.setAsDefaultSchema,
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
                    error: SCHEMA_MESSAGES.unknownArtifact(id),
                    valid: validIds,
                  }, null, 2));
                } else {
                  console.error(SCHEMA_MESSAGES.unknownArtifact(id).replace(/^Artefato/, 'Erro: Artefato'));
                  console.error(SCHEMA_MESSAGES.validArtifacts(validIds.join(', ')));
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
        if (spinner) spinner.start(SCHEMA_MESSAGES.creatingSchema(name));
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

        if (spinner) spinner.succeed(SCHEMA_MESSAGES.schemaCreated(name));

        if (options?.json) {
          console.log(JSON.stringify({
            created: true,
            path: schemaDir,
            schema: name,
            artifacts: selectedArtifactIds,
            setAsDefault: options?.default || false,
          }, null, 2));
        } else {
          console.log('\n' + SCHEMA_MESSAGES.schemaCreatedAt(schemaDir));
          console.log('\n' + SCHEMA_MESSAGES.artifactsLabel(selectedArtifactIds.join(', ')));
          if (options?.default) {
            console.log('\n' + SCHEMA_MESSAGES.setAsDefaultSchemaLabel);
          }
          console.log('\n' + SCHEMA_MESSAGES.nextStepsHeader);
          console.log(SCHEMA_MESSAGES.editSchemaYaml(schemaDir));
          console.log(SCHEMA_MESSAGES.modifyTemplates);
          console.log(SCHEMA_MESSAGES.useWithSchema(name));
        }
      } catch (error) {
        if (spinner) spinner.fail(SCHEMA_MESSAGES.creationFailed);
        if (options?.json) {
          console.log(JSON.stringify({
            created: false,
            error: (error as Error).message,
          }, null, 2));
        } else {
          console.error(CLI_MESSAGES.error((error as Error).message));
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
