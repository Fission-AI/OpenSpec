import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readChangeMetadata } from '../../utils/change-metadata.js';
import { countTasksFromContent, type TaskProgress } from '../../utils/task-progress.js';
import { resolveWorkspaceChange } from './change.js';
import {
  getWorkspaceRepoGuidance,
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  type WorkspaceLocalOverlay,
  type WorkspaceMetadata,
} from './metadata.js';

const REPO_LOCAL_OPENSPEC_DIRNAME = 'openspec';
const MATERIALIZATION_TRACE_FILENAME = '.openspec.materialization.yaml';

export type WorkspaceChangeState = 'planned' | 'in-progress' | 'blocked' | 'soft-done' | 'hard-done';
export type WorkspaceCoordinationState = 'planned' | 'in-progress' | 'blocked' | 'complete';
export type WorkspaceTargetState = 'planned' | 'materialized' | 'in-progress' | 'blocked' | 'complete' | 'archived';
export type WorkspaceTargetSource = 'workspace' | 'repo';

export interface WorkspaceCoordinationStatus {
  state: WorkspaceCoordinationState;
  tasks: TaskProgress;
  problems: string[];
}

export interface WorkspaceTargetStatus {
  alias: string;
  state: WorkspaceTargetState;
  source: WorkspaceTargetSource;
  tasks: TaskProgress;
  problems: string[];
  owner?: string;
  handoff?: string;
}

export interface WorkspaceChangeStatus {
  change: {
    id: string;
    state: WorkspaceChangeState;
  };
  coordination: WorkspaceCoordinationStatus;
  targets: WorkspaceTargetStatus[];
}

interface TaskReadResult {
  ok: boolean;
  tasks: TaskProgress;
  problem?: string;
}

interface RepoResolutionResult {
  ok: boolean;
  repoRoot?: string;
  problems: string[];
}

interface MaterializationTrace {
  source: 'workspace';
  workspaceName: string;
  targetAlias: string;
  materializedAt: string;
}

interface ArchivedRepoChangeLookup {
  found: boolean;
  archivedPath?: string;
  problem?: string;
}

function emptyTaskProgress(): TaskProgress {
  return { completed: 0, total: 0 };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readTasksFile(
  filePath: string,
  missingProblem: string,
  unreadableProblem: string
): Promise<TaskReadResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      ok: true,
      tasks: countTasksFromContent(content),
    };
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;

    return {
      ok: false,
      tasks: emptyTaskProgress(),
      problem: code === 'ENOENT' ? missingProblem : unreadableProblem,
    };
  }
}

export function deriveCoordinationState(tasks: TaskProgress): WorkspaceCoordinationState {
  if (tasks.total > 0 && tasks.completed === tasks.total) {
    return 'complete';
  }

  if (tasks.completed > 0) {
    return 'in-progress';
  }

  return 'planned';
}

export function deriveTargetState(tasks: TaskProgress): WorkspaceTargetState {
  if (tasks.total > 0 && tasks.completed === tasks.total) {
    return 'complete';
  }

  if (tasks.completed > 0) {
    return 'in-progress';
  }

  return 'materialized';
}

async function findArchivedRepoChange(
  repoRoot: string,
  changeId: string
): Promise<ArchivedRepoChangeLookup> {
  const archiveRoot = path.join(repoRoot, REPO_LOCAL_OPENSPEC_DIRNAME, 'changes', 'archive');

  let entries;
  try {
    entries = await fs.readdir(archiveRoot, { withFileTypes: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { found: false };
    }

    return {
      found: false,
      problem: `repo-local archive directory for '${changeId}' could not be inspected`,
    };
  }

  const matches = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(`-${changeId}`))
    .map((entry) => path.join(archiveRoot, entry.name))
    .sort((left, right) => left.localeCompare(right));

  if (matches.length === 0) {
    return { found: false };
  }

  return {
    found: true,
    archivedPath: matches[matches.length - 1],
  };
}

