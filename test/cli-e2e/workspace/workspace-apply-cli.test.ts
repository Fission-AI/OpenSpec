import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import { runCLI } from '../../helpers/run-cli.js';
import { assertMaterializationInvariants } from '../../helpers/workspace-assertions.js';
import {
  WORKSPACE_POC_FIXTURES_ROOT,
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];
const tempRoots: string[] = [];

async function createSandbox(
  fixture: 'happy-path' | 'dirty' = 'happy-path'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

async function createIsolatedEnv(): Promise<{ env: NodeJS.ProcessEnv; root: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-apply-e2e-'));
  tempRoots.push(root);

  return {
    root,
    env: {
      OPEN_SPEC_TELEMETRY_DISABLED: '1',
      XDG_CONFIG_HOME: path.join(root, 'xdg-config'),
      XDG_DATA_HOME: path.join(root, 'xdg-data'),
    },
  };
}

function cliEnv(): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
  };
}

async function seedWorkspaceChange(sandbox: WorkspaceSandbox, changeId: string): Promise<void> {
  await seedWorkspaceChangeForTargets(sandbox, changeId, ['app', 'api']);
}

async function seedWorkspaceChangeForTargets(
  sandbox: WorkspaceSandbox,
  changeId: string,
  targets: string[]
): Promise<void> {
  await createWorkspaceChange(sandbox.workspaceRoot, changeId, {
    description: 'Refresh shared contracts across the app and api repos.',
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

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

afterAll(async () => {
  await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('workspace apply CLI e2e', () => {
  it('materializes the selected repo and reports the authority handoff', async () => {
    const sandbox = await createSandbox();
    await seedWorkspaceChange(sandbox, 'shared-refresh');

    const applyResult = await runCLI(['apply', '--change', 'shared-refresh', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const applyOutput = applyResult.stdout + applyResult.stderr;

    expect(applyResult.exitCode).toBe(0);
    expect(applyOutput).toContain("Materialized workspace change 'shared-refresh' into repo 'app'.");
    expect(applyOutput).toContain('Workspace planning artifacts remain intact.');
    expect(applyOutput).toContain('Authority handoff:');
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app'],
    });

    const repeatResult = await runCLI(['apply', '--change', 'shared-refresh', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const repeatOutput = repeatResult.stdout + repeatResult.stderr;

    expect(repeatResult.exitCode).toBe(1);
    expect(repeatOutput).toContain("Create-only collision: repo-local change 'shared-refresh' already exists");
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app'],
    });
  });

  it('fails clearly for stale dirty-workspace aliases without touching healthy repos', async () => {
    const sandbox = await createSandbox('dirty');
    await seedWorkspaceChangeForTargets(sandbox, 'docs-repair', ['docs']);

    const applyResult = await runCLI(['apply', '--change', 'docs-repair', '--repo', 'docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const applyOutput = applyResult.stdout + applyResult.stderr;

    expect(applyResult.exitCode).toBe(1);
    expect(applyOutput).toContain(
      `Target alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`
    );
    await assertMaterializationInvariants({
      workspaceChangeId: 'docs-repair',
      repoRoots: sandbox.repoPaths,
      targetAliases: [],
    });
  });

  it('supports a fresh workspace create -> add-repo -> new change -> apply flow', async () => {
    const { env, root } = await createIsolatedEnv();
    const reposRoot = path.join(root, 'repos');
    const appRepoRoot = path.join(reposRoot, 'app');
    const apiRepoRoot = path.join(reposRoot, 'api');
    const happyPathReposRoot = path.join(WORKSPACE_POC_FIXTURES_ROOT, 'happy-path', 'repos');

    await fs.cp(path.join(happyPathReposRoot, 'app'), appRepoRoot, { recursive: true });
    await fs.cp(path.join(happyPathReposRoot, 'api'), apiRepoRoot, { recursive: true });

    const createWorkspaceResult = await runCLI(['workspace', 'create', 'phase-12-flow', '--json'], { env });
    expect(createWorkspaceResult.exitCode).toBe(0);
    expect(createWorkspaceResult.stderr).toBe('');

    const workspaceRoot = JSON.parse(createWorkspaceResult.stdout).workspaceRoot as string;

    const addAppResult = await runCLI(['workspace', 'add-repo', 'app', appRepoRoot, '--json'], {
      cwd: workspaceRoot,
      env,
    });
    const addApiResult = await runCLI(['workspace', 'add-repo', 'api', apiRepoRoot, '--json'], {
      cwd: workspaceRoot,
      env,
    });
    const newChangeResult = await runCLI(['new', 'change', 'shared-refresh', '--targets', 'app,api'], {
      cwd: workspaceRoot,
      env,
    });
    const applyResult = await runCLI(['apply', '--change', 'shared-refresh', '--repo', 'app', '--json'], {
      cwd: workspaceRoot,
      env,
    });

    expect(addAppResult.exitCode).toBe(0);
    expect(addApiResult.exitCode).toBe(0);
    expect(newChangeResult.exitCode).toBe(0);
    expect(applyResult.exitCode).toBe(0);
    expect(applyResult.stderr).toBe('');

    const applyPayload = JSON.parse(applyResult.stdout);
    const repoChangeDir = path.join(appRepoRoot, 'openspec', 'changes', 'shared-refresh');
    const metadata = readChangeMetadata(repoChangeDir, appRepoRoot);

    expect(applyPayload.change.id).toBe('shared-refresh');
    expect(path.basename(applyPayload.target.changePath)).toBe('shared-refresh');
    expect(applyPayload.target.alias).toBe('app');
    expect(metadata).toEqual(
      expect.objectContaining({
        schema: 'spec-driven',
      })
    );
    await expect(fs.stat(repoChangeDir)).resolves.toMatchObject({
      isDirectory: expect.any(Function),
    });
    await expect(fs.stat(path.join(repoChangeDir, 'specs'))).resolves.toMatchObject({
      isDirectory: expect.any(Function),
    });
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: {
        app: appRepoRoot,
        api: apiRepoRoot,
      },
      targetAliases: ['app'],
    });
  });
});
