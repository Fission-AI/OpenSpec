/**
 * Workflow Engine PoC - Task Command
 *
 * `openspec wf task complete <task-id>` - Mark a task as complete
 * `openspec wf task start <task-id>` - Mark a task as in_progress
 * `openspec wf task next` - Show the next task to work on
 */

import chalk from 'chalk';
import ora from 'ora';
import { loadWorkflowState, updateTaskStatus, loadTasks, saveTasks } from './state.js';
import { Task, TaskStatus, SCHEMA_VERSION } from './types.js';

export async function runTaskComplete(taskId: string): Promise<void> {
  const state = await loadWorkflowState('.');

  if (!state.activeChangeId || !state.activeChange) {
    console.log(chalk.red('No active change.'));
    process.exit(1);
  }

  const task = state.activeChange.tasks.find((t) => t.id === taskId);
  if (!task) {
    console.log(chalk.red(`Task "${taskId}" not found.`));
    console.log(chalk.dim('Available tasks: ' + state.activeChange.tasks.map((t) => t.id).join(', ')));
    process.exit(1);
  }

  if (task.status === 'complete') {
    console.log(chalk.yellow(`Task "${taskId}" is already complete.`));
    return;
  }

  const spinner = ora(`Marking task "${taskId}" as complete...`).start();
  try {
    await updateTaskStatus('.', state.activeChangeId, taskId, 'complete');
    spinner.succeed(`Task "${taskId}" marked as ${chalk.green('complete')}`);
  } catch (error) {
    spinner.fail(`Failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

export async function runTaskStart(taskId: string): Promise<void> {
  const state = await loadWorkflowState('.');

  if (!state.activeChangeId || !state.activeChange) {
    console.log(chalk.red('No active change.'));
    process.exit(1);
  }

  const task = state.activeChange.tasks.find((t) => t.id === taskId);
  if (!task) {
    console.log(chalk.red(`Task "${taskId}" not found.`));
    process.exit(1);
  }

  if (task.status === 'in_progress') {
    console.log(chalk.yellow(`Task "${taskId}" is already in progress.`));
    return;
  }

  const spinner = ora(`Marking task "${taskId}" as in_progress...`).start();
  try {
    await updateTaskStatus('.', state.activeChangeId, taskId, 'in_progress');
    spinner.succeed(`Task "${taskId}" marked as ${chalk.yellow('in_progress')}`);
  } catch (error) {
    spinner.fail(`Failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

export async function runTaskNext(options: { json?: boolean } = {}): Promise<void> {
  const state = await loadWorkflowState('.');

  if (!state.activeChangeId || !state.activeChange) {
    if (options.json) {
      console.log(JSON.stringify({ task: null, reason: 'No active change' }, null, 2));
    } else {
      console.log(chalk.red('No active change.'));
    }
    return;
  }

  const tasks = state.activeChange.tasks;

  // Priority: in_progress > pending
  const inProgress = tasks.find((t) => t.status === 'in_progress');
  const next = inProgress || tasks.find((t) => t.status === 'pending');

  if (options.json) {
    console.log(JSON.stringify({ task: next || null }, null, 2));
    return;
  }

  if (!next) {
    console.log(chalk.green('No pending or in-progress tasks.'));
    return;
  }

  console.log(chalk.bold('Next Task:'));
  console.log(`  ID: ${next.id}`);
  console.log(`  Title: ${next.title}`);
  console.log(`  Status: ${formatStatus(next.status)}`);
  if (next.acceptance_criteria.length > 0) {
    console.log('  Acceptance Criteria:');
    for (const ac of next.acceptance_criteria) {
      console.log(`    • ${ac}`);
    }
  }
}

export async function runTaskAdd(
  taskId: string,
  title: string,
  acceptanceCriteria: string[]
): Promise<void> {
  const state = await loadWorkflowState('.');

  if (!state.activeChangeId) {
    console.log(chalk.red('No active change.'));
    process.exit(1);
  }

  const tasks = await loadTasks('.', state.activeChangeId);

  if (tasks.find((t) => t.id === taskId)) {
    console.log(chalk.red(`Task "${taskId}" already exists.`));
    process.exit(1);
  }

  const newTask: Task = {
    id: taskId,
    title,
    acceptance_criteria: acceptanceCriteria,
    status: 'pending',
  };

  tasks.push(newTask);
  await saveTasks('.', state.activeChangeId, tasks);

  console.log(chalk.green(`Added task: ${chalk.bold(taskId)}`));
}

function formatStatus(status: TaskStatus): string {
  const colors: Record<TaskStatus, (s: string) => string> = {
    pending: chalk.dim,
    in_progress: chalk.yellow,
    complete: chalk.green,
    blocked: chalk.red,
  };
  return colors[status](status);
}
