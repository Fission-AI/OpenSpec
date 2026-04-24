import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCLI } from '../../helpers/run-cli.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];
const tempDirs: string[] = [];

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

async function createStandaloneRepoRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-cli-'));
  tempDirs.push(root);
  await fs.mkdir(path.join(root, 'openspec', 'changes', 'archive'), { recursive: true });
  await fs.mkdir(path.join(root, 'openspec', 'specs'), { recursive: true });
  return root;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
  await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
});

describe('workspace archive CLI e2e', () => {
  it('allows one repo to archive while another repo stays in-progress without forcing top-level done', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'staggered-archive', '--targets', 'app,api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    await fs.writeFile(
      sandbox.workspacePath('changes', 'staggered-archive', 'tasks', 'coordination.md'),
      '## Coordination Tasks\n- [x] Confirm rollout sequencing\n- [x] Finalize repo drafts\n',
      'utf-8'
    );

    const appApplyResult = await runCLI(['apply', '--change', 'staggered-archive', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const apiApplyResult = await runCLI(['apply', '--change', 'staggered-archive', '--repo', 'api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(appApplyResult.exitCode).toBe(0);
    expect(apiApplyResult.exitCode).toBe(0);

    await fs.writeFile(
      sandbox.repoPath('app', 'openspec', 'changes', 'staggered-archive', 'tasks.md'),
      '## app Tasks\n- [x] Implement app changes\n- [x] Update app specs\n',
      'utf-8'
    );
    await fs.writeFile(
      sandbox.repoPath('api', 'openspec', 'changes', 'staggered-archive', 'tasks.md'),
      '## api Tasks\n- [x] Implement api changes\n- [ ] Finish api verification\n',
      'utf-8'
    );

    const repoArchiveResult = await runCLI(
      ['archive', 'staggered-archive', '--yes', '--skip-specs', '--no-validate'],
      {
        cwd: sandbox.repoPaths.app,
        env: cliEnv(),
      }
    );
    expect(repoArchiveResult.exitCode).toBe(0);

    const statusResult = await runCLI(['status', '--change', 'staggered-archive', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(statusResult.exitCode).toBe(0);
    expect(statusResult.stderr).toBe('');

    const status = JSON.parse(statusResult.stdout);
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

  it('shows soft-done before explicit workspace archive and hard-done after it', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'workspace-hard-done', '--targets', 'app,api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    await fs.writeFile(
      sandbox.workspacePath('changes', 'workspace-hard-done', 'tasks', 'coordination.md'),
      '## Coordination Tasks\n- [x] Confirm rollout sequencing\n- [x] Finalize repo drafts\n',
      'utf-8'
    );

    const appApplyResult = await runCLI(['apply', '--change', 'workspace-hard-done', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const apiApplyResult = await runCLI(['apply', '--change', 'workspace-hard-done', '--repo', 'api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(appApplyResult.exitCode).toBe(0);
    expect(apiApplyResult.exitCode).toBe(0);

    await fs.writeFile(
      sandbox.repoPath('app', 'openspec', 'changes', 'workspace-hard-done', 'tasks.md'),
      '## app Tasks\n- [x] Implement app changes\n- [x] Update app specs\n',
      'utf-8'
    );
    await fs.writeFile(
      sandbox.repoPath('api', 'openspec', 'changes', 'workspace-hard-done', 'tasks.md'),
      '## api Tasks\n- [x] Implement api changes\n- [x] Update api specs\n',
      'utf-8'
    );

    const repoArchiveResult = await runCLI(
      ['archive', 'workspace-hard-done', '--yes', '--skip-specs', '--no-validate'],
      {
        cwd: sandbox.repoPaths.app,
        env: cliEnv(),
      }
    );
    expect(repoArchiveResult.exitCode).toBe(0);

    const beforeArchiveStatusResult = await runCLI(['status', '--change', 'workspace-hard-done', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(beforeArchiveStatusResult.exitCode).toBe(0);
    expect(beforeArchiveStatusResult.stderr).toBe('');

    const beforeArchiveStatus = JSON.parse(beforeArchiveStatusResult.stdout);
    expect(beforeArchiveStatus.change).toEqual({
      id: 'workspace-hard-done',
      state: 'soft-done',
    });
    expect(beforeArchiveStatus.targets).toEqual([
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

    const workspaceArchiveResult = await runCLI(['archive', 'workspace-hard-done', '--workspace'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(workspaceArchiveResult.exitCode).toBe(0);
    expect(workspaceArchiveResult.stderr).toBe('');
    expect(workspaceArchiveResult.stdout).toContain(
      "Workspace change 'workspace-hard-done' marked hard-done"
    );

    const afterArchiveStatusResult = await runCLI(['status', '--change', 'workspace-hard-done', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(afterArchiveStatusResult.exitCode).toBe(0);
    expect(afterArchiveStatusResult.stderr).toBe('');

    const afterArchiveStatus = JSON.parse(afterArchiveStatusResult.stdout);
    expect(afterArchiveStatus.change).toEqual({
      id: 'workspace-hard-done',
      state: 'hard-done',
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

  it('keeps standalone repo-local archive behavior unchanged outside workspace flows', async () => {
    const repoRoot = await createStandaloneRepoRoot();
    const changeRoot = path.join(repoRoot, 'openspec', 'changes', 'repo-local-regression');

    await fs.mkdir(changeRoot, { recursive: true });
    await fs.writeFile(
      path.join(changeRoot, 'tasks.md'),
      '## Tasks\n- [x] Keep repo-local archive behavior stable\n',
      'utf-8'
    );

    const archiveResult = await runCLI(
      ['archive', 'repo-local-regression', '--yes', '--skip-specs', '--no-validate'],
      {
        cwd: repoRoot,
        env: cliEnv(),
      }
    );
    expect(archiveResult.exitCode).toBe(0);
    expect(archiveResult.stderr).toBe('');

    const archiveEntries = await fs.readdir(path.join(repoRoot, 'openspec', 'changes', 'archive'));
    expect(archiveEntries.some((entry) => entry.endsWith('-repo-local-regression'))).toBe(true);
    await expect(fs.access(changeRoot)).rejects.toThrow();
  });
});