function resolveRepoPath(
  workspaceRoot: string,
  localOverlay: WorkspaceLocalOverlay,
  alias: string
): string | null {
  const storedPath = localOverlay.repoPaths[alias];
  if (!storedPath) {
    return null;
  }

  return path.isAbsolute(storedPath)
    ? storedPath
    : path.resolve(workspaceRoot, storedPath);
}

async function resolveTargetRepo(
  workspaceRoot: string,
  workspaceMetadata: WorkspaceMetadata,
  localOverlay: WorkspaceLocalOverlay,
  alias: string
): Promise<RepoResolutionResult> {
  if (!workspaceMetadata.repos[alias]) {
    return {
      ok: false,
      problems: [`repo alias '${alias}' is missing from .openspec/workspace.yaml`],
    };
  }

  const repoRoot = resolveRepoPath(workspaceRoot, localOverlay, alias);
  if (!repoRoot) {
    return {
      ok: false,
      problems: [`repo alias '${alias}' is missing from .openspec/local.yaml`],
    };
  }

  let stats;
  try {
    stats = await fs.stat(repoRoot);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        ok: false,
        problems: [`repo alias '${alias}' points to a missing repo path`],
      };
    }

    return {
      ok: false,
      problems: [`repo alias '${alias}' could not be inspected`],
    };
  }

  if (!stats.isDirectory()) {
    return {
      ok: false,
      problems: [`repo alias '${alias}' points to a non-directory path`],
    };
  }

  if (!await pathExists(path.join(repoRoot, REPO_LOCAL_OPENSPEC_DIRNAME))) {
    return {
      ok: false,
      problems: [`repo alias '${alias}' is missing repo-local OpenSpec state (${REPO_LOCAL_OPENSPEC_DIRNAME}/)`],
    };
  }

  return {
    ok: true,
    repoRoot,
    problems: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readMaterializationTrace(
  tracePath: string,
  workspaceName: string,
  alias: string
): Promise<{ ok: true; trace: MaterializationTrace } | { ok: false; problem: string }> {
  let raw: string;
  try {
    raw = await fs.readFile(tracePath, 'utf-8');
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      ok: false,
      problem: code === 'ENOENT'
        ? 'repo-local change exists but is missing .openspec.materialization.yaml'
        : 'repo-local .openspec.materialization.yaml could not be read',
    };
  }

  let parsed: unknown;
  try {
    parsed = raw.trim().length === 0 ? {} : parseYaml(raw);
  } catch {
    return {
      ok: false,
      problem: 'repo-local .openspec.materialization.yaml is malformed',
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      problem: 'repo-local .openspec.materialization.yaml is malformed',
    };
  }

  const trace = parsed as Partial<MaterializationTrace>;
  if (trace.source !== 'workspace') {
    return {
      ok: false,
      problem: 'repo-local materialization trace does not declare source: workspace',
    };
  }

  if (trace.workspaceName !== workspaceName) {
    return {
      ok: false,
      problem: 'repo-local materialization trace points to a different workspace',
    };
  }

  if (trace.targetAlias !== alias) {
    return {
      ok: false,
      problem: 'repo-local materialization trace points to a different target alias',
    };
  }

  if (typeof trace.materializedAt !== 'string' || trace.materializedAt.trim().length === 0) {
    return {
      ok: false,
      problem: 'repo-local materialization trace is missing materializedAt',
    };
  }

  return {
    ok: true,
    trace: trace as MaterializationTrace,
  };
}

async function inspectCoordination(changePath: string): Promise<WorkspaceCoordinationStatus> {
  const tasksPath = path.join(changePath, 'tasks', 'coordination.md');
  const taskRead = await readTasksFile(
    tasksPath,
    "workspace coordination tasks are missing at 'tasks/coordination.md'",
    "workspace coordination tasks at 'tasks/coordination.md' could not be read"
  );

  if (!taskRead.ok) {
    return {
      state: 'blocked',
      tasks: taskRead.tasks,
      problems: [taskRead.problem ?? 'workspace coordination tasks could not be read'],
    };
  }

  return {
    state: deriveCoordinationState(taskRead.tasks),
    tasks: taskRead.tasks,
    problems: [],
  };
}

