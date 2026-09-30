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
  /**
   * Set when the root is a store: the store holds the planning artifacts,
   * and `implementationRoot` is the project that declares it, if any.
   */
  store?: { id: string; implementationRoot?: string };
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
    ...editScope(input),
    requiresAffectedAreaSelection: false,
  };
}

/**
 * A store holds planning artifacts only; implementation happens in the
 * project that declares it. Without a declaring project the CLI cannot know
 * the implementation repo, so it says so instead of naming the store (#2013).
 */
function editScope(input: ActionContextInput): Pick<ActionContext, 'allowedEditRoots' | 'constraints'> {
  if (!input.store) {
    return {
      allowedEditRoots: [input.projectRoot],
      constraints: ['Repo-local change artifacts and implementation edits are scoped to this project.'],
    };
  }

  const planning = `Change artifacts live in store '${input.store.id}' (${input.projectRoot}).`;
  const { implementationRoot } = input.store;
  if (implementationRoot) {
    return {
      allowedEditRoots: [implementationRoot, input.projectRoot],
      constraints: [
        `${planning} Implementation edits belong to ${implementationRoot}, which declares this store.`,
      ],
    };
  }

  return {
    allowedEditRoots: [input.projectRoot],
    constraints: [
      `${planning} No project on the current path declares this store, so ask the user which repository implementation edits belong to.`,
    ],
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
