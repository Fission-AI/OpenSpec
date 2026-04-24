import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import { applyWorkspaceChange } from '../../../src/core/workspace/apply.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const { failMock } = vi.hoisted(() => ({
  failMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    fail: failMock,
  })),
}));

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

async function runWorkspaceCommand(args: string[], cwd: string): Promise<void> {
  const { registerWorkspaceCommand } = await import('../../../src/commands/workspace.js');
  const program = new Command();
  registerWorkspaceCommand(program);
  const originalCwd = process.cwd();

  try {
    process.chdir(cwd);
    await program.parseAsync(['node', 'openspec', 'workspace', ...args]);
  } finally {
    process.chdir(originalCwd);
  }
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace target-set command integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    process.exitCode = undefined;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });
    failMock.mockReset();
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it('prints a concise target-update report for successful mutations', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);
    const canonicalChangePath = FileSystemUtils.canonicalizeExistingPath(
      sandbox.workspacePath('changes', 'shared-refresh')
    );

    await runWorkspaceCommand(['targets', 'shared-refresh', '--add', 'docs'], sandbox.workspaceRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain("Updated workspace targets for 'shared-refresh'.");
    expect(output).toContain(`Workspace root: ${canonicalWorkspaceRoot}`);
    expect(output).toContain(`Change path: ${canonicalChangePath}`);
    expect(output).toContain('Targets: app, api, docs');
    expect(output).toContain('Added: docs');
    expect(output).toContain('Updated: .openspec.yaml, targets/');
    expect(output).toContain('Workspace open, apply, and workspace-aware status now use the adjusted target set.');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('emits parseable JSON for successful removals', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api,docs',
    });
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);
    const canonicalChangePath = FileSystemUtils.canonicalizeExistingPath(
      sandbox.workspacePath('changes', 'shared-refresh')
    );

    await runWorkspaceCommand(['targets', 'shared-refresh', '--remove', 'docs', '--json'], sandbox.workspaceRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(JSON.parse(output)).toEqual({
      workspaceRoot: canonicalWorkspaceRoot,
      change: {
        id: 'shared-refresh',
        path: canonicalChangePath,
      },
      targets: ['app', 'api'],
      addedTargets: [],
      removedTargets: ['docs'],
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('fails loudly when removing a materialized target alias', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    await applyWorkspaceChange({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      repo: 'app',
    });

    await expect(
      runWorkspaceCommand(['targets', 'shared-refresh', '--remove', 'app'], sandbox.workspaceRoot)
    ).rejects.toThrow('process.exit(1)');

    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `Cannot remove target alias 'app' on workspace change 'shared-refresh' because repo-local execution already exists at ${sandbox.repoPath('app', 'openspec', 'changes', 'shared-refresh')}.`
      )
    );
  });

  it('fails loudly when adding a target alias whose same-id repo-local execution already exists', async () => {
    const sandbox = await createSandbox();
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });

    const repoLocalChangeDir = sandbox.repoPath('docs', 'openspec', 'changes', 'shared-refresh');
    await fs.mkdir(repoLocalChangeDir, { recursive: true });
    await fs.writeFile(path.join(repoLocalChangeDir, 'proposal.md'), '# repo-local docs change\n', 'utf-8');

    await expect(
      runWorkspaceCommand(['targets', 'shared-refresh', '--add', 'docs'], sandbox.workspaceRoot)
    ).rejects.toThrow('process.exit(1)');

    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `Cannot add target alias 'docs' on workspace change 'shared-refresh' because repo-local execution already exists at ${repoLocalChangeDir}.`
      )
    );
  });
});