function buildWorkspaceTargetStatus(
  alias: string,
  workspaceMetadata: WorkspaceMetadata,
  targetStatus: Omit<WorkspaceTargetStatus, 'alias' | 'owner' | 'handoff'>
): WorkspaceTargetStatus {
  return {
    alias,
    ...getWorkspaceRepoGuidance(workspaceMetadata.repos[alias]),
    ...targetStatus,
  };
}

async function inspectTarget(
  workspaceRoot: string,
  workspaceMetadata: WorkspaceMetadata,
  localOverlay: WorkspaceLocalOverlay,
  workspaceName: string,
  changeId: string,
  changePath: string,
  alias: string
): Promise<WorkspaceTargetStatus> {
  const workspaceTasks = await readTasksFile(
    path.join(changePath, 'targets', alias, 'tasks.md'),
    `workspace draft tasks are missing at 'targets/${alias}/tasks.md'`,
    `workspace draft tasks at 'targets/${alias}/tasks.md' could not be read`
  );
  const repoResolution = await resolveTargetRepo(workspaceRoot, workspaceMetadata, localOverlay, alias);

  if (!repoResolution.ok || !repoResolution.repoRoot) {
    return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
      state: 'blocked',
      source: 'workspace',
      tasks: workspaceTasks.tasks,
      problems: [
        ...(!workspaceTasks.ok && workspaceTasks.problem ? [workspaceTasks.problem] : []),
        ...repoResolution.problems,
      ],
    });
  }

  const repoChangePath = path.join(repoResolution.repoRoot, REPO_LOCAL_OPENSPEC_DIRNAME, 'changes', changeId);
  let repoChangeStats;
  try {
    repoChangeStats = await fs.stat(repoChangePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (!workspaceTasks.ok) {
        return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
          state: 'blocked',
          source: 'workspace',
          tasks: workspaceTasks.tasks,
          problems: [workspaceTasks.problem ?? `workspace draft tasks for '${alias}' could not be read`],
        });
      }

        const archivedChange = await findArchivedRepoChange(repoResolution.repoRoot, changeId);
        if (archivedChange.problem) {
          return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
            state: 'blocked',
            source: 'workspace',
            tasks: workspaceTasks.tasks,
            problems: [
              ...(!workspaceTasks.ok && workspaceTasks.problem ? [workspaceTasks.problem] : []),
              archivedChange.problem,
            ],
          });
        }

        if (!archivedChange.found || !archivedChange.archivedPath) {
          return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
            state: 'planned',
            source: 'workspace',
            tasks: workspaceTasks.tasks,
            problems: [],
          });
        }

        const archivedTrace = await readMaterializationTrace(
          path.join(archivedChange.archivedPath, MATERIALIZATION_TRACE_FILENAME),
          workspaceName,
          alias
        );
        if (!archivedTrace.ok) {
          return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
            state: 'blocked',
            source: 'workspace',
            tasks: workspaceTasks.tasks,
            problems: [
              ...(!workspaceTasks.ok && workspaceTasks.problem ? [workspaceTasks.problem] : []),
              archivedTrace.problem,
            ],
          });
        }

        const archivedTasks = await readTasksFile(
          path.join(archivedChange.archivedPath, 'tasks.md'),
          `archived repo-local tasks are missing at '${alias}/openspec/changes/archive/*-${changeId}/tasks.md'`,
          `archived repo-local tasks at '${alias}/openspec/changes/archive/*-${changeId}/tasks.md' could not be read`
        );
        if (!archivedTasks.ok) {
          return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
            state: 'blocked',
            source: 'repo',
            tasks: archivedTasks.tasks,
            problems: [archivedTasks.problem ?? `archived repo-local tasks for '${alias}' could not be read`],
          });
        }

        return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
          state: 'archived',
          source: 'repo',
          tasks: archivedTasks.tasks,
          problems: [],
        });
      }

    return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
      state: 'blocked',
      source: 'workspace',
      tasks: workspaceTasks.tasks,
      problems: [
        ...(!workspaceTasks.ok && workspaceTasks.problem ? [workspaceTasks.problem] : []),
        `repo-local change '${changeId}' for '${alias}' could not be inspected`,
      ],
    });
  }

  if (!repoChangeStats.isDirectory()) {
    return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
      state: 'blocked',
      source: 'workspace',
      tasks: workspaceTasks.tasks,
      problems: [
        ...(!workspaceTasks.ok && workspaceTasks.problem ? [workspaceTasks.problem] : []),
        `repo-local change '${changeId}' for '${alias}' is not a directory`,
      ],
    });
  }

  const trace = await readMaterializationTrace(
    path.join(repoChangePath, MATERIALIZATION_TRACE_FILENAME),
    workspaceName,
    alias
  );
  if (!trace.ok) {
    return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
      state: 'blocked',
      source: 'workspace',
      tasks: workspaceTasks.tasks,
      problems: [
        ...(!workspaceTasks.ok && workspaceTasks.problem ? [workspaceTasks.problem] : []),
        trace.problem,
      ],
    });
  }

  const repoTasks = await readTasksFile(
    path.join(repoChangePath, 'tasks.md'),
    `repo-local tasks are missing at '${alias}/openspec/changes/${changeId}/tasks.md'`,
    `repo-local tasks at '${alias}/openspec/changes/${changeId}/tasks.md' could not be read`
  );
  if (!repoTasks.ok) {
    return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
      state: 'blocked',
      source: 'repo',
      tasks: repoTasks.tasks,
      problems: [repoTasks.problem ?? `repo-local tasks for '${alias}' could not be read`],
    });
  }

  return buildWorkspaceTargetStatus(alias, workspaceMetadata, {
    state: deriveTargetState(repoTasks.tasks),
    source: 'repo',
    tasks: repoTasks.tasks,
    problems: [],
  });
}

