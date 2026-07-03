/**
 * Status Command
 *
 * Displays artifact completion status for a change.
 */

import ora from 'ora';
import chalk from 'chalk';
import { getChangeDir } from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  toPlanningHome,
  toRootOutput,
  withStoreFlag,
  isStoreSelectedRoot,
} from '../../core/root-selection.js';
import {
  loadChangeContext,
  formatChangeStatus,
  type ChangeStatus,
} from '../../core/artifact-graph/index.js';
import { asStatus } from '../shared-output.js';
import type { StoreDiagnostic } from '../../core/store/errors.js';
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
  all?: boolean;
  schema?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

// A batch entry is either a fully loaded status or, for a change that failed
// to load, the change name plus the diagnostic — the sweep never aborts.
type BatchStatusEntry = ChangeStatus | { changeName: string; status: StoreDiagnostic[] };

export async function statusCommand(options: StatusOptions): Promise<void> {
  if (options.all && options.change) {
    throw new Error('The --all and --change options are mutually exclusive.');
  }

  // The root resolves (and the store banner prints) before the spinner starts
  // so the two do not fight over stderr.
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('Loading change status...').start();

  try {
    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const rootOutput = toRootOutput(root);
    const newChangeHint = withStoreFlag(root, 'openspec new change <name>');

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
        console.log(`No active changes. Create one with: ${newChangeHint}`);
        return;
      }

      if (options.all) {
        if (options.schema) {
          validateSchemaExists(options.schema, projectRoot);
        }

        // readdir order is platform-dependent; sort for deterministic output
        // (same reason validate's listChangeIds sorts).
        const entries: BatchStatusEntry[] = [];
        for (const changeName of [...available].sort()) {
          try {
            const context = loadChangeContext(projectRoot, changeName, options.schema, {
              changeDir: getChangeDir(planningHome, changeName),
              planningHome,
            });
            entries.push(
              formatChangeStatus(context, isStoreSelectedRoot(root) ? { storeId: root.storeId } : {})
            );
          } catch (error) {
            // One malformed change must not blank the sweep; carry its
            // diagnostic in place and keep going.
            entries.push({ changeName, status: [asStatus(error, 'change_error')] });
          }
        }

        spinner?.stop();

        if (options.json) {
          console.log(JSON.stringify({ changes: entries, root: rootOutput }, null, 2));
          return;
        }

        entries.forEach((entry, index) => {
          if (index > 0) {
            console.log();
          }
          if ('artifacts' in entry) {
            printStatusText(entry);
          } else {
            console.log(chalk.red(`✗ ${entry.changeName}: ${entry.status[0]?.message}`));
          }
        });
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
      root.changesDir,
      { newChangeHint }
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
    const status = formatChangeStatus(
      context,
      isStoreSelectedRoot(root) ? { storeId: root.storeId } : {}
    );

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...status, root: rootOutput }, null, 2));
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
  if (status.changeRoot) {
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
