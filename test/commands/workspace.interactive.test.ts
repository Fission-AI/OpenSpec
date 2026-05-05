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

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
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
    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalStdinTTY = (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;

    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
      OPENSPEC_TELEMETRY: '0',
    };
    delete process.env.CI;
    delete process.env.OPEN_SPEC_INTERACTIVE;
    process.chdir(tempDir);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

  function readLocalState(workspaceName: string) {
    const workspaceRoot = getManagedWorkspaceRoot(workspaceName);
    return parseWorkspaceLocalState(
      fs.readFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'utf-8')
    );
  }

  it('asks for the workspace name first and validates kebab-case before asking for links', async () => {
    const api = mkdir('repos/api');
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
    select.mockResolvedValueOnce('finish');

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
    expect(readLocalState('platform').paths).toEqual({ api });
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

  it('lets users add another path and rename an inferred link-name conflict', async () => {
    const firstApi = mkdir('repos/current/api');
    const secondApi = mkdir('repos/archive/api');
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
        expect(options.validate?.('api')).toBe(`Link name 'api' is already linked to ${firstApi}.`);
        expect(options.validate?.('api-archive')).toBe(true);
        return 'api-archive';
      }

      throw new Error(`Unexpected input prompt: ${options.message}`);
    });
    select.mockResolvedValueOnce('add').mockResolvedValueOnce('finish');

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
      `Link name 'api' is already linked to ${firstApi}.`
    );
    expect(readLocalState('platform').paths).toEqual({
      api: firstApi,
      'api-archive': secondApi,
    });
  });

  it('asks for a link name when the inferred basename is invalid', async () => {
    const linkedRoot = path.parse(tempDir).root;
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
    select.mockResolvedValueOnce('finish');

    await runWorkspaceCommand(['setup']);

    expect(process.exitCode).toBeUndefined();
    expect(input.mock.calls.map((call) => call[0].message)).toEqual([
      'Workspace name:',
      'Repo or folder path:',
      'Link name:',
    ]);
    expect(confirm).not.toHaveBeenCalled();
    expect(readLocalState('platform').paths).toEqual({
      root: linkedRoot,
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
});
