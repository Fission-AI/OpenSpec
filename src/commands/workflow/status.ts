/**
 * Status Command
 *
 * Displays artifact completion status for a change.
 */

import ora from 'ora';
import chalk from 'chalk';
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
import { WORKFLOW_MESSAGES } from '../../messages/index.js';

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
  const spinner = options.json ? undefined : ora(WORKFLOW_MESSAGES.loadingChangeStatus).start();

  try {
    const projectRoot = process.cwd();

    // Handle no-changes case gracefully — status is informational,
    // so "no changes" is a valid state, not an error.
    if (!options.change) {
      const available = await getAvailableChanges(projectRoot);
      if (available.length === 0) {
        spinner?.stop();
        if (options.json) {
          console.log(JSON.stringify({ changes: [], message: WORKFLOW_MESSAGES.noActiveChanges }, null, 2));
          return;
        }
        console.log(WORKFLOW_MESSAGES.noActiveChanges);
        return;
      }
      // Changes exist but --change not provided
      spinner?.stop();
      throw new Error(
        WORKFLOW_MESSAGES.missingChangeOption(available.join('\n  '))
      );
    }

    const changeName = await validateChangeExists(options.change, projectRoot);

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema);
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

  console.log(WORKFLOW_MESSAGES.changeLabel(status.changeName));
  console.log(WORKFLOW_MESSAGES.schemaLabel2(status.schemaName));
  console.log(WORKFLOW_MESSAGES.progressArtifacts(doneCount, total));
  console.log();

  for (const artifact of status.artifacts) {
    const indicator = getStatusIndicator(artifact.status);
    const color = getStatusColor(artifact.status);
    let line = `${indicator} ${artifact.id}`;

    if (artifact.status === 'blocked' && artifact.missingDeps && artifact.missingDeps.length > 0) {
      line += color(WORKFLOW_MESSAGES.blockedBy(artifact.missingDeps.join(', ')));
    }

    console.log(line);
  }

  if (status.isComplete) {
    console.log();
    console.log(chalk.green(WORKFLOW_MESSAGES.allArtifactsComplete));
  }
}
