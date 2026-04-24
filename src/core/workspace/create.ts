import { promises as fs } from 'node:fs';
import path from 'node:path';
import { validateChangeName } from '../../utils/change-utils.js';
import { getGlobalDataDir } from '../global-config.js';
import {
  createWorkspaceLocalOverlay,
  createWorkspaceMetadata,
  getWorkspaceMetadataPaths,
  isWorkspaceRoot,
  readWorkspaceMetadata,
  writeWorkspaceLocalOverlay,
  writeWorkspaceMetadata,
} from './metadata.js';
import {
  ensureGitignoreEntries,
  ensureSetupDirectories,
  ensureWritableSetupTarget,
} from '../setup/bootstrap.js';

const MANAGED_WORKSPACES_DIR_NAME = 'workspaces';
const WORKSPACE_LOCAL_GITIGNORE_ENTRY = '/.openspec/local.yaml';
const WORKSPACE_OPEN_GITIGNORE_ENTRY = '/.openspec/workspace-open/';

export interface WorkspaceCreateResult {
  name: string;
  workspaceRoot: string;
  metadataPath: string;
  localOverlayPath: string;
  changesPath: string;
  gitignoreStatus: 'created' | 'updated' | 'exists';
}

export interface ManagedWorkspaceSummary {
  name: string;
  workspaceRoot: string;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function formatWorkspaceNameValidationError(message: string): string {
  if (message.startsWith('Change name')) {
    return message.replace('Change name', 'Workspace name');
  }

  return message;
}

export function getManagedWorkspacesRoot(): string {
  return path.join(getGlobalDataDir(), MANAGED_WORKSPACES_DIR_NAME);
}

export function resolveManagedWorkspaceRoot(name: string): string {
  return path.join(getManagedWorkspacesRoot(), name);
}

export async function listManagedWorkspaces(): Promise<ManagedWorkspaceSummary[]> {
  const managedWorkspacesRoot = getManagedWorkspacesRoot();

  if (!await pathExists(managedWorkspacesRoot)) {
    return [];
  }

  const entries = await fs.readdir(managedWorkspacesRoot, { withFileTypes: true });
  const workspaces = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const workspaceRoot = path.join(managedWorkspacesRoot, entry.name);

      if (!isWorkspaceRoot(workspaceRoot)) {
        return null;
      }

      const metadata = await readWorkspaceMetadata(workspaceRoot);

      return {
        name: metadata.name,
        workspaceRoot,
      } satisfies ManagedWorkspaceSummary;
    }));

  return workspaces
    .filter((workspace): workspace is ManagedWorkspaceSummary => workspace !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function resolveManagedWorkspaceByName(name: string): Promise<ManagedWorkspaceSummary> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Workspace name cannot be empty.');
  }

  const workspaceRoot = resolveManagedWorkspaceRoot(trimmedName);

  if (isWorkspaceRoot(workspaceRoot)) {
    const metadata = await readWorkspaceMetadata(workspaceRoot);
    return {
      name: metadata.name,
      workspaceRoot,
    };
  }

  const managedWorkspaces = await listManagedWorkspaces();
  const availableNames = managedWorkspaces.map((workspace) => workspace.name);

  if (availableNames.length === 0) {
    throw new Error(
      `Managed workspace '${trimmedName}' was not found. No managed workspaces exist yet. Create one with 'openspec workspace setup' or 'openspec workspace create <name>'.`
    );
  }

  throw new Error(
    `Managed workspace '${trimmedName}' was not found. Available workspaces: ${availableNames.join(', ')}.`
  );
}

export async function createManagedWorkspaceRoot(name: string): Promise<WorkspaceCreateResult> {
  const trimmedName = name.trim();
  const validation = validateChangeName(trimmedName);

  if (!validation.valid) {
    throw new Error(
      `Invalid workspace name '${name}': ${formatWorkspaceNameValidationError(validation.error ?? 'Invalid name')}`
    );
  }

  const workspaceRoot = await ensureWritableSetupTarget(resolveManagedWorkspaceRoot(trimmedName));

  if (await pathExists(workspaceRoot)) {
    throw new Error(`Workspace '${trimmedName}' already exists at ${workspaceRoot}. Choose a different name or remove the existing directory.`);
  }

  const { metadataDir, metadataPath, localOverlayPath, changesPath } = getWorkspaceMetadataPaths(workspaceRoot);

  await ensureSetupDirectories([
    getManagedWorkspacesRoot(),
    workspaceRoot,
    metadataDir,
    changesPath,
  ]);

  await writeWorkspaceMetadata(workspaceRoot, createWorkspaceMetadata(trimmedName));
  await writeWorkspaceLocalOverlay(workspaceRoot, createWorkspaceLocalOverlay());

  const gitignoreStatus = await ensureGitignoreEntries(workspaceRoot, [
    WORKSPACE_LOCAL_GITIGNORE_ENTRY,
    WORKSPACE_OPEN_GITIGNORE_ENTRY,
  ]);

  return {
    name: trimmedName,
    workspaceRoot,
    metadataPath,
    localOverlayPath,
    changesPath,
    gitignoreStatus,
  };
}
