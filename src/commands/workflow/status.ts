/**
 * Workflow Engine PoC - Status Command
 *
 * `openspec status` - Reports current workflow state
 */

import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { loadWorkflowState, getChangePath } from './state.js';
import { StatusOutput, Task, PhaseId } from './types.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getPhaseBlockers(phase: PhaseId, tasks: Task[], changeId: string): Promise<string[]> {
  const blockers: string[] = [];

  if (phase === 'draft') {
    // draft -> plan requires plan.md
    const planPath = path.join(getChangePath('.', changeId), 'plan.md');
    if (!(await fileExists(planPath))) {
      blockers.push('No plan.md found. Create a plan before advancing.');
    }
  } else if (phase === 'plan') {
    // plan -> implement requires valid tasks
    if (tasks.length === 0) {
      blockers.push('No tasks defined. Add tasks to tasks.yaml before advancing.');
    } else {
      const missingAC = tasks.filter((t) => !t.acceptance_criteria || t.acceptance_criteria.length === 0);
      if (missingAC.length > 0) {
        blockers.push(
          `Tasks missing acceptance criteria: ${missingAC.map((t) => t.id).join(', ')}`
        );
      }
    }
  } else if (phase === 'implement') {
    // implement -> done requires all tasks complete
    const incomplete = tasks.filter((t) => t.status !== 'complete');
    if (incomplete.length > 0) {
      blockers.push(
        `${incomplete.length} task(s) not complete: ${incomplete.map((t) => t.id).join(', ')}`
      );
    }
  }

  return blockers;
}

function getNextAction(phase: PhaseId | null, tasks: Task[], blockers: string[]): string {
  if (!phase) {
    return 'Run `openspec wf change create "<title>"` to start a new change.';
  }

  if (phase === 'done') {
    return 'Change is complete. Archive or start a new change.';
  }

  if (phase === 'draft') {
    if (blockers.length > 0) {
      return 'Create plan.md with your proposal, then run `openspec wf phase advance`.';
    }
    return 'Run `openspec wf phase advance` to move to plan phase.';
  }

  if (phase === 'plan') {
    if (blockers.length > 0) {
      return 'Add tasks with acceptance criteria, then run `openspec wf phase advance`.';
    }
    return 'Run `openspec wf phase advance` to move to implement phase.';
  }

  if (phase === 'implement') {
    const nextTask = tasks.find((t) => t.status === 'pending' || t.status === 'in_progress');
    if (nextTask) {
      if (nextTask.status === 'pending') {
        return `Start task "${nextTask.id}": ${nextTask.title}`;
      }
      return `Continue task "${nextTask.id}": ${nextTask.title}`;
    }
    if (blockers.length === 0) {
      return 'All tasks complete! Run `openspec wf phase advance` to finish.';
    }
    return 'Fix blockers above to advance to done.';
  }

  return 'Unknown state.';
}

function getNextTask(tasks: Task[]): Task | null {
  // Priority: in_progress > pending
  const inProgress = tasks.find((t) => t.status === 'in_progress');
  if (inProgress) return inProgress;

  const pending = tasks.find((t) => t.status === 'pending');
  return pending || null;
}

function getTaskProgress(tasks: Task[]) {
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    complete: tasks.filter((t) => t.status === 'complete').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
  };
}

export async function runStatus(options: { json?: boolean } = {}): Promise<void> {
  const state = await loadWorkflowState('.');

  const tasks = state.activeChange?.tasks || [];
  const phase = state.activeChange?.meta.currentPhaseId || null;
  const changeId = state.activeChangeId || '';
  const blockers = phase && changeId ? await getPhaseBlockers(phase, tasks, changeId) : [];
  const nextTask = phase === 'implement' ? getNextTask(tasks) : null;
  const nextAction = getNextAction(phase, tasks, blockers);

  const output: StatusOutput = {
    activeChangeId: state.activeChangeId,
    phase,
    taskProgress: tasks.length > 0 ? getTaskProgress(tasks) : null,
    nextTask,
    blockers,
    nextAction,
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  console.log();
  console.log(chalk.bold('Workflow Status'));
  console.log('═'.repeat(40));

  if (!state.activeChangeId) {
    console.log(chalk.dim('No active change.'));
    console.log();
    console.log(chalk.cyan('Next action:'), nextAction);
    return;
  }

  console.log(chalk.bold('Change:'), state.activeChangeId);
  if (state.activeChange) {
    console.log(chalk.bold('Title:'), state.activeChange.meta.title);
    console.log(chalk.bold('Phase:'), formatPhase(phase!));
  } else {
    console.log(chalk.yellow('Warning: Active change files not found.'));
  }

  if (output.taskProgress) {
    console.log();
    console.log(chalk.bold('Tasks:'));
    const p = output.taskProgress;
    console.log(
      `  ${chalk.green(p.complete + ' complete')} / ${p.total} total` +
      (p.in_progress > 0 ? ` (${chalk.yellow(p.in_progress + ' in progress')})` : '') +
      (p.blocked > 0 ? ` (${chalk.red(p.blocked + ' blocked')})` : '')
    );
  }

  if (blockers.length > 0) {
    console.log();
    console.log(chalk.red.bold('Blockers:'));
    for (const blocker of blockers) {
      console.log(chalk.red(`  • ${blocker}`));
    }
  }

  if (nextTask) {
    console.log();
    console.log(chalk.bold('Next Task:'));
    console.log(`  ID: ${nextTask.id}`);
    console.log(`  Title: ${nextTask.title}`);
    console.log(`  Status: ${formatTaskStatus(nextTask.status)}`);
    if (nextTask.acceptance_criteria.length > 0) {
      console.log('  Acceptance Criteria:');
      for (const ac of nextTask.acceptance_criteria) {
        console.log(`    • ${ac}`);
      }
    }
  }

  console.log();
  console.log(chalk.cyan.bold('Next action:'), nextAction);
}

function formatPhase(phase: PhaseId): string {
  const colors: Record<PhaseId, (s: string) => string> = {
    draft: chalk.magenta,
    plan: chalk.yellow,
    implement: chalk.blue,
    done: chalk.green,
  };
  return colors[phase](phase);
}

function formatTaskStatus(status: Task['status']): string {
  const colors: Record<Task['status'], (s: string) => string> = {
    pending: chalk.dim,
    in_progress: chalk.yellow,
    complete: chalk.green,
    blocked: chalk.red,
  };
  return colors[status](status);
}
