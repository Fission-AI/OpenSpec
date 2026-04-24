/**
 * New Change Command
 *
 * Creates a new change directory with optional description and schema.
 */

import ora from 'ora';
import path from 'path';
import { createWorkspaceChange } from '../../core/workspace/change-create.js';
import {
  recordWorkspaceOpenUpgradeRequest,
  WORKSPACE_OPEN_MODE_ENV,
  WORKSPACE_OPEN_SESSION_TOKEN_ENV,
  WORKSPACE_OPEN_WORKSPACE_ROOT_ENV,
} from '../../core/workspace/open-session.js';
import { findWorkspaceRoot } from '../../core/workspace/registry.js';
import { createChange, validateChangeName } from '../../utils/change-utils.js';
import { validateSchemaExists } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewChangeOptions {
  description?: string;
  schema?: string;
  targets?: string;
}

async function maybeRecordWorkspaceOpenUpgradeRequest(workspaceRoot: string, changeId: string): Promise<boolean> {
  const sessionToken = process.env[WORKSPACE_OPEN_SESSION_TOKEN_ENV]?.trim();
  const openMode = process.env[WORKSPACE_OPEN_MODE_ENV]?.trim();
  const sessionWorkspaceRoot = process.env[WORKSPACE_OPEN_WORKSPACE_ROOT_ENV]?.trim();

  if (!sessionToken || openMode !== 'workspace-root' || !sessionWorkspaceRoot) {
    return false;
  }

  if (sessionWorkspaceRoot !== workspaceRoot) {
    return false;
  }

  await recordWorkspaceOpenUpgradeRequest(workspaceRoot, sessionToken, changeId);
  return true;
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

  const currentWorkingDir = process.cwd();
  const workspaceRoot = await findWorkspaceRoot(currentWorkingDir);
  const projectRoot = workspaceRoot ?? currentWorkingDir;

  if (workspaceRoot && !options.targets) {
    throw new Error(
      "Workspace changes require explicit targets. Use 'openspec new change <name> --targets <a,b,c>'."
    );
  }

  if (!workspaceRoot && options.targets) {
    throw new Error(
      "--targets is only supported inside a workspace created with 'openspec workspace setup' or 'openspec workspace create'."
    );
  }

  // Validate schema if provided
  if (options.schema) {
    validateSchemaExists(options.schema, projectRoot);
  }

  const schemaDisplay = options.schema ? ` with schema '${options.schema}'` : '';
  const targetDisplay = options.targets ? ` targeting ${options.targets}` : '';
  const spinner = ora(`Creating change '${name}'${schemaDisplay}${targetDisplay}...`).start();

  try {
    if (workspaceRoot) {
      const result = await createWorkspaceChange(workspaceRoot, name, {
        description: options.description,
        schema: options.schema,
        targets: options.targets!,
      });
      const recordedUpgrade = await maybeRecordWorkspaceOpenUpgradeRequest(workspaceRoot, name);

      spinner.succeed(
        `Created workspace change '${name}' at changes/${name}/ (schema: ${result.schema}; targets: ${result.targets.join(', ')})`
      );
      if (recordedUpgrade) {
        console.log(
          `Recorded a workspace-open scope upgrade for '${name}'. Exit the current root session so OpenSpec can reopen it with attached repos.`
        );
      }
      return;
    }

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
