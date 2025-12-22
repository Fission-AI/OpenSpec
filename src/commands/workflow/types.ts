/**
 * Workflow Engine PoC - Types
 *
 * Minimal types for the file-backed state machine.
 * Schema version: poc-1
 */

export const SCHEMA_VERSION = 'poc-1';

export type PhaseId = 'draft' | 'plan' | 'implement' | 'done';

export type TaskStatus = 'pending' | 'in_progress' | 'complete' | 'blocked';

export interface Task {
  id: string;
  title: string;
  acceptance_criteria: string[];
  status: TaskStatus;
}

export interface TasksFile {
  schemaVersion: string;
  tasks: Task[];
}

export interface MetaFile {
  schemaVersion: string;
  id: string;
  title: string;
  currentPhaseId: PhaseId;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowChange {
  meta: MetaFile;
  tasks: Task[];
}

export interface WorkflowState {
  activeChangeId: string | null;
  activeChange: WorkflowChange | null;
}

export interface StatusOutput {
  activeChangeId: string | null;
  phase: PhaseId | null;
  taskProgress: {
    total: number;
    pending: number;
    in_progress: number;
    complete: number;
    blocked: number;
  } | null;
  nextTask: Task | null;
  blockers: string[];
  nextAction: string;
}
