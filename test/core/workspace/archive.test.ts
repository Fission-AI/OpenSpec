import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ArchiveCommand } from '../../../src/core/archive.js';
import { applyWorkspaceChange } from '../../../src/core/workspace/apply.js';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import { getWorkspaceChangeStatus } from '../../../src/core/workspace/status.js';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

async function runArchive(
  cwd: string,
  changeName: string,
  options: { workspace?: boolean } = {}
): Promise<void> {
  const command = new ArchiveCommand();
  const originalCwd = process.cwd();
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  try {
    process.chdir(cwd);
    await command.execute(changeName, {
      yes: true,
      skipSpecs: true,
      noValidate: true,
      ...options,
    });
  } finally {
    process.chdir(originalCwd);
    logSpy.mockRestore();
  }
}

describe('workspace archive semantics', () => {
  it('keeps repo-local archive repo-local until the workspace archive is explicit', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-archive', {
      description: 'Complete and archive one repo locally before the workspace is hard-done.',
      targets: 'app',
    });
    await fs.writeFile(
      sandbox.workspacePath('changes', 'shared-archive', 'tasks', 'coordination.md'),
      '## Coordination Tasks\n- [x] Confirm rollout sequencing\n- [x] Finalize repo drafts\n',
      'utf-8'
    );

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-archive',
      repo: 'app',
    });
    await fs.writeFile(
      sandbox.repoPath('app', 'openspec', 'changes', 'shared-archive', 'tasks.md'),
      '## app Tasks\n- [x] Implement app changes\n- [x] Update app specs\n',
      'utf-8'
    );

    await runArchive(sandbox.repoPaths.app, 'shared-archive');

    const beforeWorkspaceArchive = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-archive');
    expect(beforeWorkspaceArchive.change.state).toBe('soft-done');
    expect(readChangeMetadata(
      sandbox.workspacePath('changes', 'shared-archive'),
      sandbox.workspaceRoot
    )?.workspaceArchivedAt).toBeUndefined();

    const repoArchiveEntries = await fs.readdir(
      sandbox.repoPath('app', 'openspec', 'changes', 'archive')
    );
    expect(repoArchiveEntries.some((entry) => entry.endsWith('-shared-archive'))).toBe(true);
    await expect(fs.access(
      sandbox.repoPath('app', 'openspec', 'changes', 'shared-archive')
    )).rejects.toThrow();

    await runArchive(sandbox.workspaceRoot, 'shared-archive', { workspace: true });

    const afterWorkspaceArchive = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-archive');
    expect(afterWorkspaceArchive.change.state).toBe('hard-done');

    const metadata = readChangeMetadata(
      sandbox.workspacePath('changes', 'shared-archive'),
      sandbox.workspaceRoot
    );
    expect(typeof metadata?.workspaceArchivedAt).toBe('string');
    await expect(fs.access(
      sandbox.workspacePath('changes', 'shared-archive')
    )).resolves.toBeUndefined();
  });

  it('rejects workspace archive before the workspace reaches soft-done', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'not-ready', {
      description: 'Do not allow early top-level completion.',
      targets: 'app,api',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'not-ready',
      repo: 'app',
    });

    await expect(
      runArchive(sandbox.workspaceRoot, 'not-ready', { workspace: true })
    ).rejects.toThrow(
      "Workspace change 'not-ready' is 'in-progress'. Reach 'soft-done' before running 'openspec archive not-ready --workspace'."
    );

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'not-ready');
    expect(status.change.state).toBe('in-progress');
    expect(readChangeMetadata(
      sandbox.workspacePath('changes', 'not-ready'),
      sandbox.workspaceRoot
    )?.workspaceArchivedAt).toBeUndefined();
  });
});
