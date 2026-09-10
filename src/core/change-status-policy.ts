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
  status: 'done' | 'skipped' | 'ready' | 'blocked';
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

/**
 * The one next action for a change, in both the forms the CLI needs.
 *
 * `sentence` is what the JSON `nextSteps` contract publishes; `command` is the
 * bare command the text surface prints. Both are built here so the two
 * surfaces can never name a different next step.
 */
export interface ChangeNextStep {
  /** Ready-to-run command, including any `--store` flag. */
  command: string;
  /** Sentence form carried by the JSON `nextSteps` array. */
  sentence: string;
}

export function resolveNextStep(input: ChangeNextStepsInput): ChangeNextStep | undefined {
  const readyArtifact = input.artifactStatuses.find((artifact) => artifact.status === 'ready');
  const storeFlag = input.storeId ? ` --store ${input.storeId}` : '';

  if (readyArtifact) {
    const command = `openspec instructions ${readyArtifact.id} --change "${input.changeName}"${storeFlag} --json`;
    return { command, sentence: `Run ${command} before writing that artifact.` };
  }

  if (input.allArtifactsComplete) {
    const command = `openspec instructions apply --change "${input.changeName}"${storeFlag} --json`;
    return {
      command,
      sentence: `All planning artifacts are complete. Run ${command} to inspect implementation progress.`,
    };
  }

  return undefined;
}

export function buildNextSteps(input: ChangeNextStepsInput): string[] {
  const step = resolveNextStep(input);
  return step ? [step.sentence] : [];
}
