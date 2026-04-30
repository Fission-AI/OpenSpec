import path from 'node:path';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import { createManagedWorkspaceRoot } from '../../../src/core/workspace/create.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';

const { failMock, launchMock, selectMock } = vi.hoisted(() => ({
  failMock: vi.fn(),
  launchMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    fail: failMock,
  })),
}));

vi.mock('@inquirer/prompts', () => ({
  select: selectMock,
}));

vi.mock('../../../src/core/workspace/open-launch.js', () => ({
  launchWorkspaceOpenSession: launchMock,
}));

const sandboxes: WorkspaceSandbox[] = [];
const tempRoots: string[] = [];

async function createSandbox(
  fixture: 'happy-path' | 'dirty' = 'dirty'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
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
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('workspace open command integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;
  let originalStdinTTY: boolean | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = { ...process.env };
    originalStdinTTY = (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = false;
    process.exitCode = undefined;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });
    failMock.mockReset();
    launchMock.mockReset();
    launchMock.mockResolvedValue(undefined);
    selectMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = originalStdinTTY;
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it('launches a workspace-root session by default with ready registered repos attached', async () => {
    const sandbox = await createSandbox('dirty');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    await runWorkspaceCommand(['open'], sandbox.workspaceRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Opening workspace-root session for claude.');
    expect(output).toContain(`Workspace root: ${canonicalWorkspaceRoot}`);
    expect(output).toContain('Attached repos: api, app');
    expect(output).toContain('Registered repos available: api, app, docs');
    expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({
      workspaceRoot: canonicalWorkspaceRoot,
      mode: 'workspace-root',
      agent: 'claude',
      attachedRepos: [
        { alias: 'api', path: sandbox.repoPaths.api },
        { alias: 'app', path: sandbox.repoPaths.app },
      ],
    }));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('prints a workspace-root surface in prepare-only mode', async () => {
    const sandbox = await createSandbox('dirty');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    await runWorkspaceCommand(['open', '--prepare-only'], sandbox.workspaceRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Prepared workspace-root open surface for claude.');
    expect(output).toContain(`Workspace root: ${canonicalWorkspaceRoot}`);
    expect(output).toContain('Registered repos:');
    expect(output).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(output).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(output).toContain(`- docs: ${sandbox.overlayRepoPaths.docs}`);
    expect(output).toContain('Active workspace changes:');
    expect(output).toContain('- shared-cleanup');
    expect(output).toContain('Instruction surface (.claude/commands/opsx/workspace-open.md):');
    expect(output).toContain('Mode: workspace-root');
    expect(launchMock).not.toHaveBeenCalled();
  });

  it('prints only the targeted repo aliases for a change-scoped open', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const canonicalChangePath = FileSystemUtils.canonicalizeExistingPath(
      sandbox.workspacePath('changes', 'shared-refresh')
    );

    await runWorkspaceCommand(['open', '--change', 'shared-refresh', '--prepare-only'], sandbox.workspaceRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Prepared change-scoped open surface for claude.');
    expect(output).toContain('Change: shared-refresh');
    expect(output).toContain(`Change path: ${canonicalChangePath}`);
    expect(output).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(output).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(output).not.toContain(`- docs: ${sandbox.overlayRepoPaths.docs}`);
    expect(output).toContain("Repo-local materialization still happens with 'openspec apply --change shared-refresh --repo <alias>'.");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('fails with actionable targeted repo diagnostics when a change target is stale', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-broken', {
      targets: 'app,docs',
    });

    await expect(
      runWorkspaceCommand(['open', '--change', 'shared-broken'], sandbox.workspaceRoot)
    ).rejects.toThrow('process.exit(1)');

    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining(`Could not open workspace change 'shared-broken' because 1 targeted repo is unresolved:`)
    );
    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining(`Target alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`)
    );
    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining(`Run 'openspec workspace doctor' and repair the failing alias before retrying.`)
    );
  });

  it('prints a codex-targeted surface when requested explicitly', async () => {
    const sandbox = await createSandbox('dirty');
    const originalCodexHome = process.env.CODEX_HOME;
    const codexHome = sandbox.workspacePath('.codex-home');
    process.env.CODEX_HOME = codexHome;

    try {
      await runWorkspaceCommand(['open', '--agent', 'codex', '--prepare-only'], sandbox.workspaceRoot);

      const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(output).toContain('Prepared workspace-root open surface for codex.');
      expect(output).toContain(`Instruction surface (${path.join(codexHome, 'prompts', 'opsx-workspace-open.md')}):`);
      expect(output).toContain('description: Prepare a workspace-root coordination session');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(failMock).not.toHaveBeenCalled();
      expect(processExitSpy).not.toHaveBeenCalled();
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('prints a github-copilot workspace surface when requested explicitly', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    await runWorkspaceCommand(['open', '--change', 'shared-refresh', '--agent', 'github-copilot', '--prepare-only'], sandbox.workspaceRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Prepared change-scoped open surface for github-copilot.');
    expect(output).toContain(
      `Editor surface (vscode-workspace): ${path.join(canonicalWorkspaceRoot, '.openspec', 'workspace-open', 'github-copilot', 'shared-refresh.code-workspace')}`
    );
    expect(output).toContain('Instruction surface (.github/prompts/opsx-workspace-open.prompt.md):');
    expect(output).toContain('description: Prepare a change-scoped workspace session for shared-refresh');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('fails cleanly for unsupported workspace-open agents', async () => {
    const sandbox = await createSandbox('dirty');

    await expect(
      runWorkspaceCommand(['open', '--agent', 'cursor'], sandbox.workspaceRoot)
    ).rejects.toThrow('process.exit(1)');

    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining("Unsupported agent 'cursor' for workspace open. Supported agents: claude, codex, github-copilot.")
    );
  });

  it('prompts once for a preferred agent on legacy workspaces and persists it', async () => {
    const sandbox = await createSandbox('dirty');
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    selectMock.mockResolvedValueOnce('codex');

    await runWorkspaceCommand(['open'], sandbox.workspaceRoot);

    expect(selectMock).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Preferred agent for this workspace:',
    }));
    expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({
      agent: 'codex',
      mode: 'workspace-root',
    }));
    expect(
      await fs.readFile(path.join(sandbox.workspaceRoot, '.openspec', 'local.yaml'), 'utf-8')
    ).toContain('preferredAgent: codex');
  });

  it('selects the only managed workspace automatically when run outside a workspace root', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-open-single-'));
    tempRoots.push(tempRoot);
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');

    const workspace = await createManagedWorkspaceRoot('solo-workspace');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(workspace.workspaceRoot);

    await runWorkspaceCommand(['open', '--prepare-only'], tempRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Prepared workspace-root open surface for claude.');
    expect(output).toContain(`Workspace root: ${canonicalWorkspaceRoot}`);
    expect(selectMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('lists locally managed workspaces', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-list-'));
    tempRoots.push(tempRoot);
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');

    const alphaWorkspace = await createManagedWorkspaceRoot('alpha-workspace');
    const betaWorkspace = await createManagedWorkspaceRoot('beta-workspace');

    await runWorkspaceCommand(['list'], tempRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('Managed workspaces:');
    expect(output).toContain(`- alpha-workspace: ${alphaWorkspace.workspaceRoot}`);
    expect(output).toContain(`- beta-workspace: ${betaWorkspace.workspaceRoot}`);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('lists available workspaces when doctor runs outside a workspace root', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-doctor-outside-'));
    tempRoots.push(tempRoot);
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');

    const workspace = await createManagedWorkspaceRoot('poc-workspace');

    await expect(runWorkspaceCommand(['doctor'], tempRoot)).rejects.toThrow('process.exit(1)');

    expect(failMock).toHaveBeenCalledWith(expect.stringContaining(
      'Could not find a managed workspace from '
    ));
    expect(failMock).toHaveBeenCalledWith(expect.stringContaining('Available managed workspaces:'));
    expect(failMock).toHaveBeenCalledWith(expect.stringContaining(
      `- poc-workspace: ${workspace.workspaceRoot}`
    ));
    expect(failMock).toHaveBeenCalledWith(expect.stringContaining(
      'Next step: cd into one of the workspace roots above, then rerun the command.'
    ));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('prompts for a workspace when multiple managed workspaces exist and the terminal is interactive', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-open-multi-'));
    tempRoots.push(tempRoot);
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;

    const alphaWorkspace = await createManagedWorkspaceRoot('alpha-workspace');
    const betaWorkspace = await createManagedWorkspaceRoot('beta-workspace');
    const canonicalBetaWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(betaWorkspace.workspaceRoot);
    selectMock.mockResolvedValueOnce(betaWorkspace.workspaceRoot);

    await runWorkspaceCommand(['open', '--prepare-only'], tempRoot);

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(selectMock).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Which workspace should OpenSpec open?',
      choices: [
        expect.objectContaining({
          name: 'alpha-workspace',
          value: alphaWorkspace.workspaceRoot,
        }),
        expect.objectContaining({
          name: 'beta-workspace',
          value: betaWorkspace.workspaceRoot,
        }),
      ],
    }));
    expect(output).toContain(`Workspace root: ${canonicalBetaWorkspaceRoot}`);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });
});
