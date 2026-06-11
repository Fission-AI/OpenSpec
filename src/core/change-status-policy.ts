import type { PlanningHome } from './planning-home.js';

export interface PlanningHomeSummary {
  kind: 'repo';
  root: string;
  changesDir: string;
  defaultSchema: string;
}

export interface ActionContext {
  mode: 'repo-local';
  sourceOfTruth: 'repo';
  planningArtifacts: string[];
  linkedContext: Array<{ name: string }>;
  allowedEditRoots: string[];
  requiresAffectedAreaSelection: boolean;
  constraints: string[];
}

export interface ChangeStatusPolicyArtifact {
  id: string;
  status: 'done' | 'ready' | 'blocked';
}

export interface ChangeNextStepsInput {
  changeName: string;
  artifactStatuses: ChangeStatusPolicyArtifact[];
  allArtifactsComplete: boolean;
  /** Selected store id; next-step commands must carry it. */
  storeId?: string;
}

export interface ActionContextInput {
  projectRoot: string;
  artifactIds: string[];
}

export function summarizePlanningHome(
  planningHome: PlanningHome | undefined
): PlanningHomeSummary | undefined {
  if (!planningHome) {
    return undefined;
  }

  return {
    kind: planningHome.kind,
    root: planningHome.root,
    changesDir: planningHome.changesDir,
    defaultSchema: planningHome.defaultSchema,
  };
}

export function buildActionContext(input: ActionContextInput): ActionContext {
  return {
    mode: 'repo-local',
    sourceOfTruth: 'repo',
    planningArtifacts: input.artifactIds,
    linkedContext: [],
    allowedEditRoots: [input.projectRoot],
    requiresAffectedAreaSelection: false,
    constraints: ['Repo-local change artifacts and implementation edits are scoped to this project.'],
  };
}

export function buildNextSteps(input: ChangeNextStepsInput): string[] {
  const readyArtifact = input.artifactStatuses.find((artifact) => artifact.status === 'ready');
  const steps: string[] = [];

  if (readyArtifact) {
    const storeFlag = input.storeId ? ` --store ${input.storeId}` : '';
    steps.push(
      `Run openspec instructions ${readyArtifact.id} --change "${input.changeName}"${storeFlag} --json before writing that artifact.`
    );
  } else if (input.allArtifactsComplete) {
    steps.push('All planning artifacts are complete; review tasks before implementation.');
  }

  return steps;
}
