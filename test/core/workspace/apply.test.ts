import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { applyWorkspaceChange } from '../../../src/core/workspace/apply.js';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import { assertMaterializationInvariants } from '../../helpers/workspace-assertions.js';
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

async function createSandboxWithFixture(
  fixture: 'happy-path' | 'dirty' = 'happy-path'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

async function listTreeEntries(rootDir: string, prefix = ''): Promise<Record<string, string>> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const snapshot: Record<string, string> = {};

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      snapshot[`${relativePath}/`] = '<dir>';
      Object.assign(snapshot, await listTreeEntries(absolutePath, relativePath));
      continue;
    }

    if (entry.isFile()) {
      snapshot[relativePath] = await fs.readFile(absolutePath, 'utf-8');
    }
  }

  return snapshot;
}

async function seedMaterializableWorkspaceChange(
  sandbox: WorkspaceSandbox,
  changeId: string,
  targets: string[] = ['app', 'api']
): Promise<string> {
  await createWorkspaceChange(sandbox.workspaceRoot, changeId, {
    description: 'Refresh shared contracts across the app and api repos.',
    targets: targets.join(','),
  });

  const changeDir = sandbox.workspacePath('changes', changeId);

  await fs.writeFile(path.join(changeDir, 'proposal.md'), `# ${changeId}\n\nShared proposal\n`, 'utf-8');
  await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n\nShared design\n', 'utf-8');
  await fs.writeFile(
    path.join(changeDir, 'tasks', 'coordination.md'),
    '## Coordination Tasks\n- [ ] Track rollout in the workspace only\n',
    'utf-8'
  );

  for (const target of targets) {
    await fs.writeFile(
      path.join(changeDir, 'targets', target, 'tasks.md'),
      `## ${target} Tasks\n- [ ] Implement ${target}-side changes\n`,
      'utf-8'
    );
    await fs.mkdir(path.join(changeDir, 'targets', target, 'specs', target), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'targets', target, 'specs', target, 'spec.md'),
      `# ${target} delta\n\n## ADDED Requirements\n### Requirement: ${target} refresh\nThe ${target} SHALL refresh.\n`,
      'utf-8'
    );
  }

  return changeDir;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace apply materialization', () => {
  it('materializes only the selected target slice and leaves the workspace draft untouched', async () => {
    const sandbox = await createSandbox();
    const changeDir = await seedMaterializableWorkspaceChange(sandbox, 'shared-refresh');
    const workspaceBefore = await listTreeEntries(changeDir);

    const result = await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      repo: 'app',
    });

    const repoChangeDir = sandbox.repoPath('app', 'openspec', 'changes', 'shared-refresh');
    const metadata = readChangeMetadata(repoChangeDir, sandbox.repoPaths.app);
    const trace = YAML.parse(
      await fs.readFile(path.join(repoChangeDir, '.openspec.materialization.yaml'), 'utf-8')
    ) as Record<string, unknown>;

    expect(result.change.id).toBe('shared-refresh');
    expect(result.target.alias).toBe('app');
    expect(result.target.changePath).toBe(repoChangeDir);
    expect(metadata).toEqual(
      expect.objectContaining({
        schema: 'spec-driven',
        created: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
      })
    );
    expect(await fs.readFile(path.join(repoChangeDir, 'proposal.md'), 'utf-8')).toBe(
      await fs.readFile(path.join(changeDir, 'proposal.md'), 'utf-8')
    );
    expect(await fs.readFile(path.join(repoChangeDir, 'design.md'), 'utf-8')).toBe(
      await fs.readFile(path.join(changeDir, 'design.md'), 'utf-8')
    );
    expect(await fs.readFile(path.join(repoChangeDir, 'tasks.md'), 'utf-8')).toBe(
      await fs.readFile(path.join(changeDir, 'targets', 'app', 'tasks.md'), 'utf-8')
    );
    expect(await fs.readFile(path.join(repoChangeDir, 'specs', 'app', 'spec.md'), 'utf-8')).toBe(
      await fs.readFile(path.join(changeDir, 'targets', 'app', 'specs', 'app', 'spec.md'), 'utf-8')
    );
    await expect(fs.access(path.join(repoChangeDir, 'specs', 'api'))).rejects.toThrow();
    await expect(fs.access(path.join(repoChangeDir, 'targets'))).rejects.toThrow();
    await expect(fs.access(path.join(repoChangeDir, 'tasks', 'coordination.md'))).rejects.toThrow();
    expect(trace).toEqual({
      source: 'workspace',
      workspaceName: 'happy-path',
      targetAlias: 'app',
      materializedAt: result.materializedAt,
    });
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app'],
    });
    expect(await listTreeEntries(changeDir)).toEqual(workspaceBefore);
  });

  it('follows the v0 repeat-apply contract', async () => {
    const sandbox = await createSandbox();
    await seedMaterializableWorkspaceChange(sandbox, 'shared-refresh');

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      repo: 'app',
    });

    await expect(
      applyWorkspaceChange({
        cwd: sandbox.workspaceRoot,
        change: 'shared-refresh',
        repo: 'app',
      })
    ).rejects.toThrow(
      `Create-only collision: repo-local change 'shared-refresh' already exists in target repo 'app'`
    );

    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      repo: 'api',
    });

    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app', 'api'],
    });
  });

  it('fails clearly for unknown and untargeted repo aliases', async () => {
    const sandbox = await createSandbox();
    await seedMaterializableWorkspaceChange(sandbox, 'shared-refresh');

    await expect(
      applyWorkspaceChange({
        cwd: sandbox.workspaceRoot,
        change: 'shared-refresh',
        repo: 'missing',
      })
    ).rejects.toThrow(
      "Target selection error: repo alias 'missing' is not registered in this workspace. Registered aliases: api, app, docs"
    );

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

  it('fails when the selected target slice is missing required source artifacts', async () => {
    const sandbox = await createSandbox();
    const changeDir = await seedMaterializableWorkspaceChange(sandbox, 'missing-target-tasks', ['app']);

    await fs.rm(path.join(changeDir, 'targets', 'app', 'tasks.md'));

    await expect(
      applyWorkspaceChange({
        cwd: sandbox.workspaceRoot,
        change: 'missing-target-tasks',
        repo: 'app',
      })
    ).rejects.toThrow(
      "Source artifact error: workspace change 'missing-target-tasks' is missing required file 'targets/app/tasks.md'."
    );

    await assertMaterializationInvariants({
      workspaceChangeId: 'missing-target-tasks',
      repoRoots: sandbox.repoPaths,
      targetAliases: [],
    });
  });

  it('surfaces stale alias resolution failures without creating repo-local changes', async () => {
    const sandbox = await createSandboxWithFixture('dirty');
    await seedMaterializableWorkspaceChange(sandbox, 'docs-repair', ['docs']);

    await expect(
      applyWorkspaceChange({
        cwd: sandbox.workspaceRoot,
        change: 'docs-repair',
        repo: 'docs',
      })
    ).rejects.toThrow(
      `Target alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`
    );

    await assertMaterializationInvariants({
      workspaceChangeId: 'docs-repair',
      repoRoots: sandbox.repoPaths,
      targetAliases: [],
    });
  });

  it('surfaces pre-existing target collisions in dirty workspaces without overwriting the existing repo change', async () => {
    const sandbox = await createSandboxWithFixture('dirty');
    await seedMaterializableWorkspaceChange(sandbox, 'shared-cleanup-collision', ['app']);

    const preexistingRepoChangeDir = sandbox.repoPath('app', 'openspec', 'changes', 'shared-cleanup-collision');
    await fs.mkdir(preexistingRepoChangeDir, { recursive: true });
    await fs.writeFile(path.join(preexistingRepoChangeDir, 'proposal.md'), 'preexisting repo change\n', 'utf-8');

    await expect(
      applyWorkspaceChange({
        cwd: sandbox.workspaceRoot,
        change: 'shared-cleanup-collision',
        repo: 'app',
      })
    ).rejects.toThrow(
      `Create-only collision: repo-local change 'shared-cleanup-collision' already exists in target repo 'app'`
    );

    expect(await fs.readFile(path.join(preexistingRepoChangeDir, 'proposal.md'), 'utf-8')).toBe(
      'preexisting repo change\n'
    );
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-cleanup-collision',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app'],
    });
  });
});
