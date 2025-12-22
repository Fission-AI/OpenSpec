/**
 * Workflow Engine PoC - Change Command
 *
 * `openspec wf change create <title>` - Create a new workflow change
 */

import chalk from 'chalk';
import ora from 'ora';
import { createChange, listChanges, saveActiveChangeId } from './state.js';

export async function runChangeCreate(title: string): Promise<void> {
  if (!title || title.trim().length === 0) {
    console.log(chalk.red('Title is required. Usage: openspec wf change create "<title>"'));
    process.exit(1);
  }

  const spinner = ora(`Creating change "${title}"...`).start();
  try {
    const id = await createChange('.', title.trim());
    spinner.succeed(`Created change: ${chalk.bold(id)}`);
    console.log();
    console.log(chalk.dim('State directory: .openspec/changes/' + id));
    console.log(chalk.dim('Phase: plan'));
    console.log();
    console.log(chalk.cyan('Next:'), 'Add tasks to .openspec/changes/' + id + '/tasks.yaml');
    console.log(chalk.cyan('Then:'), 'Run `openspec wf phase advance` to move to implement');
  } catch (error) {
    spinner.fail(`Failed to create change: ${(error as Error).message}`);
    process.exit(1);
  }
}

export async function runChangeList(options: { json?: boolean } = {}): Promise<void> {
  const changes = await listChanges('.');

  if (options.json) {
    console.log(JSON.stringify({ changes }, null, 2));
    return;
  }

  if (changes.length === 0) {
    console.log(chalk.dim('No workflow changes found.'));
    return;
  }

  console.log(chalk.bold('Workflow Changes:'));
  for (const change of changes) {
    console.log(`  • ${change}`);
  }
}

export async function runChangeSwitch(changeId: string): Promise<void> {
  const changes = await listChanges('.');
  if (!changes.includes(changeId)) {
    console.log(chalk.red(`Change "${changeId}" not found.`));
    console.log(chalk.dim('Available changes: ' + (changes.join(', ') || 'none')));
    process.exit(1);
  }

  await saveActiveChangeId('.', changeId);
  console.log(chalk.green(`Switched to change: ${chalk.bold(changeId)}`));
}
