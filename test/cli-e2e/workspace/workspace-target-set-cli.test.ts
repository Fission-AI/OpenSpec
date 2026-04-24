import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import { runCLI } from '../../helpers/run-cli.js';
import { assertWorkspaceChangeLayout } from '../../helpers/workspace-assertions.js';
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

function cliEnv(): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
  };
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace target-set CLI e2e', () => {
  it('adds a target and the real CLI open/apply/status flow immediately respects it', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'shared-refresh', '--targets', 'app,api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const adjustResult = await runCLI(['workspace', 'targets', 'shared-refresh', '--add', 'docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const adjustOutput = adjustResult.stdout + adjustResult.stderr;
    const changeDir = sandbox.workspacePath('changes', 'shared-refresh');
    const metadata = readChangeMetadata(changeDir, sandbox.workspaceRoot);

    expect(adjustResult.exitCode).toBe(0);
    expect(adjustOutput).toContain("Updated workspace targets for 'shared-refresh'.");
    expect(metadata?.targets).toEqual(['app', 'api', 'docs']);
    await assertWorkspaceChangeLayout(changeDir, ['app', 'api', 'docs']);

    const openResult = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(openResult.exitCode).toBe(0);
    expect(JSON.parse(openResult.stdout).attachedRepos).toEqual([
      { alias: 'app', path: sandbox.repoPaths.app },
      { alias: 'api', path: sandbox.repoPaths.api },
      { alias: 'docs', path: sandbox.repoPaths.docs },
    ]);

    const statusBeforeApply = await runCLI(['status', '--change', 'shared-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(statusBeforeApply.exitCode).toBe(0);
    expect(JSON.parse(statusBeforeApply.stdout).targets).toEqual([
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

    const applyResult = await runCLI(['apply', '--change', 'shared-refresh', '--repo', 'docs', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(applyResult.exitCode).toBe(0);
    expect(JSON.parse(applyResult.stdout).target.alias).toBe('docs');
    await expect(
      fs.access(sandbox.repoPath('docs', 'openspec', 'changes', 'shared-refresh', 'tasks.md'))
    ).resolves.toBeUndefined();
  });

  it('removes an unmaterialized target cleanly without corrupting the remaining workspace state', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'shared-refresh', '--targets', 'app,api,docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const adjustResult = await runCLI(['workspace', 'targets', 'shared-refresh', '--remove', 'docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const changeDir = sandbox.workspacePath('changes', 'shared-refresh');
    const metadata = readChangeMetadata(changeDir, sandbox.workspaceRoot);

    expect(adjustResult.exitCode).toBe(0);
    expect(metadata?.targets).toEqual(['app', 'api']);
    await assertWorkspaceChangeLayout(changeDir, ['app', 'api']);
    await expect(fs.access(sandbox.workspacePath('changes', 'shared-refresh', 'targets', 'docs'))).rejects.toThrow();

    const openResult = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--prepare-only'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const openOutput = openResult.stdout + openResult.stderr;
    expect(openResult.exitCode).toBe(0);
    expect(openOutput).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(openOutput).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(openOutput).not.toContain(`- docs: ${sandbox.repoPaths.docs}`);

    const statusResult = await runCLI(['status', '--change', 'shared-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(statusResult.exitCode).toBe(0);
    expect(JSON.parse(statusResult.stdout).targets).toEqual([
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

    const applyResult = await runCLI(['apply', '--change', 'shared-refresh', '--repo', 'docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const applyOutput = applyResult.stdout + applyResult.stderr;
    expect(applyResult.exitCode).toBe(1);
    expect(applyOutput).toContain(
      "Target selection error: workspace change 'shared-refresh' does not target repo alias 'docs'. Targeted aliases: app, api"
    );
  });

  it('refuses to remove a target once repo-local execution already exists', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'shared-refresh', '--targets', 'app,api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const applyResult = await runCLI(['apply', '--change', 'shared-refresh', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(applyResult.exitCode).toBe(0);

    const adjustResult = await runCLI(['workspace', 'targets', 'shared-refresh', '--remove', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const adjustOutput = adjustResult.stdout + adjustResult.stderr;
    const metadata = readChangeMetadata(sandbox.workspacePath('changes', 'shared-refresh'), sandbox.workspaceRoot);

    expect(adjustResult.exitCode).toBe(1);
    expect(adjustOutput).toContain(
      `Cannot remove target alias 'app' on workspace change 'shared-refresh' because repo-local execution already exists at ${sandbox.repoPath('app', 'openspec', 'changes', 'shared-refresh')}.`
    );
    expect(metadata?.targets).toEqual(['app', 'api']);
  });

  it('refuses to add a target once same-id repo-local execution already exists for that alias', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'shared-refresh', '--targets', 'app,api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const repoLocalChangeDir = sandbox.repoPath('docs', 'openspec', 'changes', 'shared-refresh');
    await fs.mkdir(repoLocalChangeDir, { recursive: true });
    await fs.writeFile(`${repoLocalChangeDir}/proposal.md`, '# repo-local docs change\n', 'utf-8');

    const adjustResult = await runCLI(['workspace', 'targets', 'shared-refresh', '--add', 'docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const adjustOutput = adjustResult.stdout + adjustResult.stderr;
    const metadata = readChangeMetadata(sandbox.workspacePath('changes', 'shared-refresh'), sandbox.workspaceRoot);

    expect(adjustResult.exitCode).toBe(1);
    expect(adjustOutput).toContain(
      `Cannot add target alias 'docs' on workspace change 'shared-refresh' because repo-local execution already exists at ${repoLocalChangeDir}.`
    );
    expect(metadata?.targets).toEqual(['app', 'api']);
    await expect(fs.access(sandbox.workspacePath('changes', 'shared-refresh', 'targets', 'docs'))).rejects.toThrow();
  });
});
