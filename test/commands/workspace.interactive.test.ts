import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getManagedWorkspaceRoot,
  getWorkspaceLocalStatePath,
  parseWorkspaceLocalState,
} from '../../src/core/workspace/index.js';

const searchableMultiSelectMock = vi.hoisted(() => vi.fn(async () => []));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  default: searchableMultiSelectMock,
  searchableMultiSelect: searchableMultiSelectMock,
}));

async function runWorkspaceCommand(args: string[]): Promise<void> {
  const { registerWorkspaceCommand } = await import('../../src/commands/workspace.js');
  const program = new Command();
  registerWorkspaceCommand(program);
  await program.parseAsync(['node', 'openspec', 'workspace', ...args]);
}

async function getPromptMocks(): Promise<{
  input: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
}> {
  const prompts = await import('@inquirer/prompts');
  return {
    input: prompts.input as unknown as ReturnType<typeof vi.fn>,
    confirm: prompts.confirm as unknown as ReturnType<typeof vi.fn>,
    select: prompts.select as unknown as ReturnType<typeof vi.fn>,
  };
}

describe('workspace command interactive flows', () => {
  let tempDir: string;
  let dataHome: string;
  let configHome: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalStdinTTY: boolean | undefined;
  let originalExitCode: string | number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-interactive-'));
    dataHome = path.join(tempDir, 'data');
    configHome = path.join(tempDir, 'config');
    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalStdinTTY = (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;

    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPENSPEC_TELEMETRY: '0',
    };
    delete process.env.CI;
    delete process.env.OPEN_SPEC_INTERACTIVE;
    process.chdir(tempDir);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    searchableMultiSelectMock.mockReset();
    searchableMultiSelectMock.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = originalStdinTTY;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function expectedExistingPath(existingPath: string): string {
    return process.platform === 'win32' ? fs.realpathSync.native(existingPath) : existingPath;
  }

  function readLocalState(workspaceName: string) {
    const workspaceRoot = getManagedWorkspaceRoot(workspaceName);
    return parseWorkspaceLocalState(
      fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')
    );
  }

  it('asks for the workspace name first and validates kebab-case before asking for links', async () => {
    const api = mkdir('repos/api');
    const expectedApi = expectedExistingPath(api);
    const { input, confirm, select } = await getPromptMocks();

    input.mockImplementation(async (options: { message: string; validate?: (value: string) => true | string }) => {
      if (options.message === 'Workspace name:') {
        expect(options.validate?.('Bad_Name')).toBe(
          'Workspace names must be kebab-case with lowercase letters, numbers, and single hyphen separators.'
        );
        return 'platform';
      }

      if (options.message === 'Repo or folder path:') {
        expect(options.validate?.('missing-api')).toBe('Enter an existing repo or folder path.');
        return api;
      }

      throw new Error(`Unexpected input prompt: ${options.message}`);
    });
    select.mockResolvedValueOnce('finish').mockResolvedValueOnce('editor');

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBeUndefined();
    expect(input.mock.calls.map((call) => call[0].message)).toEqual([
      'Workspace name:',
      'Repo or folder path:',
    ]);
    expect(input.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        theme: expect.objectContaining({ prefix: '' }),
      })
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(select.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: 'Continue',
        default: 'finish',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'finish' }),
          expect.objectContaining({ value: 'add' }),
        ]),
      })
    );
    expect(readLocalState('platform').paths).toEqual({ api: expectedApi });
  });

  it('handles prompt cancellation without printing the raw SIGINT error', async () => {
    const { input } = await getPromptMocks();
    const cancellationError = new Error('User force closed the prompt with SIGINT');
    cancellationError.name = 'ExitPromptError';
    input.mockRejectedValueOnce(cancellationError);

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBe(130);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Cancelled.');
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('User force closed the prompt with SIGINT')
    );
  });

  it('asks for a preferred opener after links and records the selected opener', async () => {
    const api = mkdir('repos/api');
    const binDir = mkdir('bin');
    const codePath = path.join(binDir, process.platform === 'win32' ? 'code.cmd' : 'code');
    fs.writeFileSync(codePath, '');
    fs.chmodSync(codePath, 0o755);
    process.env.PATH = binDir;
    const { input, confirm, select } = await getPromptMocks();

    input.mockImplementation(async (options: { message: string }) => {
      if (options.message === 'Workspace name:') {
        return 'platform';
      }

      if (options.message === 'Repo or folder path:') {
        return api;
      }

      throw new Error(`Unexpected input prompt: ${options.message}`);
    });
    select.mockImplementation(async (options: { message: string; choices?: Array<{ name: string; value: string }> }) => {
      if (options.message === 'Continue') {
        return 'finish';
      }

      if (options.message === 'Preferred opener:') {
        expect(options.choices?.slice(0, 2).map((choice) => choice.value).sort()).toEqual([
          'editor',
          'github-copilot',
        ]);
        expect(options.choices?.find((choice) => choice.value === 'codex')?.name).toContain(
          'codex not found on PATH'
        );
        return 'github-copilot';
      }

      throw new Error(`Unexpected select prompt: ${options.message}`);
    });

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
    expect(readLocalState('platform').preferred_opener).toEqual({
      kind: 'agent',
      id: 'github-copilot',
    });
  });

  it('asks which agents get OpenSpec skills and preselects the preferred opener', async () => {
    const api = mkdir('repos/api');
    const binDir = mkdir('bin');
    const codexPath = path.join(binDir, process.platform === 'win32' ? 'codex.cmd' : 'codex');
    fs.writeFileSync(codexPath, '');
    fs.chmodSync(codexPath, 0o755);
    process.env.PATH = binDir;
    const { input, select } = await getPromptMocks();

    input.mockImplementation(async (options: { message: string }) => {
      if (options.message === 'Workspace name:') {
        return 'platform';
      }

      if (options.message === 'Repo or folder path:') {
        return api;
      }

      throw new Error(`Unexpected input prompt: ${options.message}`);
    });
    select.mockImplementation(async (options: { message: string }) => {
      if (options.message === 'Continue') {
        return 'finish';
      }

      if (options.message === 'Preferred opener:') {
        return 'codex';
      }

      throw new Error(`Unexpected select prompt: ${options.message}`);
    });
    searchableMultiSelectMock.mockImplementationOnce(async (options: {
      message: string;
      choices: Array<{ value: string; preSelected?: boolean }>;
    }) => {
      expect(options.message).toBe('Which agents should get OpenSpec skills in this workspace?');
      expect(options.choices.find((choice) => choice.value === 'codex')?.preSelected).toBe(true);
      expect(options.choices.find((choice) => choice.value === 'claude')?.preSelected).toBe(false);
      return ['codex', 'claude'];
    });

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBeUndefined();
    expect(searchableMultiSelectMock).toHaveBeenCalledTimes(1);
    expect(readLocalState('platform').workspace_skills).toEqual(
      expect.objectContaining({
        selected_agents: ['codex', 'claude'],
        last_applied_workflow_ids: ['propose', 'explore', 'apply', 'sync', 'archive'],
      })
    );
  });

  it('lets users add another path and rename an inferred link-name conflict', async () => {
    const firstApi = mkdir('repos/current/api');
    const secondApi = mkdir('repos/archive/api');
    const expectedFirstApi = expectedExistingPath(firstApi);
    const expectedSecondApi = expectedExistingPath(secondApi);
    const { input, confirm, select } = await getPromptMocks();

    input.mockImplementation(async (options: { message: string; validate?: (value: string) => true | string }) => {
      if (options.message === 'Workspace name:') {
        return 'platform';
      }

      if (options.message === 'Repo or folder path:') {
        return firstApi;
      }

      if (options.message === 'Another repo or folder path:') {
        return secondApi;
      }

      if (options.message === 'Link name:') {
        expect(options.validate?.('api')).toBe(
          `Link name 'api' is already linked to ${expectedFirstApi}.`
        );
        expect(options.validate?.('api-archive')).toBe(true);
        return 'api-archive';
      }

      throw new Error(`Unexpected input prompt: ${options.message}`);
    });
    select.mockResolvedValueOnce('add').mockResolvedValueOnce('finish').mockResolvedValueOnce('editor');

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBeUndefined();
    expect(input.mock.calls.map((call) => call[0].message)).toEqual([
      'Workspace name:',
      'Repo or folder path:',
      'Another repo or folder path:',
      'Link name:',
    ]);
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `Link name 'api' is already linked to ${expectedFirstApi}.`
    );
    expect(readLocalState('platform').paths).toEqual({
      api: expectedFirstApi,
      'api-archive': expectedSecondApi,
    });
  });

  it('asks for a link name when the inferred basename is invalid', async () => {
    const linkedRoot = path.parse(tempDir).root;
    const expectedLinkedRoot = expectedExistingPath(linkedRoot);
    const { input, confirm, select } = await getPromptMocks();

    input.mockImplementation(async (options: { message: string; validate?: (value: string) => true | string }) => {
      if (options.message === 'Workspace name:') {
        return 'platform';
      }

      if (options.message === 'Repo or folder path:') {
        return linkedRoot;
      }

      if (options.message === 'Link name:') {
        expect(options.validate?.('')).toBe('Workspace link name must not be empty');
        expect(options.validate?.('root')).toBe(true);
        return 'root';
      }

      throw new Error(`Unexpected input prompt: ${options.message}`);
    });
    select.mockResolvedValueOnce('finish').mockResolvedValueOnce('editor');

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBeUndefined();
    expect(input.mock.calls.map((call) => call[0].message)).toEqual([
      'Workspace name:',
      'Repo or folder path:',
      'Link name:',
    ]);
    expect(confirm).not.toHaveBeenCalled();
    expect(readLocalState('platform').paths).toEqual({
      root: expectedLinkedRoot,
    });
  });

  it('shows an interactive workspace picker when multiple workspaces are known', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');
    const { select } = await getPromptMocks();

    await runWorkspaceCommand(['setup', '--no-interactive', '--name', 'platform', '--link', `api=${api}`]);
    await runWorkspaceCommand(['setup', '--no-interactive', '--name', 'checkout-web', '--link', `web=${web}`]);
    consoleLogSpy.mockClear();

    select.mockResolvedValueOnce('checkout-web');

    await runWorkspaceCommand(['doctor']);

    expect(process.exitCode).toBeUndefined();
    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: 'Select workspace:',
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('platform'),
            value: 'platform',
          }),
          expect.objectContaining({
            name: expect.stringContaining('checkout-web'),
            value: 'checkout-web',
          }),
        ]),
      })
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Workspace: checkout-web');
  });

  it('prompts for an opener during workspace open when no preference is stored', async () => {
    const api = mkdir('repos/api');
    const binDir = mkdir('bin');
    const codePath = path.join(binDir, process.platform === 'win32' ? 'code.cmd' : 'code');
    fs.writeFileSync(
      codePath,
      process.platform === 'win32' ? '@echo off\r\nexit /B 0\r\n' : '#!/bin/sh\nexit 0\n'
    );
    fs.chmodSync(codePath, 0o755);
    const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    process.env[pathKey] = `${binDir}${path.delimiter}${process.env[pathKey] ?? ''}`;
    const { select } = await getPromptMocks();

    await runWorkspaceCommand(['setup', '--no-interactive', '--name', 'platform', '--link', `api=${api}`]);
    consoleLogSpy.mockClear();
    select.mockResolvedValueOnce('editor');

    await runWorkspaceCommand(['open']);

    expect(process.exitCode).toBeUndefined();
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Open with:',
      })
    );
    const openerPrompt = select.mock.calls.find(([options]) => options.message === 'Open with:')?.[0];
    expect(openerPrompt?.default).toBe('editor');
    expect(openerPrompt?.choices.map((choice: { value: string }) => choice.value)).toEqual(
      expect.arrayContaining(['editor', 'github-copilot'])
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Opening workspace: platform');
    expect(readLocalState('platform').preferred_opener).toBeUndefined();
  });

  it('fails workspace open without prompting when no opener is available', async () => {
    const api = mkdir('repos/api');
    const { select } = await getPromptMocks();
    process.env.PATH = '';

    await runWorkspaceCommand(['setup', '--no-interactive', '--name', 'platform', '--link', `api=${api}`]);
    consoleErrorSpy.mockClear();

    await runWorkspaceCommand(['open']);

    expect(process.exitCode).toBe(1);
    expect(select).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No supported workspace opener is available on PATH.')
    );
  });

  it('shows the workspace picker for workspace open when multiple workspaces are known', async () => {
    const api = mkdir('repos/api');
    const web = mkdir('repos/web');
    const binDir = mkdir('bin');
    const codePath = path.join(binDir, process.platform === 'win32' ? 'code.cmd' : 'code');
    fs.writeFileSync(
      codePath,
      process.platform === 'win32' ? '@echo off\r\nexit /B 0\r\n' : '#!/bin/sh\nexit 0\n'
    );
    fs.chmodSync(codePath, 0o755);
    process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH ?? ''}`;
    const { select } = await getPromptMocks();

    await runWorkspaceCommand([
      'setup',
      '--no-interactive',
      '--name',
      'platform',
      '--link',
      `api=${api}`,
      '--opener',
      'editor',
    ]);
    await runWorkspaceCommand([
      'setup',
      '--no-interactive',
      '--name',
      'checkout-web',
      '--link',
      `web=${web}`,
      '--opener',
      'editor',
    ]);
    consoleLogSpy.mockClear();
    select.mockResolvedValueOnce('checkout-web');

    await runWorkspaceCommand(['open']);

    expect(process.exitCode).toBeUndefined();
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Select workspace:',
      })
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Opening workspace: checkout-web');
  });
});
