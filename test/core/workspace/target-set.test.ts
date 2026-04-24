import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import { applyWorkspaceChange } from '../../../src/core/workspace/apply.js';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import { openWorkspace } from '../../../src/core/workspace/open.js';
import { getWorkspaceChangeStatus } from '../../../src/core/workspace/status.js';
import { updateWorkspaceChangeTargets } from '../../../src/core/workspace/target-set.js';
import {
  assertTargetMembership,
  assertWorkspaceChangeLayout,
} from '../../helpers/workspace-assertions.js';
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

describe('workspace target-set adjustment', () => {
  it('adds a target by updating metadata, scaffolding the draft slice, and exposing it to open/apply/status', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      description: 'Refresh shared contracts across app and api.',
      targets: 'app,api',
    });

    const result = await updateWorkspaceChangeTargets({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      add: 'docs',
    });
    const changeDir = sandbox.workspacePath('changes', 'shared-refresh');
    const metadata = readChangeMetadata(changeDir, sandbox.workspaceRoot);

    expect(result.targets).toEqual(['app', 'api', 'docs']);
    expect(result.addedTargets).toEqual(['docs']);
    expect(result.removedTargets).toEqual([]);
    assertTargetMembership(['app', 'api', 'docs'], metadata?.targets ?? []);
    await assertWorkspaceChangeLayout(changeDir, ['app', 'api', 'docs']);
    await expect(fs.readFile(path.join(changeDir, 'targets', 'docs', 'tasks.md'), 'utf-8')).resolves.toContain(
      '## docs Tasks'
    );

    const openResult = await openWorkspace({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
    });
    expect(openResult.attachedRepos).toEqual([
      { alias: 'app', path: sandbox.repoPaths.app },
      { alias: 'api', path: sandbox.repoPaths.api },
      { alias: 'docs', path: sandbox.repoPaths.docs },
    ]);

    const beforeApplyStatus = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-refresh');
    expect(beforeApplyStatus.targets).toEqual([
      {
        alias: 'api',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
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

    const applyResult = await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      repo: 'docs',
    });
    expect(applyResult.target.alias).toBe('docs');
    await expect(
      fs.access(sandbox.repoPath('docs', 'openspec', 'changes', 'shared-refresh', 'tasks.md'))
    ).resolves.toBeUndefined();

    const afterApplyStatus = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-refresh');
    expect(afterApplyStatus.targets).toEqual([
      {
        alias: 'api',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'docs',
        state: 'materialized',
        source: 'repo',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
    ]);
  });

  it('removes an unmaterialized target cleanly and keeps the remaining target set authoritative', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      description: 'Refresh shared contracts across three repos.',
      targets: 'app,api,docs',
    });

    const result = await updateWorkspaceChangeTargets({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      remove: 'docs',
    });
    const changeDir = sandbox.workspacePath('changes', 'shared-refresh');
    const metadata = readChangeMetadata(changeDir, sandbox.workspaceRoot);

    expect(result.targets).toEqual(['app', 'api']);
    expect(result.addedTargets).toEqual([]);
    expect(result.removedTargets).toEqual(['docs']);
    assertTargetMembership(['app', 'api'], metadata?.targets ?? []);
    await assertWorkspaceChangeLayout(changeDir, ['app', 'api']);
    await expect(fs.access(path.join(changeDir, 'targets', 'docs'))).rejects.toThrow();

    const openResult = await openWorkspace({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
    });
    expect(openResult.attachedRepos).toEqual([
      { alias: 'app', path: sandbox.repoPaths.app },
      { alias: 'api', path: sandbox.repoPaths.api },
    ]);

    const status = await getWorkspaceChangeStatus(sandbox.workspaceRoot, 'shared-refresh');
    expect(status.targets).toEqual([
      {
        alias: 'api',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
    ]);

    await expect(
      applyWorkspaceChange({
        cwd: sandbox.workspaceRoot,
        change: 'shared-refresh',
        repo: 'docs',
      })
    ).rejects.toThrow(
      "Target selection error: workspace change 'shared-refresh' does not target repo alias 'docs'. Targeted aliases: app, api"
    );
  });

  it('fails loudly when removing a materialized target so authority does not drift silently', async () => {
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

    await expect(
      updateWorkspaceChangeTargets({
        cwd: sandbox.workspaceRoot,
        change: 'shared-refresh',
        remove: 'app',
      })
    ).rejects.toThrow(
      `Cannot remove target alias 'app' on workspace change 'shared-refresh' because repo-local execution already exists at ${sandbox.repoPath('app', 'openspec', 'changes', 'shared-refresh')}.`
    );

    const metadata = readChangeMetadata(sandbox.workspacePath('changes', 'shared-refresh'), sandbox.workspaceRoot);
    assertTargetMembership(['app', 'api'], metadata?.targets ?? []);
    await expect(fs.access(sandbox.workspacePath('changes', 'shared-refresh', 'targets', 'app'))).resolves.toBeUndefined();
  });

  it('fails when adding a target whose same-id repo-local execution already exists', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      description: 'Refresh shared contracts across app and api.',
      targets: 'app,api',
    });

    const repoLocalChangeDir = sandbox.repoPath('docs', 'openspec', 'changes', 'shared-refresh');
    await fs.mkdir(repoLocalChangeDir, { recursive: true });
    await fs.writeFile(path.join(repoLocalChangeDir, 'proposal.md'), '# repo-local docs change\n', 'utf-8');

    await expect(
      updateWorkspaceChangeTargets({
        cwd: sandbox.workspaceRoot,
        change: 'shared-refresh',
        add: 'docs',
      })
    ).rejects.toThrow(
      `Cannot add target alias 'docs' on workspace change 'shared-refresh' because repo-local execution already exists at ${repoLocalChangeDir}.`
    );

    const metadata = readChangeMetadata(sandbox.workspacePath('changes', 'shared-refresh'), sandbox.workspaceRoot);
    assertTargetMembership(['app', 'api'], metadata?.targets ?? []);
    await expect(fs.access(sandbox.workspacePath('changes', 'shared-refresh', 'targets', 'docs'))).rejects.toThrow();
  });

  it('fails when adding a target whose same-id repo-local execution was already archived', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      description: 'Refresh shared contracts across app and api.',
      targets: 'app,api',
    });

    const archivedRepoChangeDir = sandbox.repoPath(
      'docs',
      'openspec',
      'changes',
      'archive',
      '20260417-000000-shared-refresh'
    );
    await fs.mkdir(archivedRepoChangeDir, { recursive: true });
    await fs.writeFile(path.join(archivedRepoChangeDir, 'proposal.md'), '# archived docs change\n', 'utf-8');

    await expect(
      updateWorkspaceChangeTargets({
        cwd: sandbox.workspaceRoot,
        change: 'shared-refresh',
        add: 'docs',
      })
    ).rejects.toThrow(
      `Cannot add target alias 'docs' on workspace change 'shared-refresh' because repo-local execution was already archived at ${archivedRepoChangeDir}.`
    );

    const metadata = readChangeMetadata(sandbox.workspacePath('changes', 'shared-refresh'), sandbox.workspaceRoot);
    assertTargetMembership(['app', 'api'], metadata?.targets ?? []);
    await expect(fs.access(sandbox.workspacePath('changes', 'shared-refresh', 'targets', 'docs'))).rejects.toThrow();
  });
});
