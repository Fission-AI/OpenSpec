import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  getWorkspaceChangesDir,
  getWorkspaceSharedStatePath,
  parseWorkspaceSharedState,
  type WorkspaceSharedState,
} from './workspace/index.js';
import { FileSystemUtils } from '../utils/file-system.js';

export type PlanningHomeKind = 'repo' | 'workspace';

export interface PlanningHome {
  kind: PlanningHomeKind;
  root: string;
  changesDir: string;
  defaultSchema: string;
  workspace?: {
    name: string;
    links: string[];
  };
}

export interface ResolvePlanningHomeOptions {
  startPath?: string;
  allowImplicitRepoRoot?: boolean;
}

const REPO_DEFAULT_SCHEMA = 'spec-driven';
const WORKSPACE_DEFAULT_SCHEMA = 'workspace-planning';

function pathExistsAsDirectory(candidatePath: string): boolean {
  try {
    return fs.statSync(candidatePath).isDirectory();
  } catch {
    return false;
  }
}

function pathExistsAsFile(candidatePath: string): boolean {
  try {
    return fs.statSync(candidatePath).isFile();
  } catch {
    return false;
  }
}

function getSearchStartDirectory(startPath: string): string {
  const resolved = path.resolve(startPath);

  try {
    const stats = fs.statSync(resolved);
    return stats.isDirectory() ? resolved : path.dirname(resolved);
  } catch {
    return resolved;
  }
}

function findNearestAncestor(startPath: string, predicate: (dirPath: string) => boolean): string | null {
  let currentDir = getSearchStartDirectory(startPath);

  while (true) {
    if (predicate(currentDir)) {
      return FileSystemUtils.canonicalizeExistingPath(currentDir);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export function findWorkspacePlanningRootSync(startPath = process.cwd()): string | null {
  return findNearestAncestor(startPath, (dirPath) =>
    pathExistsAsFile(getWorkspaceSharedStatePath(dirPath))
  );
}

export function findRepoPlanningRootSync(startPath = process.cwd()): string | null {
  return findNearestAncestor(startPath, (dirPath) =>
    pathExistsAsDirectory(path.join(dirPath, 'openspec'))
  );
}

function isSameOrDescendant(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function countPathSegments(candidatePath: string): number {
  return path.resolve(candidatePath).split(path.sep).filter(Boolean).length;
}

function isWindowsLikePath(candidatePath: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(candidatePath) || candidatePath.startsWith('\\\\');
}

function relativePlanningPath(fromPath: string, toPath: string): string {
  if (isWindowsLikePath(fromPath) || isWindowsLikePath(toPath)) {
    return path.win32.relative(path.win32.normalize(fromPath), path.win32.normalize(toPath));
  }

  return path.posix.relative(fromPath.replace(/\\/g, '/'), toPath.replace(/\\/g, '/'));
}

function readWorkspaceSharedStateSync(workspaceRoot: string): WorkspaceSharedState | null {
  try {
    return parseWorkspaceSharedState(
      fs.readFileSync(getWorkspaceSharedStatePath(workspaceRoot), 'utf-8')
    );
  } catch {
    return null;
  }
}

function workspacePlanningHome(workspaceRoot: string): PlanningHome {
  const sharedState = readWorkspaceSharedStateSync(workspaceRoot);

  return {
    kind: 'workspace',
    root: workspaceRoot,
    changesDir: getWorkspaceChangesDir(workspaceRoot),
    defaultSchema: WORKSPACE_DEFAULT_SCHEMA,
    workspace: {
      name: sharedState?.name ?? path.basename(workspaceRoot),
      links: Object.keys(sharedState?.links ?? {}).sort((a, b) => a.localeCompare(b)),
    },
  };
}

function repoPlanningHome(repoRoot: string): PlanningHome {
  return {
    kind: 'repo',
    root: repoRoot,
    changesDir: path.join(repoRoot, 'openspec', 'changes'),
    defaultSchema: REPO_DEFAULT_SCHEMA,
  };
}

export function resolveCurrentPlanningHomeSync(
  options: ResolvePlanningHomeOptions = {}
): PlanningHome {
  const startPath = options.startPath ?? process.cwd();
  const searchStart = getSearchStartDirectory(startPath);
  const workspaceRoot = findWorkspacePlanningRootSync(searchStart);
  const repoRoot = findRepoPlanningRootSync(searchStart);

  if (workspaceRoot && isSameOrDescendant(workspaceRoot, searchStart)) {
    if (!repoRoot || countPathSegments(workspaceRoot) >= countPathSegments(repoRoot)) {
      return workspacePlanningHome(workspaceRoot);
    }
  }

  if (repoRoot) {
    return repoPlanningHome(repoRoot);
  }

  if (options.allowImplicitRepoRoot === false) {
    throw new Error('No OpenSpec planning home found from the current directory.');
  }

  return repoPlanningHome(FileSystemUtils.canonicalizeExistingPath(searchStart));
}

export function getChangeDir(planningHome: PlanningHome, changeName: string): string {
  return FileSystemUtils.joinPath(planningHome.changesDir, changeName);
}

export function formatChangeLocation(planningHome: PlanningHome, changeName: string): string {
  const changeDir = getChangeDir(planningHome, changeName);
  const relative = relativePlanningPath(planningHome.root, changeDir);
  return relative.length > 0 ? relative : changeDir;
}
