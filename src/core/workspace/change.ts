import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readChangeMetadata } from '../../utils/change-metadata.js';
import { validateChangeName } from '../../utils/change-utils.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { getChangePath } from './metadata.js';

export interface ResolvedWorkspaceChange {
  id: string;
  path: string;
  schema: string;
  targets: string[];
}

export async function listAvailableWorkspaceChanges(workspaceRoot: string): Promise<string[]> {
  const changesRoot = path.join(workspaceRoot, 'changes');

  try {
    const entries = await fs.readdir(changesRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export async function resolveWorkspaceChange(
  workspaceRoot: string,
  changeName: string
): Promise<ResolvedWorkspaceChange> {
  const validation = validateChangeName(changeName);
  if (!validation.valid) {
    throw new Error(`Invalid change name '${changeName}': ${validation.error ?? 'Invalid change name'}`);
  }

  const changePath = getChangePath(workspaceRoot, changeName);
  let changeStats;

  try {
    changeStats = await fs.stat(changePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    const availableChanges = await listAvailableWorkspaceChanges(workspaceRoot);
    if (availableChanges.length === 0) {
      throw new Error(
        `Workspace change '${changeName}' not found. No workspace changes exist yet. Create one with 'openspec new change ${changeName} --targets <a,b,c>'.`
      );
    }

    throw new Error(
      `Workspace change '${changeName}' not found. Available workspace changes:\n  ${availableChanges.join('\n  ')}`
    );
  }

  if (!changeStats.isDirectory()) {
    throw new Error(`Workspace change '${changeName}' exists at ${changePath} but is not a directory.`);
  }

  const metadata = readChangeMetadata(changePath, workspaceRoot);
  if (!metadata) {
    throw new Error(
      `Workspace change '${changeName}' is missing required metadata at ${path.join(changePath, '.openspec.yaml')}.`
    );
  }

  const targets = metadata.targets ?? [];
  if (targets.length === 0) {
    throw new Error(
      `Workspace change '${changeName}' does not define any target repos. Restore the target set with 'openspec workspace targets ${changeName} --add <a,b,c>'.`
    );
  }

  return {
    id: changeName,
    path: FileSystemUtils.canonicalizeExistingPath(changePath),
    schema: metadata.schema,
    targets,
  };
}
