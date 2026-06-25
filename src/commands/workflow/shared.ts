/**
 * Shared Types and Utilities for Artifact Workflow Commands
 *
 * This module contains types, constants, and validation helpers used across
 * multiple artifact workflow commands.
 */

import chalk from 'chalk';
import path from 'path';
import * as fs from 'fs';
import { getSchemaDir, listSchemas } from '../../core/artifact-graph/index.js';
import { getLoadedPlugins } from '../../core/plugin/context.js';
import { validateChangeName, getChangesDir } from '../../utils/change-utils.js';
import type { OrchestrationHints } from '../../core/orchestration/types.js';
import type { InitiativeLink } from '../../core/change-metadata/index.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TaskItem {
  id: string;
  description: string;
  done: boolean;
}

export interface ApplyInstructions {
  changeName: string;
  changeDir: string;
  schemaName: string;
  initiative?: InitiativeLink;
  contextFiles: Record<string, string[]>;
  progress: {
    total: number;
    complete: number;
    remaining: number;
  };
  tasks: TaskItem[];
  state: 'blocked' | 'all_done' | 'ready';
  missingArtifacts?: string[];
  instruction: string;
  gates?: {
    pre?: Array<{
      id: string;
      check: string;
      severity: string;
      prompt?: string;
      command?: string;
      retry?: number;
      on_p2?: string;
    }>;
    post?: Array<{
      id: string;
      check: string;
      severity: string;
      prompt?: string;
      command?: string;
      retry?: number;
      on_p2?: string;
    }>;
  };
  steps?: Array<{
    id: string;
    method?: string;
    tdd?: {
      enforce: string;
      test_pattern?: string;
      min_coverage?: number;
      marker?: boolean;
    };
    gate_ref?: string;
    instruction?: string;
  }>;
  orchestration?: OrchestrationHints;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const DEFAULT_SCHEMA = 'spec-driven';

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Checks if color output is disabled via NO_COLOR env or --no-color flag.
 */
export function isColorDisabled(): boolean {
  return process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true';
}

/**
 * Gets the color function based on status.
 */
export function getStatusColor(status: 'done' | 'ready' | 'blocked'): (text: string) => string {
  if (isColorDisabled()) {
    return (text: string) => text;
  }
  switch (status) {
    case 'done':
      return chalk.green;
    case 'ready':
      return chalk.yellow;
    case 'blocked':
      return chalk.red;
  }
}

/**
 * Gets the status indicator for an artifact.
 */
export function getStatusIndicator(status: 'done' | 'ready' | 'blocked'): string {
  const color = getStatusColor(status);
  switch (status) {
    case 'done':
      return color('[x]');
    case 'ready':
      return color('[ ]');
    case 'blocked':
      return color('[-]');
  }
}

/**
 * Returns the list of available change directory names under openspec/changes/.
 * Excludes the archive directory and hidden directories.
 */
export async function getAvailableChanges(
  projectRoot: string,
  // Fork: default to getChangesDir() so config.yaml changesDir (vault) is respected;
  // upstream v1.4.1 added the explicit changesDir parameter for caller overrides.
  changesDir = getChangesDir(projectRoot)
): Promise<string[]> {
  const changesPath = changesDir;
  try {
    const entries = await fs.promises.readdir(changesPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Validates that a change exists and returns available changes if not.
 * Checks directory existence directly to support scaffolded changes (without proposal.md).
 */
export async function validateChangeExists(
  changeName: string | undefined,
  projectRoot: string,
  // Fork: default to getChangesDir() so config.yaml changesDir (vault) is respected;
  // upstream v1.4.1 added the explicit changesDir parameter for caller overrides.
  changesDir = getChangesDir(projectRoot)
): Promise<string> {
  if (!changeName) {
    const available = await getAvailableChanges(projectRoot, changesDir);
    if (available.length === 0) {
      throw new Error('No changes found. Create one with: openspec new change <name>');
    }
    throw new Error(
      `Missing required option --change. Available changes:\n  ${available.join('\n  ')}`
    );
  }

  // Validate change name format to prevent path traversal
  const nameValidation = validateChangeName(changeName);
  if (!nameValidation.valid) {
    throw new Error(`Invalid change name '${changeName}': ${nameValidation.error}`);
  }

  // Check directory existence directly.
  // changesDir defaults to getChangesDir(projectRoot) (fork: respects config.yaml changesDir);
  // upstream v1.4.1 made it an overridable parameter.
  const changePath = path.join(changesDir, changeName);
  const exists = fs.existsSync(changePath) && fs.statSync(changePath).isDirectory();

  if (!exists) {
    const available = await getAvailableChanges(projectRoot, changesDir);
    if (available.length === 0) {
      throw new Error(
        `Change '${changeName}' not found. No changes exist. Create one with: openspec new change <name>`
      );
    }
    throw new Error(
      `Change '${changeName}' not found. Available changes:\n  ${available.join('\n  ')}`
    );
  }

  return changeName;
}

/**
 * Validates that a schema exists and returns available schemas if not.
 *
 * @param schemaName - The schema name to validate
 * @param projectRoot - Optional project root for project-local schema resolution
 */
export function validateSchemaExists(schemaName: string, projectRoot?: string): string {
  const loadedPlugins = projectRoot ? getLoadedPlugins(projectRoot) : undefined;
  const schemaDir = getSchemaDir(schemaName, projectRoot, loadedPlugins);
  if (!schemaDir) {
    const availableSchemas = listSchemas(projectRoot, loadedPlugins);
    throw new Error(
      `Schema '${schemaName}' not found. Available schemas:\n  ${availableSchemas.join('\n  ')}`
    );
  }
  return schemaName;
}
