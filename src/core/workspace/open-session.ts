import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileSystemUtils } from '../../utils/file-system.js';
import type { WorkspaceOpenMode } from './open.js';

const WORKSPACE_OPEN_STATE_PATH = path.join('.openspec', 'workspace-open');
const WORKSPACE_OPEN_SESSIONS_DIR = path.join(WORKSPACE_OPEN_STATE_PATH, 'sessions');
const WORKSPACE_OPEN_UPGRADES_DIR = path.join(WORKSPACE_OPEN_STATE_PATH, 'upgrades');

export const WORKSPACE_OPEN_SESSION_TOKEN_ENV = 'OPENSPEC_WORKSPACE_OPEN_SESSION_TOKEN';
export const WORKSPACE_OPEN_MODE_ENV = 'OPENSPEC_WORKSPACE_OPEN_MODE';
export const WORKSPACE_OPEN_AGENT_ENV = 'OPENSPEC_WORKSPACE_OPEN_AGENT';
export const WORKSPACE_OPEN_WORKSPACE_ROOT_ENV = 'OPENSPEC_WORKSPACE_OPEN_WORKSPACE_ROOT';

export interface WorkspaceOpenSessionState {
  token: string;
  workspaceRoot: string;
  agent: string;
  mode: WorkspaceOpenMode;
  changeId?: string;
  startedAt: string;
}

export interface WorkspaceOpenUpgradeRequest {
  workspaceRoot: string;
  changeId: string;
  requestedAt: string;
}

function getSessionDirPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, WORKSPACE_OPEN_SESSIONS_DIR);
}

function getUpgradeDirPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, WORKSPACE_OPEN_UPGRADES_DIR);
}

function getSessionFilePath(workspaceRoot: string, token: string): string {
  return path.join(getSessionDirPath(workspaceRoot), `${token}.json`);
}

function getUpgradeFilePath(workspaceRoot: string, token: string): string {
  return path.join(getUpgradeDirPath(workspaceRoot), `${token}.json`);
}

export async function createWorkspaceOpenSessionState(
  workspaceRoot: string,
  agent: string,
  mode: WorkspaceOpenMode,
  changeId?: string
): Promise<WorkspaceOpenSessionState> {
  const token = randomUUID();
  const state: WorkspaceOpenSessionState = {
    token,
    workspaceRoot,
    agent,
    mode,
    ...(changeId ? { changeId } : {}),
    startedAt: new Date().toISOString(),
  };

  await FileSystemUtils.createDirectory(getSessionDirPath(workspaceRoot));
  await fs.writeFile(
    getSessionFilePath(workspaceRoot, token),
    JSON.stringify(state, null, 2) + '\n',
    'utf-8'
  );

  return state;
}

export function buildWorkspaceOpenSessionEnv(state: WorkspaceOpenSessionState): NodeJS.ProcessEnv {
  return {
    [WORKSPACE_OPEN_SESSION_TOKEN_ENV]: state.token,
    [WORKSPACE_OPEN_MODE_ENV]: state.mode,
    [WORKSPACE_OPEN_AGENT_ENV]: state.agent,
    [WORKSPACE_OPEN_WORKSPACE_ROOT_ENV]: state.workspaceRoot,
  };
}

export async function recordWorkspaceOpenUpgradeRequest(
  workspaceRoot: string,
  token: string,
  changeId: string
): Promise<void> {
  const request: WorkspaceOpenUpgradeRequest = {
    workspaceRoot,
    changeId,
    requestedAt: new Date().toISOString(),
  };

  await FileSystemUtils.createDirectory(getUpgradeDirPath(workspaceRoot));
  await fs.writeFile(
    getUpgradeFilePath(workspaceRoot, token),
    JSON.stringify(request, null, 2) + '\n',
    'utf-8'
  );
}

export async function consumeWorkspaceOpenUpgradeRequest(
  workspaceRoot: string,
  token: string
): Promise<WorkspaceOpenUpgradeRequest | null> {
  const requestPath = getUpgradeFilePath(workspaceRoot, token);

  try {
    const rawRequest = await fs.readFile(requestPath, 'utf-8');
    await fs.rm(requestPath, { force: true });
    return JSON.parse(rawRequest) as WorkspaceOpenUpgradeRequest;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

export async function clearWorkspaceOpenSessionState(
  workspaceRoot: string,
  token: string
): Promise<void> {
  await Promise.all([
    fs.rm(getSessionFilePath(workspaceRoot, token), { force: true }),
    fs.rm(getUpgradeFilePath(workspaceRoot, token), { force: true }),
  ]);
}
