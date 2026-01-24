/**
 * New Change Command
 *
 * Creates a new change directory with optional description and schema.
 */

import ora from 'ora';
import path from 'path';
import { createChange, validateChangeName } from '../../utils/change-utils.js';
import { validateSchemaExists } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewChangeOptions {
  description?: string;
  schema?: string;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  if (!name) {
    throw new Error('Missing required argument <name>');
  }

  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const projectRoot = process.cwd();

  // Validate schema if provided
  if (options.schema) {
    validateSchemaExists(options.schema, projectRoot);
  }

  const schemaDisplay = options.schema ? ` with schema '${options.schema}'` : '';
  const spinner = ora(`Creating change '${name}'${schemaDisplay}...`).start();

  try {
    const result = await createChange(projectRoot, name, { schema: options.schema });

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const changeDir = path.join(projectRoot, 'openspec', 'changes', name);
      const readmePath = path.join(changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    spinner.succeed(`Created change '${name}' at openspec/changes/${name}/ (schema: ${result.schema})`);
  } catch (error) {
    spinner.fail(`Failed to create change '${name}'`);
    throw error;
  }
}
