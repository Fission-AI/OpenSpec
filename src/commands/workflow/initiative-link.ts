import type { PlanningHome } from '../../core/planning-home.js';
import {
  InitiativeResolutionError,
  type InitiativeLinkReference,
} from '../../core/collections/initiatives/index.js';

export interface ChangeCommandStatus {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  target?: string;
  fix?: string;
  details?: unknown;
}

export interface InitiativeSelectorOptions {
  initiative?: string;
  store?: string;
  storePath?: string;
}

export const REPO_LOCAL_INITIATIVE_LINK_ERROR =
  'Initiative links are supported only for repo-local changes. Run this command from the repo that owns the implementation plan.';

export function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function statusFromError(
  error: unknown
): ChangeCommandStatus {
  if (error instanceof InitiativeResolutionError) {
    return {
      severity: 'error',
      code: error.code,
      message: error.message,
      ...(error.target ? { target: error.target } : {}),
      ...(error.fix ? { fix: error.fix } : {}),
      ...(error.details ? { details: error.details } : {}),
    };
  }

  return {
    severity: 'error',
    code: 'change_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

export function assertInitiativeSelectorsHaveReference(options: InitiativeSelectorOptions): void {
  if (!options.initiative && (options.store !== undefined || options.storePath !== undefined)) {
    throw new Error('Pass --initiative when using --store or --store-path.');
  }

  if (options.initiative !== undefined && options.initiative.trim().length === 0) {
    throw new Error('Pass --initiative <id> to link a change to an initiative.');
  }
}

export function assertInitiativeReference(value: string | undefined): asserts value is string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error('Pass --initiative <id> to set a change initiative link.');
  }
}

export function assertRepoLocalInitiativeLinkPlanningHome(planningHome: PlanningHome): void {
  if (planningHome.kind === 'workspace') {
    throw new Error(REPO_LOCAL_INITIATIVE_LINK_ERROR);
  }
}

export function formatInitiativeLink(initiative: InitiativeLinkReference): string {
  return `${initiative.store}/${initiative.id}`;
}

export function sameInitiativeLink(
  left: InitiativeLinkReference | undefined,
  right: InitiativeLinkReference
): boolean {
  return left?.store === right.store && left.id === right.id;
}
