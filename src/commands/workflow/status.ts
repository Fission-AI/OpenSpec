/**
 * Status Command
 *
 * Displays artifact completion status for a change.
 */

import ora from 'ora';
import chalk from 'chalk';
import { getChangeDir } from '../../core/planning-home.js';
import {
  emitStoreRootBanner,
  resolveRootForCommand,
  toPlanningHome,
  toRootOutput,
} from '../../core/root-selection.js';
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
  store?: string;
  storePath?: string;
  json?: boolean;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function statusCommand(options: StatusOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Loading change status...').start();

  try {
    const root = await resolveRootForCommand(options, { json: options.json });
    if (!root) {
      return;
    }

    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const rootOutput = toRootOutput(root);

    // Handle no-changes case gracefully — status is informational,
    // so "no changes" is a valid state, not an error.
    if (!options.change) {
      const available = await getAvailableChanges(projectRoot, root.changesDir);
      if (available.length === 0) {
        spinner?.stop();
        if (options.json) {
          console.log(
            JSON.stringify(
              { changes: [], message: 'No active changes.', root: rootOutput },
              null,
              2
            )
          );
          return;
        }
        emitStoreRootBanner(root);
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
      root.changesDir
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
      console.log(JSON.stringify({ ...status, root: rootOutput }, null, 2));
      return;
    }

    emitStoreRootBanner(root);
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
  if (status.initiative) {
    console.log(`Initiative: ${status.initiative.store}/${status.initiative.id}`);
  }
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
