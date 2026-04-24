import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import { applyCommand } from '../../../src/commands/workflow/apply.js';
import { assertMaterializationInvariants } from '../../helpers/workspace-assertions.js';
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

async function seedWorkspaceChange(
  sandbox: WorkspaceSandbox,
  changeId: string,
  targets: string[] = ['app', 'api']
): Promise<void> {
  await createWorkspaceChange(sandbox.workspaceRoot, changeId, {
    description: 'Refresh shared contracts across the selected repos.',
    targets: targets.join(','),
  });

  const changeDir = sandbox.workspacePath('changes', changeId);

  await fs.writeFile(path.join(changeDir, 'proposal.md'), `# ${changeId}\n\nShared proposal\n`, 'utf-8');
  await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n\nShared design\n', 'utf-8');

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
}

async function runApplyCommand(cwd: string, options: { change?: string; repo?: string; json?: boolean }): Promise<void> {
  const originalCwd = process.cwd();

  try {
    process.chdir(cwd);
    await applyCommand(options);
  } finally {
    process.chdir(originalCwd);
  }
}

describe('apply command integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
    vi.restoreAllMocks();
  });

  it('prints the materialization report on success', async () => {
    const sandbox = await createSandbox();
    await seedWorkspaceChange(sandbox, 'shared-refresh');

    await runApplyCommand(sandbox.workspaceRoot, {
      change: 'shared-refresh',
      repo: 'app',
    });

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    expect(output).toContain("Materialized workspace change 'shared-refresh' into repo 'app'.");
    expect(output).toContain('Workspace planning artifacts remain intact.');
    expect(output).toContain("Authority handoff: workspace draft for target alias 'app' before apply;");
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app'],
    });
  });

  it('fails clearly when repo resolution is stale', async () => {
    const sandbox = await createSandbox('dirty');
    await seedWorkspaceChange(sandbox, 'docs-repair', ['docs']);

    await expect(
      runApplyCommand(sandbox.workspaceRoot, {
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

  it('preserves the create-only repeat-apply behavior', async () => {
    const sandbox = await createSandbox();
    await seedWorkspaceChange(sandbox, 'shared-refresh');

    await runApplyCommand(sandbox.workspaceRoot, {
      change: 'shared-refresh',
      repo: 'app',
    });

    await expect(
      runApplyCommand(sandbox.workspaceRoot, {
        change: 'shared-refresh',
        repo: 'app',
      })
    ).rejects.toThrow(
      "Create-only collision: repo-local change 'shared-refresh' already exists in target repo 'app'"
    );

    await runApplyCommand(sandbox.workspaceRoot, {
      change: 'shared-refresh',
      repo: 'api',
    });

    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app', 'api'],
    });
  });
});
