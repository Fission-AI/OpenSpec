import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ArchiveCommand } from '../../../src/core/archive.js';
import { applyWorkspaceChange } from '../../../src/core/workspace/apply.js';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import {
  deriveCoordinationState,
  deriveTargetState,
  deriveWorkspaceChangeState,
  getWorkspaceChangeStatus,
} from '../../../src/core/workspace/status.js';
import {
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  writeWorkspaceLocalOverlay,
  writeWorkspaceMetadata,
} from '../../../src/core/workspace/metadata.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(
  fixture: 'happy-path' | 'dirty' = 'happy-path'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

async function addRepoAlias(sandbox: WorkspaceSandbox, alias: string): Promise<string> {
  const repoRoot = path.join(sandbox.reposRoot, alias);
  await fs.mkdir(path.join(repoRoot, 'openspec', 'changes'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'README.md'), `# ${alias} fixture\n`, 'utf-8');

  const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
  metadata.repos[alias] = { description: `${alias} repo` };
  await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

  const overlay = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);
  overlay.repoPaths[alias] = repoRoot;
  await writeWorkspaceLocalOverlay(sandbox.workspaceRoot, overlay);

  return repoRoot;
}

async function archiveRepoLocalChange(repoRoot: string, changeId: string): Promise<void> {
  const archiveCommand = new ArchiveCommand();
  const originalCwd = process.cwd();

  try {
    process.chdir(repoRoot);
    await archiveCommand.execute(changeId, {
      yes: true,
      skipSpecs: true,
      noValidate: true,
    });
  } finally {
    process.chdir(originalCwd);
  }
}

