import { expect } from 'vitest';
import * as fs from 'node:fs';

import { getWorkspaceCodeWorkspacePath } from '../../src/core/workspace/index.js';

/**
 * Workspace commands canonicalize existing filesystem paths before storing,
 * reporting, or passing them to openers. On Windows, GitHub runners can expose
 * temp paths through short aliases such as RUNNER~1 while Node's native
 * realpath expands them to the long user path. Use these helpers for expected
 * workspace command paths instead of comparing raw mkdtemp/os.tmpdir strings.
 */
export function expectedExistingPath(existingPath: string): string {
  return process.platform === 'win32' ? fs.realpathSync.native(existingPath) : existingPath;
}

function equivalentExistingPath(existingPath: string): string {
  return fs.realpathSync.native(existingPath);
}

export function expectedWorkspaceCodeWorkspacePath(
  workspaceRoot: string,
  workspaceName: string
): string {
  return getWorkspaceCodeWorkspacePath(expectedExistingPath(workspaceRoot), workspaceName);
}

export function expectedWorkspaceFolders<T extends { path: string }>(folders: T[]): T[] {
  return folders.map((folder) =>
    folder.path === '.'
      ? folder
      : {
          ...folder,
          path: expectedExistingPath(folder.path),
        }
  );
}

type WorkspaceLaunchArgExpectation =
  | string
  | {
      existingPath: string;
    }
  | {
      workspaceFile: {
        root: string;
        name: string;
      };
    };

function expectedWorkspaceLaunchArg(arg: WorkspaceLaunchArgExpectation): string {
  if (typeof arg === 'string') {
    return arg;
  }

  if ('existingPath' in arg) {
    return expectedExistingPath(arg.existingPath);
  }

  return expectedWorkspaceCodeWorkspacePath(arg.workspaceFile.root, arg.workspaceFile.name);
}

export function expectedWorkspaceLaunchArgs(
  args: WorkspaceLaunchArgExpectation[]
): string[] {
  return args.map(expectedWorkspaceLaunchArg);
}

export function expectWorkspaceLaunchLog(
  actual: { cwd: string; args: string[] },
  expected: { cwd: string; args: WorkspaceLaunchArgExpectation[] }
): void {
  expect(equivalentExistingPath(actual.cwd)).toBe(equivalentExistingPath(expected.cwd));
  expect(actual.args).toEqual(expectedWorkspaceLaunchArgs(expected.args));
}
