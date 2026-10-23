import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { InitCommand } from '../../src/core/init.js';
import { getGlobalConfig } from '../../src/core/global-config.js';

const { confirmMock, searchableMultiSelectMock, runClaudeMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  searchableMultiSelectMock: vi.fn(),
  runClaudeMock: vi.fn((_args: string[]) => ({ ok: true, output: '' })),
}));

vi.mock('@inquirer/prompts', () => ({ confirm: confirmMock }));
vi.mock('../../src/ui/welcome-screen.js', () => ({ showWelcomeScreen: vi.fn() }));
vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: searchableMultiSelectMock,
}));
// Never run the real `claude` binary from a test.
vi.mock('../../src/core/machine-setup.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/machine-setup.js')>();
  return {
    ...actual,
    setupMachine: (options = {}) => actual.setupMachine({ ...options, runClaude: runClaudeMock }),
  };
});

describe('init offers a machine install', () => {
  let root: string;
  let project: string;
  let home: string;
  let output: string[];
  const keys = ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'HOME', 'USERPROFILE', 'CLAUDE_CONFIG_DIR'] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  async function runInit(): Promise<void> {
    const init = new InitCommand({ force: true });
    vi.spyOn(init as any, 'canPromptInteractively').mockReturnValue(true);
    await init.execute(project);
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-init-machine-'));
    project = path.join(root, 'project');
    home = path.join(root, 'home');
    fs.mkdirSync(project);
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    process.env.XDG_CONFIG_HOME = path.join(root, 'config');
    process.env.XDG_DATA_HOME = path.join(root, 'data');
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    delete process.env.CLAUDE_CONFIG_DIR;
    output = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      output.push(args.join(' '));
    });
    confirmMock.mockReset();
    searchableMultiSelectMock.mockReset();
    runClaudeMock.mockClear();
  });

  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('installs once for the machine and writes no project skill files when accepted', async () => {
    confirmMock.mockResolvedValue(true);
    await runInit();

    expect(confirmMock.mock.calls[0][0].message).toContain('Install OpenSpec once on this machine for Claude Code');
    expect(searchableMultiSelectMock).not.toHaveBeenCalled();
    expect(runClaudeMock).toHaveBeenCalledTimes(2);
    expect(fs.existsSync(path.join(root, 'data', 'openspec', 'claude-plugin', 'skills', 'openspec-beta', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(project, '.claude'))).toBe(false);
    expect(fs.existsSync(path.join(project, 'openspec', 'config.yaml'))).toBe(true);
    expect(getGlobalConfig().machineSetup?.claudePlugin).toBe(true);
    expect(output.join('\n')).toContain('Start your first change: /openspec-beta:propose "your idea" (Claude Code)');
  });

  it('falls back to the project tool picker when declined', async () => {
    confirmMock.mockResolvedValue(false);
    searchableMultiSelectMock.mockResolvedValue(['claude']);
    await runInit();

    expect(searchableMultiSelectMock).toHaveBeenCalledTimes(1);
    expect(runClaudeMock).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(project, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(getGlobalConfig().machineSetup).toBeUndefined();
  });

  it('reuses an existing machine install without registering again', async () => {
    confirmMock.mockResolvedValue(true);
    await runInit();
    runClaudeMock.mockClear();
    fs.rmSync(path.join(project, 'openspec'), { recursive: true, force: true });

    await runInit();
    expect(confirmMock.mock.calls[1][0].message).toContain('already installed on this machine');
    expect(runClaudeMock).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(project, '.claude'))).toBe(false);
  });

  it('asks nothing when no agents are installed', async () => {
    fs.rmSync(path.join(home, '.claude'), { recursive: true, force: true });
    searchableMultiSelectMock.mockResolvedValue(['claude']);
    await runInit();

    expect(confirmMock).not.toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('on this machine'),
    }));
    expect(searchableMultiSelectMock).toHaveBeenCalledTimes(1);
  });
});
