import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getGlobalDataDir,
  getContextStoreMetadataPath,
  readContextStoreMetadataState,
  readContextStoreRegistryState,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

async function runContextStoreCommand(args: string[]): Promise<void> {
  const { registerContextStoreCommand } = await import('../../src/commands/context-store.js');
  const program = new Command();
  registerContextStoreCommand(program);
  await program.parseAsync(['node', 'openspec', 'context-store', ...args]);
}

async function getPromptMocks(): Promise<{
  confirm: ReturnType<typeof vi.fn>;
}> {
  const prompts = await import('@inquirer/prompts');
  return {
    confirm: prompts.confirm as unknown as ReturnType<typeof vi.fn>,
  };
}

describe('context-store command', () => {
  let tempDir: string;
  let dataHome: string;
  let configHome: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalStdinTTY: boolean | undefined;
  let originalExitCode: string | number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn> | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    vi.resetModules();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-context-store-command-'));
    dataHome = path.join(tempDir, 'data');
    configHome = path.join(tempDir, 'config');
    env = {
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });

    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalStdinTTY = (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = originalStdinTTY;
    process.exitCode = originalExitCode;
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    vi.clearAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function expectedExistingPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function parseJson(result: RunCLIResult): any {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(
        `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
      );
    }
  }

  it('sets up a context store at ./<id> without Git in non-interactive JSON mode', async () => {
    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    const storeRoot = expectedExistingPath(path.join(tempDir, 'team-context'));

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = parseJson(result);
    expect(payload.context_store).toEqual({
      id: 'team-context',
      root: storeRoot,
      metadata_path: getContextStoreMetadataPath(storeRoot),
    });
    expect(payload.git).toEqual({
      is_repository: false,
      initialized: false,
    });
    expect(payload.created_files).toEqual(['.openspec-store/store.yaml']);
    expect(payload.status).toEqual([]);
    await expect(readContextStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'team-context',
    });
    await expect(readContextStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {
        'team-context': {
          backend: {
            type: 'git',
            local_path: storeRoot,
          },
        },
      },
    });
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(false);
  });

  it('supports explicit current-directory setup', async () => {
    const storeRoot = mkdir('team-context');

    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', '.', '--no-init-git', '--json'],
      { cwd: storeRoot, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).context_store.root).toBe(expectedExistingPath(storeRoot));
  });

  it('rejects non-empty setup folders without context-store metadata', async () => {
    const storeRoot = mkdir('existing');
    fs.writeFileSync(path.join(storeRoot, 'notes.md'), 'hello\n');

    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_setup_non_empty_directory',
      })
    );
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('does not prompt before setup validation fails', async () => {
    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPENSPEC_TELEMETRY: '0',
    };
    delete process.env.OPEN_SPEC_INTERACTIVE;
    delete process.env.CI;
    process.chdir(tempDir);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { confirm } = await getPromptMocks();
    confirm.mockResolvedValue(true);
    const storeRoot = mkdir('existing');
    fs.writeFileSync(path.join(storeRoot, 'notes.md'), 'hello\n');

    await runContextStoreCommand(['setup', 'team-context', '--path', storeRoot]);

    expect(confirm).not.toHaveBeenCalled();
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('registers an existing folder by inferring the folder name', async () => {
    const storeRoot = mkdir('team-context');

    const result = await runCLI(
      ['context-store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.context_store.id).toBe('team-context');
    expect(payload.created_files).toEqual(['.openspec-store/store.yaml']);
    await expect(readContextStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'team-context',
    });
  });

  it('rejects registry id and alias path conflicts', async () => {
    const firstRoot = mkdir('first/team-context');
    const secondRoot = mkdir('second/team-context');
    const aliasRoot = path.join(tempDir, 'alias-team-context');
    await writeContextStoreMetadataState(firstRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: firstRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const sameId = await runCLI(
      ['context-store', 'register', secondRoot, '--id', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(sameId.exitCode).toBe(1);
    expect(parseJson(sameId).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_id_conflict',
      })
    );

    fs.rmSync(path.join(firstRoot, '.openspec-store'), { recursive: true, force: true });
    fs.symlinkSync(firstRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir');
    const samePath = await runCLI(
      ['context-store', 'register', aliasRoot, '--id', 'other-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(samePath.exitCode).toBe(1);
    expect(parseJson(samePath).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_path_conflict',
      })
    );
  });

  it('lists the local registry without health checks', async () => {
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'zeta-context': {
            backend: {
              type: 'git',
              local_path: path.join(tempDir, 'missing-zeta'),
            },
          },
          'alpha-context': {
            backend: {
              type: 'git',
              local_path: path.join(tempDir, 'missing-alpha'),
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(['context-store', 'list', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual({
      context_stores: [
        {
          id: 'alpha-context',
          root: path.join(tempDir, 'missing-alpha'),
        },
        {
          id: 'zeta-context',
          root: path.join(tempDir, 'missing-zeta'),
        },
      ],
      status: [],
    });
  });

  it('rejects an explicit blank doctor id', async () => {
    const result = await runCLI(['context-store', 'doctor', '', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_context_store_id',
      })
    );
  });

  it('doctors registered store path, metadata, and Git presence', async () => {
    const healthyRoot = mkdir('healthy-context');
    const mismatchRoot = mkdir('mismatch-context');
    fs.mkdirSync(path.join(healthyRoot, '.git'));
    await writeContextStoreMetadataState(healthyRoot, { version: 1, id: 'healthy-context' });
    await writeContextStoreMetadataState(mismatchRoot, { version: 1, id: 'other-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'healthy-context': {
            backend: {
              type: 'git',
              local_path: healthyRoot,
            },
          },
          'missing-context': {
            backend: {
              type: 'git',
              local_path: path.join(tempDir, 'missing-context'),
            },
          },
          'mismatch-context': {
            backend: {
              type: 'git',
              local_path: mismatchRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(['context-store', 'doctor', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    const byId = Object.fromEntries(payload.context_stores.map((store: any) => [store.id, store]));
    expect(byId['healthy-context'].status).toEqual([]);
    expect(byId['healthy-context'].git.is_repository).toBe(true);
    expect(byId['missing-context'].status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_root_missing',
      })
    );
    expect(byId['mismatch-context'].status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_metadata_id_mismatch',
      })
    );
  });

  it('prompts for Git initialization in interactive setup', async () => {
    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPENSPEC_TELEMETRY: '0',
    };
    delete process.env.OPEN_SPEC_INTERACTIVE;
    delete process.env.CI;
    process.chdir(tempDir);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { confirm } = await getPromptMocks();
    confirm.mockResolvedValue(true);

    await runContextStoreCommand(['setup', 'interactive-context']);

    const storeRoot = path.join(tempDir, 'interactive-context');
    expect(confirm).toHaveBeenCalledWith({
      message: 'Initialize Git repository?',
      default: true,
    });
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });
});
