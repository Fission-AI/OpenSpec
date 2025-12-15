/**
 * Workflow Engine PoC - Phase Command
 *
 * `openspec wf phase advance` - Advance to the next phase
 */

import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { loadWorkflowState, updatePhase, getChangePath } from './state.js';
import { PhaseId, Task } from './types.js';

const PHASE_ORDER: PhaseId[] = ['draft', 'plan', 'implement', 'done'];

function getNextPhase(current: PhaseId): PhaseId | null {
  const index = PHASE_ORDER.indexOf(current);
  if (index === -1 || index === PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[index + 1];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateTransition(
  from: PhaseId,
  to: PhaseId,
  tasks: Task[],
  changeId: string
): Promise<string[]> {
  const blockers: string[] = [];

  if (from === 'draft' && to === 'plan') {
    // Requires plan.md to exist
    const planPath = path.join(getChangePath('.', changeId), 'plan.md');
    if (!(await fileExists(planPath))) {
      blockers.push('No plan.md found. Create a plan before advancing.');
    }
  } else if (from === 'plan' && to === 'implement') {
    // Requires valid tasks
    if (tasks.length === 0) {
      blockers.push('No tasks defined. Add tasks to tasks.yaml before advancing.');
    } else {
      const missingAC = tasks.filter(
        (t) => !t.acceptance_criteria || t.acceptance_criteria.length === 0
      );
      if (missingAC.length > 0) {
        blockers.push(
          `Tasks missing acceptance criteria: ${missingAC.map((t) => t.id).join(', ')}`
        );
      }
    }
  } else if (from === 'implement' && to === 'done') {
    // Requires all tasks complete
    const incomplete = tasks.filter((t) => t.status !== 'complete');
    if (incomplete.length > 0) {
      blockers.push(
        `${incomplete.length} task(s) not complete: ${incomplete.map((t) => t.id).join(', ')}`
      );
    }
  }

  return blockers;
}

export async function runPhaseAdvance(options: { to?: string } = {}): Promise<void> {
  const state = await loadWorkflowState('.');

  if (!state.activeChangeId || !state.activeChange) {
    console.log(chalk.red('No active change. Create one first with `openspec wf change create`.'));
    process.exit(1);
  }

  const currentPhase = state.activeChange.meta.currentPhaseId;
  const tasks = state.activeChange.tasks;

  // Determine target phase
  let targetPhase: PhaseId;
  if (options.to) {
    if (!PHASE_ORDER.includes(options.to as PhaseId)) {
      console.log(chalk.red(`Invalid phase: ${options.to}. Valid phases: ${PHASE_ORDER.join(', ')}`));
      process.exit(1);
    }
    targetPhase = options.to as PhaseId;
  } else {
    const next = getNextPhase(currentPhase);
    if (!next) {
      console.log(chalk.green('Already at final phase (done). Nothing to advance.'));
      return;
    }
    targetPhase = next;
  }

  // Cannot go backwards
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const targetIndex = PHASE_ORDER.indexOf(targetPhase);
  if (targetIndex <= currentIndex) {
    console.log(chalk.red(`Cannot transition from "${currentPhase}" to "${targetPhase}". Phases only move forward.`));
    process.exit(1);
  }

  // Validate all intermediate transitions
  let phase = currentPhase;
  while (phase !== targetPhase) {
    const next = getNextPhase(phase)!;
    const blockers = await validateTransition(phase, next, tasks, state.activeChangeId);
    if (blockers.length > 0) {
      console.log(chalk.red.bold(`Cannot advance from "${phase}" to "${next}":`));
      for (const b of blockers) {
        console.log(chalk.red(`  • ${b}`));
      }
      process.exit(1);
    }
    phase = next;
  }

  // Perform the transition
  const spinner = ora(`Advancing from ${currentPhase} to ${targetPhase}...`).start();
  try {
    await updatePhase('.', state.activeChangeId, targetPhase);
    spinner.succeed(`Advanced to ${chalk.bold(targetPhase)}`);
  } catch (error) {
    spinner.fail(`Failed to advance: ${(error as Error).message}`);
    process.exit(1);
  }
}
