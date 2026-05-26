import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system.js';
import {
  getWorkspaceChangesDir,
  getWorkspaceViewStatePath,
  parseWorkspaceViewState,
  serializeWorkspaceViewState,
  type WorkspaceViewState,
} from './foundation.js';
import {
  getWorkspaceLegacyLocalStatePath,
  getWorkspaceLegacySharedStatePath,
  parseWorkspaceLocalState,
  parseWorkspaceSharedState,
  workspaceStatePartsToViewState,
  type WorkspaceLocalState,
} from './legacy-state.js';

const fs = nodeFs.promises;

async function pathIsFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function pathIsDirectory(dirPath: string): Promise<boolean> {
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

function pathExistsAsFile(filePath: string): boolean {
  try {
    return nodeFs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

async function getSearchStartDirectory(startPath: string): Promise<string> {
  const resolvedStart = path.resolve(startPath);

  try {
    const stats = await fs.stat(resolvedStart);
    const searchStart = stats.isDirectory() ? resolvedStart : path.dirname(resolvedStart);
    return FileSystemUtils.canonicalizeExistingPath(searchStart);
  } catch {
    return resolvedStart;
  }
}

export async function isWorkspaceRoot(candidateRoot: string): Promise<boolean> {
  return (
    (await pathIsFile(getWorkspaceViewStatePath(candidateRoot))) ||
    (await pathIsFile(getWorkspaceLegacySharedStatePath(candidateRoot)))
  );
}

export async function findWorkspaceRoot(startPath = process.cwd()): Promise<string | null> {
  let currentDir = await getSearchStartDirectory(startPath);

  while (true) {
    if (await isWorkspaceRoot(currentDir)) {
      return FileSystemUtils.canonicalizeExistingPath(currentDir);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export function workspaceStateFileExistsSync(workspaceRoot: string): boolean {
  return (
    pathExistsAsFile(getWorkspaceViewStatePath(workspaceRoot)) ||
    pathExistsAsFile(getWorkspaceLegacySharedStatePath(workspaceRoot))
  );
}

export async function readWorkspaceViewState(workspaceRoot: string): Promise<WorkspaceViewState> {
  const viewStatePath = getWorkspaceViewStatePath(workspaceRoot);

  if (await pathIsFile(viewStatePath)) {
    return parseWorkspaceViewState(await fs.readFile(viewStatePath, 'utf-8'));
  }

  const legacySharedState = parseWorkspaceSharedState(
    await fs.readFile(getWorkspaceLegacySharedStatePath(workspaceRoot), 'utf-8')
  );
  let legacyLocalState: WorkspaceLocalState | null = null;

  try {
    legacyLocalState = parseWorkspaceLocalState(
      await fs.readFile(getWorkspaceLegacyLocalStatePath(workspaceRoot), 'utf-8')
    );
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  return workspaceStatePartsToViewState(legacySharedState, legacyLocalState);
}

export function readWorkspaceViewStateSync(workspaceRoot: string): WorkspaceViewState | null {
  const viewStatePath = getWorkspaceViewStatePath(workspaceRoot);

  if (pathExistsAsFile(viewStatePath)) {
    return parseWorkspaceViewState(nodeFs.readFileSync(viewStatePath, 'utf-8'));
  }

  const legacySharedPath = getWorkspaceLegacySharedStatePath(workspaceRoot);
  if (!pathExistsAsFile(legacySharedPath)) {
    return null;
  }

  const legacySharedState = parseWorkspaceSharedState(
    nodeFs.readFileSync(legacySharedPath, 'utf-8')
  );
  const legacyLocalPath = getWorkspaceLegacyLocalStatePath(workspaceRoot);
  const legacyLocalState = pathExistsAsFile(legacyLocalPath)
    ? parseWorkspaceLocalState(nodeFs.readFileSync(legacyLocalPath, 'utf-8'))
    : null;

  return workspaceStatePartsToViewState(legacySharedState, legacyLocalState);
}

export async function readOptionalWorkspaceViewState(
  workspaceRoot: string
): Promise<WorkspaceViewState | null> {
  try {
    return await readWorkspaceViewState(workspaceRoot);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function writeWorkspaceViewState(
  workspaceRoot: string,
  state: WorkspaceViewState
): Promise<void> {
  await FileSystemUtils.writeFile(
    getWorkspaceViewStatePath(workspaceRoot),
    serializeWorkspaceViewState(state)
  );
}

export async function workspaceChangesDirExists(workspaceRoot: string): Promise<boolean> {
  return pathIsDirectory(getWorkspaceChangesDir(workspaceRoot));
}
