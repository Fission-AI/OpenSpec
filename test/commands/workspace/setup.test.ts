import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileSystemUtils } from '../../../src/utils/file-system.js';

const { failMock, inputMock, confirmMock, launchMock, selectMock } = vi.hoisted(() => ({
  failMock: vi.fn(),
  inputMock: vi.fn(),
  confirmMock: vi.fn(),
  launchMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    fail: failMock,
  })),
}));

vi.mock('@inquirer/prompts', () => ({
  input: inputMock,
  confirm: confirmMock,
  select: selectMock,
}));

vi.mock('../../../src/core/workspace/open-launch.js', () => ({
  launchWorkspaceOpenSession: launchMock,
}));

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

async function createRepoWithOpenSpec(root: string, name: string): Promise<string> {
  const repoRoot = path.join(root, name);
  await fs.mkdir(path.join(repoRoot, 'openspec', 'changes', 'archive'), { recursive: true });
  await fs.mkdir(path.join(repoRoot, 'openspec', 'specs'), { recursive: true });
  return repoRoot;
}

describe('workspace setup command integration', () => {
  let tempRoot: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalStdinTTY: boolean | undefined;
  let originalExitCode: number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-setup-test-'));
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');
    originalStdinTTY = (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });

    inputMock.mockReset();
    confirmMock.mockReset();
    launchMock.mockReset();
    launchMock.mockResolvedValue(undefined);
    selectMock.mockReset();
    failMock.mockReset();
  });

  afterEach(async () => {
    process.env = originalEnv;
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = originalStdinTTY;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('creates a workspace, registers a repo, validates it, and prints next steps', async () => {
    const repoRoot = await createRepoWithOpenSpec(tempRoot, 'openspec');
    const canonicalRepoRoot = FileSystemUtils.canonicalizeExistingPath(repoRoot);
    inputMock
      .mockResolvedValueOnce('demo-wizard')
      .mockResolvedValueOnce(repoRoot)
      .mockResolvedValueOnce('openspec')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('');
    selectMock.mockResolvedValueOnce('claude');
    confirmMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    await runWorkspaceCommand(['setup'], tempRoot);

    const workspaceRoot = path.join(tempRoot, 'xdg-data', 'openspec', 'workspaces', 'demo-wizard');
    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    expect(output).toContain(`Workspace 'demo-wizard' created at ${workspaceRoot}`);
    expect(output).toContain(`Registered repo alias 'openspec' -> ${canonicalRepoRoot}`);
    expect(output).toContain(`Workspace doctor passed for ${workspaceRoot}`);
    expect(output).toContain('Workspace setup complete.');
    expect(output).toContain('Preferred agent: claude');
    expect(output).toContain(`cd ${workspaceRoot}`);
    expect(output).toContain('openspec new change <id> --targets openspec');

    expect(await fs.readFile(path.join(workspaceRoot, '.openspec', 'workspace.yaml'), 'utf-8')).toContain('openspec:');
    const localOverlay = await fs.readFile(path.join(workspaceRoot, '.openspec', 'local.yaml'), 'utf-8');
    expect(localOverlay).toContain(canonicalRepoRoot);
    expect(localOverlay).toContain('preferredAgent: claude');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('can open the workspace immediately for github copilot', async () => {
    const repoRoot = await createRepoWithOpenSpec(tempRoot, 'openspec');
    inputMock
      .mockResolvedValueOnce('demo-open-now')
      .mockResolvedValueOnce(repoRoot)
      .mockResolvedValueOnce('openspec')
      .mockResolvedValueOnce('Core Team')
      .mockResolvedValueOnce('Start here');
    selectMock.mockResolvedValueOnce('github-copilot');
    confirmMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await runWorkspaceCommand(['setup'], tempRoot);

    const workspaceRoot = path.join(tempRoot, 'xdg-data', 'openspec', 'workspaces', 'demo-open-now');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(workspaceRoot);
    const canonicalRepoRoot = FileSystemUtils.canonicalizeExistingPath(repoRoot);
    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({
      workspaceRoot: canonicalWorkspaceRoot,
      mode: 'workspace-root',
      agent: 'github-copilot',
      change: null,
      attachedRepos: [
        {
          alias: 'openspec',
          path: canonicalRepoRoot,
          owner: 'Core Team',
          handoff: 'Start here',
        },
      ],
      editorSurface: expect.objectContaining({
        path: path.join(canonicalWorkspaceRoot, '.openspec', 'workspace-open', 'github-copilot', 'planning.code-workspace'),
      }),
    }));
    expect(
      await fs.readFile(
        path.join(workspaceRoot, '.openspec', 'workspace-open', 'github-copilot', 'planning.code-workspace'),
        'utf-8'
      )
    ).toContain('"name": "workspace"');
    expect(
      await fs.readFile(
        path.join(workspaceRoot, '.openspec', 'workspace-open', 'github-copilot', 'planning.code-workspace'),
        'utf-8'
      )
    ).toContain('"name": "openspec"');
    expect(
      await fs.readFile(path.join(workspaceRoot, '.github', 'prompts', 'opsx-workspace-open.prompt.md'), 'utf-8')
    ).toContain('description: Prepare a workspace-root coordination session');
    expect(
      await fs.readFile(path.join(workspaceRoot, '.openspec', 'local.yaml'), 'utf-8')
    ).toContain('preferredAgent: github-copilot');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });
});
