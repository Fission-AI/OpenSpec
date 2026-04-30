import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertWorkspaceLayout } from '../../helpers/workspace-assertions.js';

const { failMock } = vi.hoisted(() => ({
  failMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    fail: failMock,
  })),
}));

async function runWorkspaceCommand(args: string[]): Promise<void> {
  const { registerWorkspaceCommand } = await import('../../../src/commands/workspace.js');
  const program = new Command();
  registerWorkspaceCommand(program);
  await program.parseAsync(['node', 'openspec', 'workspace', ...args]);
}

async function readWorkspaceSnapshot(workspaceRoot: string): Promise<Record<string, string>> {
  const entries = [
    '.gitignore',
    path.join('.openspec', 'workspace.yaml'),
    path.join('.openspec', 'local.yaml'),
  ];

  const snapshotEntries = await Promise.all(
    entries.map(async (entry) => [entry, await fs.readFile(path.join(workspaceRoot, entry), 'utf-8')] as const)
  );

  return Object.fromEntries(snapshotEntries);
}

describe('workspace command integration', () => {
  let tempRoot: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();

    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-command-'));
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });

    failMock.mockReset();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(tempRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates a workspace with the expected human-readable output', async () => {
    await runWorkspaceCommand(['create', 'alpha-team']);

    const workspaceRoot = path.join(tempRoot, 'xdg-data', 'openspec', 'workspaces', 'alpha-team');
    await assertWorkspaceLayout(workspaceRoot);

    expect(consoleLogSpy).toHaveBeenCalledWith(`Workspace 'alpha-team' created at ${workspaceRoot}`);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Created: .openspec/workspace.yaml, .openspec/local.yaml, changes/'
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
  });

  it('creates a workspace with clean JSON output when requested', async () => {
    await runWorkspaceCommand(['create', 'alpha-json', '--json']);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();

    const output = consoleLogSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(String(output));

    expect(parsed.name).toBe('alpha-json');
    expect(parsed.workspaceRoot).toBe(path.join(tempRoot, 'xdg-data', 'openspec', 'workspaces', 'alpha-json'));
    expect(parsed.gitignoreStatus).toBe('created');

    await assertWorkspaceLayout(parsed.workspaceRoot);
  });

  it('fails duplicate create attempts without mutating the existing workspace', async () => {
    await runWorkspaceCommand(['create', 'alpha-duplicate']);

    const workspaceRoot = path.join(tempRoot, 'xdg-data', 'openspec', 'workspaces', 'alpha-duplicate');
    const beforeSnapshot = await readWorkspaceSnapshot(workspaceRoot);

    consoleLogSpy.mockClear();
    failMock.mockClear();

    await expect(runWorkspaceCommand(['create', 'alpha-duplicate'])).rejects.toThrow('process.exit(1)');

    const afterSnapshot = await readWorkspaceSnapshot(workspaceRoot);

    expect(afterSnapshot).toEqual(beforeSnapshot);
    expect(failMock).toHaveBeenCalledWith(
      expect.stringContaining("Workspace 'alpha-duplicate' already exists")
    );
  });

  it('surfaces invalid workspace names with actionable errors', async () => {
    await expect(runWorkspaceCommand(['create', 'Alpha Team'])).rejects.toThrow('process.exit(1)');

    expect(failMock).toHaveBeenCalledWith(expect.stringContaining("Invalid workspace name 'Alpha Team'"));
    expect(failMock).toHaveBeenCalledWith(expect.stringContaining('kebab-case'));
  });
});
