import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readChangeMetadata, writeChangeMetadata } from '../../utils/change-metadata.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { resolveWorkspaceChange } from './change.js';
import {
  formatUnknownTargetError,
  parseWorkspaceTargets,
  scaffoldWorkspaceTargetDraft,
} from './change-create.js';
import { readWorkspaceMetadata } from './metadata.js';
import {
  resolveWorkspaceRepoTargets,
  resolveWorkspaceRoot,
  type WorkspaceRepoResolutionIssue,
} from './registry.js';

const REPO_LOCAL_OPENSPEC_DIRNAME = 'openspec';

type TargetMutationAction = 'add' | 'remove';

interface PendingRemoval {
  alias: string;
  originalPath: string;
  backupPath: string | null;
}

export interface UpdateWorkspaceChangeTargetsOptions {
  cwd?: string;
  change: string;
  add?: string;
  remove?: string;
}

export interface UpdateWorkspaceChangeTargetsResult {
  workspaceRoot: string;
  change: {
    id: string;
    path: string;
  };
  targets: string[];
  addedTargets: string[];
  removedTargets: string[];
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseTargetMutationAliases(rawAliases: string | undefined, optionName: '--add' | '--remove'): string[] {
  if (rawAliases === undefined) {
    return [];
  }

  if (rawAliases.trim().length === 0) {
    throw new Error(`Option '${optionName}' requires at least one target alias.`);
  }

  return parseWorkspaceTargets(rawAliases);
}

function formatCurrentTargets(targets: string[]): string {
  return targets.length === 0 ? '(none)' : targets.join(', ');
}

function buildNoTargetMutationError(): Error {
  return new Error("Provide at least one of '--add <a,b,c>' or '--remove <a,b,c>'.");
}

function buildOverlappingTargetMutationError(alias: string): Error {
  return new Error(`Target alias '${alias}' cannot appear in both --add and --remove.`);
}

function buildAlreadyTargetedError(changeId: string, alias: string, currentTargets: string[]): Error {
  return new Error(
    `Target alias '${alias}' is already part of workspace change '${changeId}'. Current targets: ${formatCurrentTargets(currentTargets)}`
  );
}

function buildUntargetedRemovalError(changeId: string, alias: string, currentTargets: string[]): Error {
  return new Error(
    `Target alias '${alias}' is not part of workspace change '${changeId}'. Current targets: ${formatCurrentTargets(currentTargets)}`
  );
}

function buildLastTargetRemovalError(changeId: string): Error {
  return new Error(
    `Workspace change '${changeId}' must keep at least one target alias. Add a replacement target before removing the last target.`
  );
}

function buildDraftSliceCollisionError(alias: string): Error {
  return new Error(
    `Cannot add target alias '${alias}' because a draft slice already exists at 'targets/${alias}/' while metadata does not include it. Clean up that stray slice before retrying.`
  );
}

function buildUnresolvedTargetMutationError(
  changeId: string,
  alias: string,
  action: TargetMutationAction,
  issues: WorkspaceRepoResolutionIssue[]
): Error {
  const lines = [
    `Cannot safely ${action} target alias '${alias}' on workspace change '${changeId}' because repo resolution failed:`,
    ...issues.map((issue) => `- ${issue.message}`),
    `Run 'openspec workspace doctor' and repair the alias before retrying.`,
  ];

  return new Error(lines.join('\n'));
}

function buildRepoLocalExecutionConflictError(
  changeId: string,
  alias: string,
  action: TargetMutationAction,
  state: 'active' | 'archived',
  repoPath: string
): Error {
  const stateLabel = state === 'active' ? 'already exists' : 'was already archived';

  return new Error(
    `Cannot ${action} target alias '${alias}' on workspace change '${changeId}' because repo-local execution ${stateLabel} at ${repoPath}. This would break the workspace-to-repo authority handoff.`
  );
}

async function findArchivedRepoLocalChange(repoRoot: string, changeId: string): Promise<string | null> {
  const archiveRoot = path.join(repoRoot, REPO_LOCAL_OPENSPEC_DIRNAME, 'changes', 'archive');

  let entries;
  try {
    entries = await fs.readdir(archiveRoot, { withFileTypes: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }

  const matches = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(`-${changeId}`))
    .map((entry) => path.join(archiveRoot, entry.name))
    .sort((left, right) => left.localeCompare(right));

  return matches.at(-1) ?? null;
}

async function assertSafeRepoLocalMutation(
  workspaceRoot: string,
  changeId: string,
  alias: string,
  action: TargetMutationAction
): Promise<void> {
  const repoResolution = await resolveWorkspaceRepoTargets(workspaceRoot, [alias]);

  if (repoResolution.issues.length > 0) {
    throw buildUnresolvedTargetMutationError(changeId, alias, action, repoResolution.issues);
  }

  const resolvedRepo = repoResolution.resolvedRepos[0];
  if (!resolvedRepo) {
    throw new Error(`Could not resolve repo alias '${alias}' for workspace change '${changeId}'.`);
  }

  const repoChangePath = path.join(resolvedRepo.resolvedPath, REPO_LOCAL_OPENSPEC_DIRNAME, 'changes', changeId);
  if (await pathExists(repoChangePath)) {
    throw buildRepoLocalExecutionConflictError(changeId, alias, action, 'active', repoChangePath);
  }

  const archivedRepoChangePath = await findArchivedRepoLocalChange(resolvedRepo.resolvedPath, changeId);
  if (archivedRepoChangePath) {
    throw buildRepoLocalExecutionConflictError(changeId, alias, action, 'archived', archivedRepoChangePath);
  }
}

async function rollbackWorkspaceTargetMutation(
  changePath: string,
  addedTargets: string[],
  pendingRemovals: PendingRemoval[],
  backupRoot: string | null
): Promise<void> {
  for (const alias of addedTargets) {
    await fs.rm(path.join(changePath, 'targets', alias), { recursive: true, force: true });
  }

  for (const removal of [...pendingRemovals].reverse()) {
    if (!removal.backupPath || !await pathExists(removal.backupPath)) {
      continue;
    }

    await FileSystemUtils.createDirectory(path.dirname(removal.originalPath));
    await fs.rm(removal.originalPath, { recursive: true, force: true });
    await fs.rename(removal.backupPath, removal.originalPath);
  }

  if (backupRoot) {
    await fs.rm(backupRoot, { recursive: true, force: true });
  }
}

export async function updateWorkspaceChangeTargets(
  options: UpdateWorkspaceChangeTargetsOptions
): Promise<UpdateWorkspaceChangeTargetsResult> {
  const workspaceRoot = FileSystemUtils.canonicalizeExistingPath(
    await resolveWorkspaceRoot(options.cwd ?? process.cwd())
  );
  const change = await resolveWorkspaceChange(workspaceRoot, options.change);
  const metadata = readChangeMetadata(change.path, workspaceRoot);

  if (!metadata) {
    throw new Error(
      `Workspace change '${change.id}' is missing required metadata at ${path.join(change.path, '.openspec.yaml')}.`
    );
  }

  const addTargets = parseTargetMutationAliases(options.add, '--add');
  const removeTargets = parseTargetMutationAliases(options.remove, '--remove');

  if (addTargets.length === 0 && removeTargets.length === 0) {
    throw buildNoTargetMutationError();
  }

  const addTargetSet = new Set(addTargets);
  const removeTargetSet = new Set(removeTargets);

  for (const alias of addTargets) {
    if (removeTargetSet.has(alias)) {
      throw buildOverlappingTargetMutationError(alias);
    }
  }

  const currentTargets = [...(metadata.targets ?? [])];
  const currentTargetSet = new Set(currentTargets);

  for (const alias of addTargets) {
    if (currentTargetSet.has(alias)) {
      throw buildAlreadyTargetedError(change.id, alias, currentTargets);
    }
  }

  for (const alias of removeTargets) {
    if (!currentTargetSet.has(alias)) {
      throw buildUntargetedRemovalError(change.id, alias, currentTargets);
    }
  }

  const nextTargets = [
    ...currentTargets.filter((alias) => !removeTargetSet.has(alias)),
    ...addTargets,
  ];

  if (nextTargets.length === 0) {
    throw buildLastTargetRemovalError(change.id);
  }

  const workspaceMetadata = await readWorkspaceMetadata(workspaceRoot);
  const registeredAliases = Object.keys(workspaceMetadata.repos).sort((left, right) => left.localeCompare(right));
  const registeredAliasSet = new Set(registeredAliases);
  const unknownTargets = addTargets.filter((alias) => !registeredAliasSet.has(alias));

  if (unknownTargets.length > 0) {
    throw new Error(formatUnknownTargetError(unknownTargets, registeredAliases));
  }

  for (const alias of [...removeTargets, ...addTargets]) {
    await assertSafeRepoLocalMutation(
      workspaceRoot,
      change.id,
      alias,
      addTargetSet.has(alias) ? 'add' : 'remove'
    );
  }

  for (const alias of addTargets) {
    if (await pathExists(path.join(change.path, 'targets', alias))) {
      throw buildDraftSliceCollisionError(alias);
    }
  }

  let backupRoot: string | null = null;
  const pendingRemovals: PendingRemoval[] = [];

  try {
    if (removeTargets.length > 0) {
      backupRoot = await fs.mkdtemp(path.join(change.path, '.workspace-target-set-'));
    }

    for (const alias of removeTargets) {
      const originalPath = path.join(change.path, 'targets', alias);
      let backupPath: string | null = null;

      if (await pathExists(originalPath)) {
        backupPath = path.join(backupRoot!, alias);
        await fs.rename(originalPath, backupPath);
      }

      pendingRemovals.push({ alias, originalPath, backupPath });
    }

    for (const alias of addTargets) {
      await scaffoldWorkspaceTargetDraft(change.path, alias);
    }

    writeChangeMetadata(
      change.path,
      {
        ...metadata,
        targets: nextTargets,
      },
      workspaceRoot
    );

    if (backupRoot) {
      await fs.rm(backupRoot, { recursive: true, force: true });
      backupRoot = null;
    }
  } catch (error) {
    await rollbackWorkspaceTargetMutation(change.path, addTargets, pendingRemovals, backupRoot);
    throw error;
  }

  return {
    workspaceRoot,
    change: {
      id: change.id,
      path: change.path,
    },
    targets: nextTargets,
    addedTargets: addTargets,
    removedTargets: removeTargets,
  };
}
