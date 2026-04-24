import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import { runCLI } from '../../helpers/run-cli.js';
import {
  assertMaterializationInvariants,
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

async function ensureRepoLocalChangesRoots(sandbox: WorkspaceSandbox): Promise<void> {
  await Promise.all(
    Object.keys(sandbox.repoPaths).map((alias) => fs.mkdir(sandbox.repoPath(alias, 'openspec', 'changes'), { recursive: true }))
  );
}

function cliEnv(): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
  };
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace targeted change creation CLI e2e', () => {
  it('creates a targeted workspace change with stable central planning state', async () => {
    const sandbox = await createSandbox();
    await ensureRepoLocalChangesRoots(sandbox);

    const createResult = await runCLI(['new', 'change', 'shared-refresh', '--targets', 'app,api'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const createOutput = createResult.stdout + createResult.stderr;

    expect(createResult.exitCode).toBe(0);
    expect(createOutput).toContain(
      "Created workspace change 'shared-refresh' at changes/shared-refresh/ (schema: spec-driven; targets: app, api)"
    );

    const changeDir = sandbox.workspacePath('changes', 'shared-refresh');
    const metadata = readChangeMetadata(changeDir, sandbox.workspaceRoot);

    expect(metadata).not.toBeNull();
    await assertWorkspaceChangeLayout(changeDir, ['app', 'api']);
    assertTargetMembership(['app', 'api'], metadata?.targets ?? []);
    await assertMaterializationInvariants({
      workspaceChangeId: 'shared-refresh',
      repoRoots: sandbox.repoPaths,
      targetAliases: [],
    });

    const statusResult = await runCLI(['status', '--change', 'shared-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const doctorResult = await runCLI(['workspace', 'doctor', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(statusResult.exitCode).toBe(0);
    expect(statusResult.stderr).toBe('');
    const status = JSON.parse(statusResult.stdout);
    expect(status).toEqual({
      change: {
        id: 'shared-refresh',
        state: 'planned',
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
          state: 'planned',
          source: 'workspace',
          tasks: { completed: 0, total: 2 },
          problems: [],
        },
      ],
    });
    expect(statusResult.stdout).not.toContain('\u001b');

    expect(doctorResult.exitCode).toBe(0);
    expect(doctorResult.stderr).toBe('');
    expect(JSON.parse(doctorResult.stdout)).toEqual(
      expect.objectContaining({
        registeredAliasCount: 3,
        localAliasCount: 3,
        issues: [],
        status: 'ok',
      })
    );
  });

  it('rejects unknown aliases and does not touch repo-local change roots', async () => {
    const sandbox = await createSandbox();
    await ensureRepoLocalChangesRoots(sandbox);

    const createResult = await runCLI(['new', 'change', 'bad-targets', '--targets', 'app,missing'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const output = createResult.stdout + createResult.stderr;

    expect(createResult.exitCode).toBe(1);
    expect(output).toContain('Unknown target alias: missing. Registered aliases: api, app, docs');
    await expect(fs.access(sandbox.workspacePath('changes', 'bad-targets'))).rejects.toThrow();
    await assertMaterializationInvariants({
      workspaceChangeId: 'bad-targets',
      repoRoots: sandbox.repoPaths,
      targetAliases: [],
    });
  });
});