function hasExplicitWorkspaceCompletion(changePath: string, workspaceRoot: string): boolean {
  const metadata = readChangeMetadata(changePath, workspaceRoot);
  return typeof metadata?.workspaceArchivedAt === 'string'
    && metadata.workspaceArchivedAt.trim().length > 0;
}

function isSoftDoneTarget(target: WorkspaceTargetStatus): boolean {
  const tasksComplete = target.tasks.total > 0 && target.tasks.completed === target.tasks.total;
  return tasksComplete && (target.state === 'complete' || target.state === 'archived');
}

export function deriveWorkspaceChangeState(
  coordination: WorkspaceCoordinationStatus,
  targets: WorkspaceTargetStatus[],
  hardDone: boolean
): WorkspaceChangeState {
  if (hardDone) {
    return 'hard-done';
  }

  if (coordination.state === 'blocked' || targets.some((target) => target.state === 'blocked')) {
    return 'blocked';
  }

  if (coordination.state === 'complete' && targets.every((target) => isSoftDoneTarget(target))) {
    return 'soft-done';
  }

  if (coordination.state === 'planned' && targets.every((target) => target.state === 'planned')) {
    return 'planned';
  }

  return 'in-progress';
}

export async function getWorkspaceChangeStatus(
  workspaceRoot: string,
  changeName: string
): Promise<WorkspaceChangeStatus> {
  const workspaceMetadata = await readWorkspaceMetadata(workspaceRoot);
  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);
  const change = await resolveWorkspaceChange(workspaceRoot, changeName);
  const coordination = await inspectCoordination(change.path);
  const targets = await Promise.all(
    [...change.targets]
      .sort((left, right) => left.localeCompare(right))
      .map((alias) => inspectTarget(
        workspaceRoot,
        workspaceMetadata,
        localOverlay,
        workspaceMetadata.name,
        change.id,
        change.path,
        alias
      ))
  );
  const hardDone = hasExplicitWorkspaceCompletion(change.path, workspaceRoot);

  return {
    change: {
      id: change.id,
      state: deriveWorkspaceChangeState(coordination, targets, hardDone),
    },
    coordination,
    targets,
  };
}

