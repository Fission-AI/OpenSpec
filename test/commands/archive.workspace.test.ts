import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { ArchiveCommand } from '../../src/core/archive.js';
import { applyWorkspaceChange } from '../../src/core/workspace/apply.js';
import { createWorkspaceChange } from '../../src/core/workspace/change-create.js';
import { statusCommand } from '../../src/commands/workflow/status.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

async function runArchiveCommand(
  cwd: string,
  changeName: string,
  options: { workspace?: boolean } = {}
): Promise<void> {
  const command = new ArchiveCommand();
  const originalCwd = process.cwd();

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
  }
}

async function runStatusCommand(
  cwd: string,
  options: { change: string; json?: boolean }
): Promise<void> {
  const originalCwd = process.cwd();

  try {
    process.chdir(cwd);
    await statusCommand(options);
  } finally {
    process.chdir(originalCwd);
  }
}

async function writeCoordinationTasks(
  sandbox: WorkspaceSandbox,
  changeId: string,
  content: string
): Promise<void> {
  await fs.writeFile(
    sandbox.workspacePath('changes', changeId, 'tasks', 'coordination.md'),
    content,
    'utf-8'
  );
}

async function writeRepoTasks(
  sandbox: WorkspaceSandbox,
  alias: string,
  changeId: string,
  content: string
): Promise<void> {
  await fs.writeFile(
    sandbox.repoPath(alias, 'openspec', 'changes', changeId, 'tasks.md'),
    content,
    'utf-8'
  );
}

describe('workspace archive command integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
    vi.restoreAllMocks();
  });

  it('keeps overall workspace status in-progress when one repo archives and another repo is still in-progress', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'staggered-archive', {
      description: 'Archive one target while another target is still active.',
      targets: 'app,api',
    });
    await writeCoordinationTasks(
      sandbox,
      'staggered-archive',
      '## Coordination Tasks\n- [x] Confirm rollout sequencing\n- [x] Finalize repo drafts\n'
    );

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'staggered-archive',
      repo: 'app',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'staggered-archive',
      repo: 'api',
    });

    await writeRepoTasks(
      sandbox,
      'app',
      'staggered-archive',
      '## app Tasks\n- [x] Implement app changes\n- [x] Update app specs\n'
    );
    await writeRepoTasks(
      sandbox,
      'api',
      'staggered-archive',
      '## api Tasks\n- [x] Implement api changes\n- [ ] Finish api verification\n'
    );

    await runArchiveCommand(sandbox.repoPaths.app, 'staggered-archive');

    await expect(
      runArchiveCommand(sandbox.workspaceRoot, 'staggered-archive', { workspace: true })
    ).rejects.toThrow(
      "Workspace change 'staggered-archive' is 'in-progress'. Reach 'soft-done' before running 'openspec archive staggered-archive --workspace'."
    );

    consoleLogSpy.mockClear();
    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'staggered-archive',
      json: true,
    });

    const status = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(status).toEqual({
      change: {
        id: 'staggered-archive',
        state: 'in-progress',
      },
      coordination: {
        state: 'complete',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      targets: [
        {
          alias: 'api',
          state: 'in-progress',
          source: 'repo',
          tasks: { completed: 1, total: 2 },
          problems: [],
        },
        {
          alias: 'app',
          state: 'archived',
          source: 'repo',
          tasks: { completed: 2, total: 2 },
          problems: [],
        },
      ],
    });
  });

  it('reports soft-done before an explicit workspace archive marks the change hard-done', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-hard-done', {
      description: 'Reach soft-done before explicit workspace archive.',
      targets: 'app,api',
    });
    await writeCoordinationTasks(
      sandbox,
      'shared-hard-done',
      '## Coordination Tasks\n- [x] Confirm rollout sequencing\n- [x] Finalize repo drafts\n'
    );

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-hard-done',
      repo: 'app',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-hard-done',
      repo: 'api',
    });

    await writeRepoTasks(
      sandbox,
      'app',
      'shared-hard-done',
      '## app Tasks\n- [x] Implement app changes\n- [x] Update app specs\n'
    );
    await writeRepoTasks(
      sandbox,
      'api',
      'shared-hard-done',
      '## api Tasks\n- [x] Implement api changes\n- [x] Update api specs\n'
    );

    await runArchiveCommand(sandbox.repoPaths.app, 'shared-hard-done');

    consoleLogSpy.mockClear();
    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'shared-hard-done',
      json: true,
    });

    const beforeArchiveStatus = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(beforeArchiveStatus).toEqual({
      change: {
        id: 'shared-hard-done',
        state: 'soft-done',
      },
      coordination: {
        state: 'complete',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      targets: [
        {
          alias: 'api',
          state: 'complete',
          source: 'repo',
          tasks: { completed: 2, total: 2 },
          problems: [],
        },
        {
          alias: 'app',
          state: 'archived',
          source: 'repo',
          tasks: { completed: 2, total: 2 },
          problems: [],
        },
      ],
    });

    consoleLogSpy.mockClear();
    await runArchiveCommand(sandbox.workspaceRoot, 'shared-hard-done', { workspace: true });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Workspace change 'shared-hard-done' marked hard-done")
    );

    consoleLogSpy.mockClear();
    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'shared-hard-done',
      json: true,
    });

    const afterArchiveStatus = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(afterArchiveStatus.change).toEqual({
      id: 'shared-hard-done',
      state: 'hard-done',
    });
    expect(afterArchiveStatus.coordination).toEqual({
      state: 'complete',
      tasks: { completed: 2, total: 2 },
      problems: [],
    });
    expect(afterArchiveStatus.targets).toEqual([
      {
        alias: 'api',
        state: 'complete',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'archived',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
    ]);
  });
});
