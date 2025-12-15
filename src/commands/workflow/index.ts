/**
 * Workflow Engine PoC - Command Index
 *
 * Exports all workflow commands for registration in CLI.
 */

export { runStatus } from './status.js';
export { runPhaseAdvance } from './phase.js';
export { runChangeCreate, runChangeList, runChangeSwitch } from './change.js';
export { runTaskComplete, runTaskStart, runTaskNext, runTaskAdd } from './task.js';
export * from './types.js';