function formatTaskSummary(tasks: TaskProgress): string {
  return `${tasks.completed}/${tasks.total} tasks`;
}

function isRepoResolutionProblem(problem: string): boolean {
  return problem.startsWith("repo alias '");
}

function formatRepoGuidanceSuffix(target: Pick<WorkspaceTargetStatus, 'owner' | 'handoff'>): string {
  const guidance = [
    target.owner ? `owner: ${target.owner}` : null,
    target.handoff ? `handoff: ${target.handoff}` : null,
  ].filter((detail): detail is string => detail !== null);

  return guidance.length > 0
    ? ` [${guidance.join('; ')}]`
    : '';
}

export function getWorkspaceStatusNextStep(status: WorkspaceChangeStatus): string | null {
  if (status.change.state === 'hard-done') {
    return `Workspace change '${status.change.id}' is already hard-done.`;
  }

  if (status.change.state === 'soft-done') {
    return `run 'openspec archive ${status.change.id} --workspace' to mark the workspace hard-done.`;
  }

  const repoResolutionBlocker = status.targets.find(
    (target) => target.state === 'blocked' && target.problems.some(isRepoResolutionProblem)
  );
  if (repoResolutionBlocker) {
    return `run 'openspec workspace doctor' and repair repo alias '${repoResolutionBlocker.alias}' before resuming '${status.change.id}'.`;
  }

  if (status.coordination.state === 'blocked') {
    return `repair workspace coordination tasks for '${status.change.id}' under changes/${status.change.id}/tasks/coordination.md, then rerun 'openspec status --change ${status.change.id}'.`;
  }

  const blockedTarget = status.targets.find((target) => target.state === 'blocked');
  if (blockedTarget) {
    return `repair the reported problems for target alias '${blockedTarget.alias}', then rerun 'openspec status --change ${status.change.id}'.`;
  }

  const activeTarget = status.targets.find(
    (target) => target.state === 'in-progress' || target.state === 'materialized'
  );
  if (activeTarget) {
    return `continue repo-local work for alias '${activeTarget.alias}' under change '${status.change.id}', then rerun 'openspec status --change ${status.change.id}'.`;
  }

  const plannedTarget = status.targets.find((target) => target.state === 'planned');
  if (plannedTarget) {
    return `materialize the next repo when ready with 'openspec apply --change ${status.change.id} --repo ${plannedTarget.alias}'.`;
  }

  return null;
}

export function printWorkspaceStatusText(status: WorkspaceChangeStatus): void {
  console.log(`Workspace change: ${status.change.id}`);
  console.log(`State: ${status.change.state}`);
  console.log();
  console.log(`Coordination: ${status.coordination.state} (${formatTaskSummary(status.coordination.tasks)})`);
  for (const problem of status.coordination.problems) {
    console.log(`  problem: ${problem}`);
  }

  console.log();
  console.log('Targets:');
  for (const target of status.targets) {
    console.log(
      `- ${target.alias}: ${target.state} via ${target.source} (${formatTaskSummary(target.tasks)})${formatRepoGuidanceSuffix(target)}`
    );
    for (const problem of target.problems) {
      console.log(`  problem: ${problem}`);
    }
  }

  const nextStep = getWorkspaceStatusNextStep(status);
  if (nextStep) {
    console.log();
    console.log(`Next step: ${nextStep}`);
  }
}
