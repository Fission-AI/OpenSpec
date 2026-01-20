import { stringify as stringifyYaml } from 'yaml';
import { listSchemasWithInfo, resolveSchema } from './artifact-graph/resolver.js';
import type { ProjectConfig } from './project-config.js';

/**
 * Check if an error is an ExitPromptError (user cancelled with Ctrl+C).
 * Used instead of instanceof check since @inquirer modules use dynamic imports.
 */
export function isExitPromptError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: string }).name === 'ExitPromptError'
  );
}

/**
 * Result of interactive config creation prompts.
 */
export interface ConfigPromptResult {
  /** Whether to create config file */
  createConfig: boolean;
  /** Selected schema name */
  schema?: string;
  /** Project context (optional) */
  context?: string;
  /** Per-artifact rules (optional) */
  rules?: Record<string, string[]>;
}

/**
 * Prompt user to create project config interactively.
 * Used by experimental setup command.
 *
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns Config prompt result
 * @throws ExitPromptError if user cancels (Ctrl+C)
 */
export async function promptForConfig(
  projectRoot?: string
): Promise<ConfigPromptResult> {
  // Dynamic imports to prevent pre-commit hook hangs (see #367)
  const { confirm, select, editor, checkbox } = await import('@inquirer/prompts');

  // Ask if user wants to create config
  const shouldCreate = await confirm({
    message: 'Create openspec/config.yaml?',
    default: true,
  });

  if (!shouldCreate) {
    return { createConfig: false };
  }

  // Get available schemas
  const schemas = listSchemasWithInfo(projectRoot);

  if (schemas.length === 0) {
    throw new Error('No schemas found. Cannot create config.');
  }

  // Prompt for schema selection
  const selectedSchema = await select({
    message: 'Default schema for new changes?',
    choices: schemas.map((s) => ({
      name: `${s.name} (${s.artifacts.join(' → ')})`,
      value: s.name,
      description: s.description || undefined,
    })),
  });

  // Prompt for project context
  console.log('\nAdd project context? (optional)');
  console.log('Context is shown to AI when creating artifacts.');
  console.log('Examples: tech stack, conventions, style guides, domain knowledge\n');

  const contextInput = await editor({
    message: 'Press Enter to skip, or edit context:',
    default: '',
    waitForUseInput: false,
  });

  const context = contextInput.trim() || undefined;

  // Prompt for per-artifact rules
  const addRules = await confirm({
    message: 'Add per-artifact rules? (optional)',
    default: false,
  });

  let rules: Record<string, string[]> | undefined;

  if (addRules) {
    // Load the selected schema to get artifact list
    const schema = resolveSchema(selectedSchema, projectRoot);
    const artifactIds = schema.artifacts.map((a) => a.id);

    // Let user select which artifacts to add rules for
    const selectedArtifacts = await checkbox({
      message: 'Which artifacts should have custom rules?',
      choices: artifactIds.map((id) => ({
        name: id,
        value: id,
      })),
    });

    if (selectedArtifacts.length > 0) {
      rules = {};

      // For each selected artifact, collect rules line by line
      for (const artifactId of selectedArtifacts) {
        const artifactRules = await promptForArtifactRules(artifactId);
        if (artifactRules.length > 0) {
          rules[artifactId] = artifactRules;
        }
      }

      // If no rules were actually added, set to undefined
      if (Object.keys(rules).length === 0) {
        rules = undefined;
      }
    }
  }

  return {
    createConfig: true,
    schema: selectedSchema,
    context,
    rules,
  };
}

/**
 * Prompt for rules for a specific artifact.
 * Collects rules one per line until user enters empty line.
 *
 * @param artifactId - The artifact ID to collect rules for
 * @returns Array of rules
 */
async function promptForArtifactRules(artifactId: string): Promise<string[]> {
  // Dynamic import to prevent pre-commit hook hangs (see #367)
  const { input } = await import('@inquirer/prompts');

  const rules: string[] = [];

  console.log(`\nRules for ${artifactId} artifact:`);
  console.log('Enter rules one per line, press Enter on empty line to finish:\n');

  while (true) {
    const rule = await input({
      message: '│',
      validate: () => {
        // Empty string is valid (signals end of input)
        return true;
      },
    });

    const trimmed = rule.trim();

    // Empty line signals end of input
    if (!trimmed) {
      break;
    }

    rules.push(trimmed);
  }

  return rules;
}

/**
 * Serialize config to YAML string with proper multi-line formatting.
 *
 * @param config - Partial config object (schema required, context/rules optional)
 * @returns YAML string ready to write to file
 */
export function serializeConfig(config: Partial<ProjectConfig>): string {
  // Build clean config object (only include defined fields)
  const cleanConfig: Record<string, unknown> = {
    schema: config.schema,
  };

  if (config.context) {
    cleanConfig.context = config.context;
  }

  if (config.rules && Object.keys(config.rules).length > 0) {
    cleanConfig.rules = config.rules;
  }

  // Serialize to YAML with proper formatting
  return stringifyYaml(cleanConfig, {
    indent: 2,
    lineWidth: 0, // Don't wrap long lines
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });
}
