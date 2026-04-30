import { readChangeMetadata, writeChangeMetadata } from '../../utils/change-metadata.js';
import { resolveWorkspaceChange } from './change.js';
import { resolveWorkspaceRoot } from './registry.js';
import { getWorkspaceChangeStatus } from './status.js';

export interface ArchiveWorkspaceChangeResult {
  workspaceRoot: string;
  changeId: string;
  workspaceArchivedAt: string;
  alreadyArchived: boolean;
}

function getWorkspaceArchiveTimestamp(changePath: string, workspaceRoot: string): string | null {
  const metadata = readChangeMetadata(changePath, workspaceRoot);
  const archivedAt = metadata?.workspaceArchivedAt;

  return typeof archivedAt === 'string' && archivedAt.trim().length > 0
    ? archivedAt
    : null;
}

export async function archiveWorkspaceChange(
  changeName: string,
  options: { cwd?: string } = {}
): Promise<ArchiveWorkspaceChangeResult> {
  const workspaceRoot = await resolveWorkspaceRoot(options.cwd ?? process.cwd());
  const change = await resolveWorkspaceChange(workspaceRoot, changeName);
  const existingArchivedAt = getWorkspaceArchiveTimestamp(change.path, workspaceRoot);

  if (existingArchivedAt) {
    return {
      workspaceRoot,
      changeId: change.id,
      workspaceArchivedAt: existingArchivedAt,
      alreadyArchived: true,
    };
  }

  const status = await getWorkspaceChangeStatus(workspaceRoot, change.id);
  if (status.change.state !== 'soft-done') {
    throw new Error(
      `Workspace change '${change.id}' is '${status.change.state}'. Reach 'soft-done' before running 'openspec archive ${change.id} --workspace'.`
    );
  }

  const metadata = readChangeMetadata(change.path, workspaceRoot);
  if (!metadata || !metadata.targets || metadata.targets.length === 0) {
    throw new Error(
      `Workspace archive only applies to targeted workspace changes. '${change.id}' does not define any workspace targets.`
    );
  }

  const workspaceArchivedAt = new Date().toISOString();
  writeChangeMetadata(
    change.path,
    {
      ...metadata,
      workspaceArchivedAt,
    },
    workspaceRoot
  );

  return {
    workspaceRoot,
    changeId: change.id,
    workspaceArchivedAt,
    alreadyArchived: false,
  };
}