describe('workspace status derivation', () => {
  it('derives coordination and target lifecycle states from task counts', () => {
    expect(deriveCoordinationState({ completed: 0, total: 2 })).toBe('planned');
    expect(deriveCoordinationState({ completed: 1, total: 2 })).toBe('in-progress');
    expect(deriveCoordinationState({ completed: 2, total: 2 })).toBe('complete');

    expect(deriveTargetState({ completed: 0, total: 2 })).toBe('materialized');
    expect(deriveTargetState({ completed: 1, total: 2 })).toBe('in-progress');
    expect(deriveTargetState({ completed: 2, total: 2 })).toBe('complete');
  });

  it('derives workspace roll-up states including archived repo targets', () => {
    const plannedTarget = {
      alias: 'ops',
      state: 'planned' as const,
      source: 'workspace' as const,
      tasks: { completed: 0, total: 2 },
      problems: [],
    };
    const archivedDoneTarget = {
      alias: 'app',
      state: 'archived' as const,
      source: 'repo' as const,
      tasks: { completed: 2, total: 2 },
      problems: [],
    };
    const archivedIncompleteTarget = {
      alias: 'app',
      state: 'archived' as const,
      source: 'repo' as const,
      tasks: { completed: 1, total: 2 },
      problems: [],
    };
    const blockedTarget = {
      alias: 'docs',
      state: 'blocked' as const,
      source: 'workspace' as const,
      tasks: { completed: 0, total: 2 },
      problems: ['repo alias is stale'],
    };

    expect(deriveWorkspaceChangeState(
      {
        state: 'planned',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      [plannedTarget],
      false
    )).toBe('planned');

    expect(deriveWorkspaceChangeState(
      {
        state: 'complete',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      [archivedDoneTarget],
      false
    )).toBe('soft-done');

    expect(deriveWorkspaceChangeState(
      {
        state: 'complete',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      [archivedIncompleteTarget],
      false
    )).toBe('in-progress');

    expect(deriveWorkspaceChangeState(
      {
        state: 'planned',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      [blockedTarget],
      false
    )).toBe('blocked');

    expect(deriveWorkspaceChangeState(
      {
        state: 'complete',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      [archivedDoneTarget],
      true
    )).toBe('hard-done');
  });
});

describe('workspace status roll-up', () => {
  it('reports planned, materialized, archived, and blocked targets in one workspace', async () => {
    const sandbox = await createSandbox();
    await addRepoAlias(sandbox, 'ops');

    await createWorkspaceChange(sandbox.workspaceRoot, 'multi-surface', {
      description: 'Exercise archived, materialized, blocked, and planned targets together.',
      targets: 'app,api,docs,ops',
    });

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'multi-surface',
      repo: 'app',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'multi-surface',
      repo: 'api',
    });
    const archiveLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await archiveRepoLocalChange(sandbox.repoPaths.app, 'multi-surface');
    } finally {
      archiveLogSpy.mockRestore();
    }
    await fs.rm(sandbox.repoPaths.docs, { recursive: true, force: true });

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'multi-surface');

    expect(status.change).toEqual({
      id: 'multi-surface',
      state: 'blocked',
    });
    expect(status.coordination).toEqual({
      state: 'planned',
      tasks: { completed: 0, total: 2 },
      problems: [],
    });
    expect(status.targets).toEqual([
      {
        alias: 'api',
        state: 'materialized',
        source: 'repo',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'archived',
        source: 'repo',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'docs',
        state: 'blocked',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: ["repo alias 'docs' points to a missing repo path"],
      },
      {
        alias: 'ops',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
    ]);
  });

  it('distinguishes planning-only targets from materialized targets with stable JSON', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      description: 'Refresh shared contracts across app and api.',
      targets: 'app,api',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      repo: 'app',
    });

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-refresh');
    const serialized = JSON.stringify(status);

    expect(status).toEqual({
      change: {
        id: 'shared-refresh',
        state: 'in-progress',
      },
      coordination: {
        state: 'planned',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      targets: [
        {
          alias: 'api',
          state: 'planned',
          source: 'workspace',
          tasks: { completed: 0, total: 2 },
          problems: [],
        },
        {
          alias: 'app',
          state: 'materialized',
          source: 'repo',
          tasks: { completed: 0, total: 2 },
          problems: [],
        },
      ],
    });
    expect(serialized).not.toContain(sandbox.repoPaths.app);
    expect(serialized).not.toContain(sandbox.repoPaths.api);
    expect(serialized).not.toContain('\u001b');
  });

  it('keeps older ownerless workspace fixtures readable without guidance fields', async () => {
    const sandbox = await createSandbox('happy-path');

    await createWorkspaceChange(sandbox.workspaceRoot, 'ownerless-status', {
      description: 'Exercise the ownerless fixture compatibility path.',
      targets: 'app,docs',
    });

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'ownerless-status');
    const serialized = JSON.stringify(status.targets);

    expect(status.targets).toEqual([
      {
        alias: 'app',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'docs',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
    ]);
    expect(serialized).not.toContain('"owner"');
    expect(serialized).not.toContain('"handoff"');
  });

  it('reports blocked targets when repo resolution is stale', async () => {
    const sandbox = await createSandbox('dirty');

    await createWorkspaceChange(sandbox.workspaceRoot, 'docs-repair', {
      description: 'Repair the stale docs target.',
      targets: 'docs',
    });

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'docs-repair');

    expect(status.change).toEqual({
      id: 'docs-repair',
      state: 'blocked',
    });
    expect(status.coordination).toEqual({
      state: 'planned',
      tasks: { completed: 0, total: 2 },
      problems: [],
    });
    expect(status.targets).toEqual([
      {
        alias: 'docs',
        state: 'blocked',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: ["repo alias 'docs' points to a missing repo path"],
      },
    ]);
  });

  it('treats same-id repo-local changes without a workspace trace as blocked', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'trace-mismatch', {
      description: 'Probe same-id repo-local change handling.',
      targets: 'app',
    });

    const repoChangeDir = sandbox.repoPath('app', 'openspec', 'changes', 'trace-mismatch');
    await fs.mkdir(repoChangeDir, { recursive: true });
    await fs.writeFile(path.join(repoChangeDir, 'tasks.md'), '## Tasks\n- [ ] Local repo task\n', 'utf-8');

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'trace-mismatch');

    expect(status.change.state).toBe('blocked');
    expect(status.targets).toEqual([
      {
        alias: 'app',
        state: 'blocked',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: ['repo-local change exists but is missing .openspec.materialization.yaml'],
      },
    ]);
  });

  it('reports soft-done only when coordination and every target are complete', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-complete', {
      description: 'Finish shared refresh across app and api.',
      targets: 'app,api',
    });
    await fs.writeFile(
      sandbox.workspacePath('changes', 'shared-complete', 'tasks', 'coordination.md'),
      '## Coordination Tasks\n- [x] Confirm rollout sequencing\n- [x] Finalize repo drafts\n',
      'utf-8'
    );

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-complete',
      repo: 'app',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-complete',
      repo: 'api',
    });

    await fs.writeFile(
      sandbox.repoPath('app', 'openspec', 'changes', 'shared-complete', 'tasks.md'),
      '## app Tasks\n- [x] Implement app changes\n- [x] Update app specs\n',
      'utf-8'
    );
    await fs.writeFile(
      sandbox.repoPath('api', 'openspec', 'changes', 'shared-complete', 'tasks.md'),
      '## api Tasks\n- [x] Implement api changes\n- [x] Update api specs\n',
      'utf-8'
    );

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-complete');

    expect(status.change).toEqual({
      id: 'shared-complete',
      state: 'soft-done',
    });
    expect(status.coordination.state).toBe('complete');
    expect(status.targets).toEqual([
      {
        alias: 'api',
        state: 'complete',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'complete',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
    ]);
    expect(status.change.state).not.toBe('hard-done');
  });
});
