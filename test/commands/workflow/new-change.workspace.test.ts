import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  WORKSPACE_OPEN_MODE_ENV,
  WORKSPACE_OPEN_SESSION_TOKEN_ENV,
  WORKSPACE_OPEN_WORKSPACE_ROOT_ENV,
} from '../../../src/core/workspace/open-session.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const { startMock, succeedMock, failMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  succeedMock: vi.fn(),
  failMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: startMock,
  })),
}));

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

async function runNewChangeCommand(
  cwd: string,
  name: string,
  options: { description?: string; schema?: string; targets?: string }
): Promise<void> {
  const { newChangeCommand } = await import('../../../src/commands/workflow/new-change.js');
  const originalCwd = process.cwd();

  try {
    process.chdir(cwd);
    await newChangeCommand(name, options);
  } finally {
    process.chdir(originalCwd);
  }
}

describe('new change command in a managed workspace', () => {
  beforeEach(() => {
    vi.resetModules();
    succeedMock.mockReset();
    failMock.mockReset();
    startMock.mockReset();
    startMock.mockReturnValue({
      succeed: succeedMock,
      fail: failMock,
    });
  });

  afterEach(async () => {
    await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
    vi.restoreAllMocks();
  });

  it('creates a workspace change inside the registered workspace root', async () => {
    const sandbox = await createSandbox();

    await runNewChangeCommand(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });

    await expect(fs.stat(sandbox.workspacePath('changes', 'shared-refresh'))).resolves.toMatchObject({
      isDirectory: expect.any(Function),
    });
    expect(succeedMock).toHaveBeenCalledWith(
      "Created workspace change 'shared-refresh' at changes/shared-refresh/ (schema: spec-driven; targets: app, api)"
    );
    expect(failMock).not.toHaveBeenCalled();
  });

  it('fails fast when requested targets are not in the workspace registry', async () => {
    const sandbox = await createSandbox();

    await expect(
      runNewChangeCommand(sandbox.workspaceRoot, 'shared-refresh', {
        targets: 'app,missing',
      })
    ).rejects.toThrow('Unknown target alias: missing. Registered aliases: api, app, docs');

    expect(failMock).toHaveBeenCalledWith("Failed to create change 'shared-refresh'");
  });

  it('records a workspace-open upgrade request when a targeted change is created from a root session', async () => {
    const sandbox = await createSandbox();
    const originalEnv = { ...process.env };
    const sessionToken = 'workspace-root-session';
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);
    const upgradeRequestPath = path.join(
      canonicalWorkspaceRoot,
      '.openspec',
      'workspace-open',
      'upgrades',
      `${sessionToken}.json`
    );

    process.env[WORKSPACE_OPEN_SESSION_TOKEN_ENV] = sessionToken;
    process.env[WORKSPACE_OPEN_MODE_ENV] = 'workspace-root';
    process.env[WORKSPACE_OPEN_WORKSPACE_ROOT_ENV] = canonicalWorkspaceRoot;

    try {
      await runNewChangeCommand(sandbox.workspaceRoot, 'shared-scope-upgrade', {
        targets: 'app,api',
      });

      expect(JSON.parse(await fs.readFile(upgradeRequestPath, 'utf-8'))).toMatchObject({
        workspaceRoot: canonicalWorkspaceRoot,
        changeId: 'shared-scope-upgrade',
      });
    } finally {
      process.env = originalEnv;
    }
  });
});
