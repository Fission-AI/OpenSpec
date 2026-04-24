import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import {
  readWorkspaceMetadata,
  writeWorkspaceMetadata,
} from '../../../src/core/workspace/metadata.js';
import { runCLI } from '../../helpers/run-cli.js';
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

function cliEnv(): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
  };
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace status CLI e2e', () => {
  it('reports mixed planned, materialized, and blocked targets across three repos', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'mixed-status', '--targets', 'app,api,docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const applyResult = await runCLI(['apply', '--change', 'mixed-status', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(applyResult.exitCode).toBe(0);

    await fs.rm(sandbox.repoPaths.docs, { recursive: true, force: true });

    const textResult = await runCLI(['status', '--change', 'mixed-status'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const jsonResult = await runCLI(['status', '--change', 'mixed-status', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(textResult.exitCode).toBe(0);
    expect(textResult.stdout).toContain('Workspace change: mixed-status');
    expect(textResult.stdout).toContain('State: blocked');
    expect(textResult.stdout).toContain('- api: planned via workspace (0/2 tasks)');
    expect(textResult.stdout).toContain('- app: materialized via repo (0/2 tasks)');
    expect(textResult.stdout).toContain('- docs: blocked via workspace (0/2 tasks)');
    expect(textResult.stdout).toContain("problem: repo alias 'docs' points to a missing repo path");

    expect(jsonResult.exitCode).toBe(0);
    expect(jsonResult.stderr).toBe('');
    const status = JSON.parse(jsonResult.stdout);
    expect(status).toEqual({
      change: {
        id: 'mixed-status',
        state: 'blocked',
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
        {
          alias: 'docs',
          state: 'blocked',
          source: 'workspace',
          tasks: { completed: 0, total: 2 },
          problems: ["repo alias 'docs' points to a missing repo path"],
        },
      ],
    });
    expect(jsonResult.stdout).not.toContain('\u001b');
    expect(jsonResult.stdout).not.toContain('Loading change status...');
  });

  it('keeps interruption and resume status readable on the dirty fixture', async () => {
    const sandbox = await createSandbox('dirty');

    const createResult = await runCLI(['new', 'change', 'resume-refresh', '--targets', 'app,api,docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const applyResult = await runCLI(['apply', '--change', 'resume-refresh', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(applyResult.exitCode).toBe(0);

    await fs.writeFile(
      sandbox.repoPath('app', 'openspec', 'changes', 'resume-refresh', 'tasks.md'),
      '## app Tasks\n- [x] Continue the interrupted app work\n- [ ] Resume the remaining app verification\n',
      'utf-8'
    );

    const jsonResult = await runCLI(['status', '--change', 'resume-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(jsonResult.exitCode).toBe(0);
    expect(jsonResult.stderr).toBe('');

    const status = JSON.parse(jsonResult.stdout);
    expect(status).toEqual({
      change: {
        id: 'resume-refresh',
        state: 'blocked',
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
          state: 'in-progress',
          source: 'repo',
          tasks: { completed: 1, total: 2 },
          problems: [],
        },
        {
          alias: 'docs',
          state: 'blocked',
          source: 'workspace',
          tasks: { completed: 0, total: 2 },
          problems: ["repo alias 'docs' points to a missing repo path"],
        },
      ],
    });
    expect(jsonResult.stdout).not.toContain('\u001b');
    expect(jsonResult.stdout).not.toContain('Loading change status...');
  });

  it('shows configured repo owner or handoff guidance in workspace-aware status text and JSON', async () => {
    const sandbox = await createSandbox();

    const createResult = await runCLI(['new', 'change', 'guided-status', '--targets', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    metadata.repos.app = {
      ...metadata.repos.app,
      owner: 'App Platform',
      handoff: 'Materialize the app slice after the shared review is approved',
    };
    await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

    const textResult = await runCLI(['status', '--change', 'guided-status'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const jsonResult = await runCLI(['status', '--change', 'guided-status', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(textResult.exitCode).toBe(0);
    expect(textResult.stdout).toContain(
      '- app: planned via workspace (0/2 tasks) [owner: App Platform; handoff: Materialize the app slice after the shared review is approved]'
    );

    expect(jsonResult.exitCode).toBe(0);
    expect(jsonResult.stderr).toBe('');

    expect(JSON.parse(jsonResult.stdout).targets).toEqual([
      {
        alias: 'app',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
        owner: 'App Platform',
        handoff: 'Materialize the app slice after the shared review is approved',
      },
    ]);
  });

  it('keeps older ownerless workspace fixtures readable without guidance fields', async () => {
    const sandbox = await createSandbox('happy-path');

    const createResult = await runCLI(['new', 'change', 'ownerless-status', '--targets', 'app,docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const textResult = await runCLI(['status', '--change', 'ownerless-status'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const jsonResult = await runCLI(['status', '--change', 'ownerless-status', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(textResult.exitCode).toBe(0);
    expect(textResult.stdout).toContain('- app: planned via workspace (0/2 tasks)');
    expect(textResult.stdout).toContain('- docs: planned via workspace (0/2 tasks)');
    expect(textResult.stdout).not.toContain('owner:');
    expect(textResult.stdout).not.toContain('handoff:');

    expect(jsonResult.exitCode).toBe(0);
    expect(jsonResult.stderr).toBe('');
    expect(JSON.parse(jsonResult.stdout).targets).toEqual([
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
    expect(jsonResult.stdout).not.toContain('"owner"');
    expect(jsonResult.stdout).not.toContain('"handoff"');
  });
});
