/**
 * Status Command
 *
 * Displays artifact completion status for a change.
 */

import ora from 'ora';
import chalk from 'chalk';
import { resolveCurrentPlanningHomeSync, getChangeDir } from '../../core/planning-home.js';
import {
  loadChangeContext,
  formatChangeStatus,
  type ChangeStatus,
} from '../../core/artifact-graph/index.js';
import {
  validateChangeExists,
  validateSchemaExists,
  getAvailableChanges,
  getStatusIndicator,
  getStatusColor,
} from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface StatusOptions {
  change?: string;
  schema?: string;
  json?: boolean;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function statusCommand(options: StatusOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Loading change status...').start();

  try {
    const planningHome = resolveCurrentPlanningHomeSync();
    const projectRoot = planningHome.root;

    // Handle no-changes case gracefully — status is informational,
    // so "no changes" is a valid state, not an error.
    if (!options.change) {
      const available = await getAvailableChanges(projectRoot, planningHome.changesDir);
      if (available.length === 0) {
        spinner?.stop();
        if (options.json) {
          console.log(JSON.stringify({ changes: [], message: 'No active changes.' }, null, 2));
          return;
        }
        console.log('No active changes. Create one with: openspec new change <name>');
        return;
      }
      // Changes exist but --change not provided
      spinner?.stop();
      throw new Error(
        `Missing required option --change. Available changes:\n  ${available.join('\n  ')}`
      );
    }

    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      planningHome.changesDir
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema, {
      changeDir: getChangeDir(planningHome, changeName),
      planningHome,
    });
    const status = formatChangeStatus(context);

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    printStatusText(status);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printStatusText(status: ChangeStatus): void {
  const doneCount = status.artifacts.filter((a) => a.status === 'done').length;
  const total = status.artifacts.length;

  console.log(`Change: ${status.changeName}`);
  console.log(`Schema: ${status.schemaName}`);
  if (status.planningHome) {
    const label = status.planningHome.kind === 'workspace'
      ? `workspace${status.planningHome.workspaceName ? ` (${status.planningHome.workspaceName})` : ''}`
      : 'repo';
    console.log(`Planning home: ${label}`);
    console.log(`Change root: ${status.changeRoot}`);
  }
  console.log(`Progress: ${doneCount}/${total} artifacts complete`);
  console.log();

  for (const artifact of status.artifacts) {
    const indicator = getStatusIndicator(artifact.status);
    const color = getStatusColor(artifact.status);
    let line = `${indicator} ${artifact.id}`;

    if (artifact.status === 'blocked' && artifact.missingDeps && artifact.missingDeps.length > 0) {
      line += color(` (blocked by: ${artifact.missingDeps.join(', ')})`);
    }

    console.log(line);
  }

  if (status.isComplete) {
    console.log();
    console.log(chalk.green('All artifacts complete!'));
  }
}
