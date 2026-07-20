import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getGlobalDataDir,
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createHealthyOpenSpecRoot, isolatedGitEnv } from '../helpers/store-git.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

async function runStoreCommand(args: string[]): Promise<void> {
  const { registerStoreCommand } = await import('../../src/commands/store.js');
  const program = new Command();
  registerStoreCommand(program);
  await program.parseAsync(['node', 'openspec', 'store', ...args]);
}

async function getPromptMocks(): Promise<{
  input: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
}> {
  const prompts = await import('@inquirer/prompts');
  return {
    input: prompts.input as unknown as ReturnType<typeof vi.fn>,
    confirm: prompts.confirm as unknown as ReturnType<typeof vi.fn>,
  };
}

/**
 * Git lifecycle behavior of store setup, register, and doctor: the
 * initial commit, identity handling, and the read-only Git diagnostics.
 */
describe('store git lifecycle', () => {
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

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-git-'));
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
    cleanupTempPath(tempDir);
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
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

  it('defaults to Git without prompting in interactive setup', async () => {
    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPENSPEC_TELEMETRY: '0',
      ...isolatedGitEnv(tempDir),
    };
    delete process.env.OPEN_SPEC_INTERACTIVE;
    delete process.env.CI;
    process.chdir(tempDir);
    (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY = true;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storeRoot = path.join(tempDir, 'interactive-context');
    const { input, confirm } = await getPromptMocks();
    input.mockImplementation(async (options: { message: string }) => {
      if (options.message === 'Where should this store live?') return storeRoot;
      throw new Error(`Unexpected prompt: ${options.message}`);
    });
    confirm.mockResolvedValue(true);

    await runStoreCommand(['setup', 'interactive-context']);

    // No Git prompt: Git is the default, and the summary reflects it.
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenNthCalledWith(1, {
      message: 'Create this store?',
      default: true,
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('  Git: initialized');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Share this store by committing and pushing it like any Git repo.'
    );
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(true);
    const committed = execFileSync('git', ['log', '--format=%s'], { cwd: storeRoot })
      .toString()
      .trim();
    expect(committed).toBe('Initialize OpenSpec store interactive-context');
    expect(process.exitCode).toBeUndefined();
  });

  it('commits the full store shape when initializing Git on an existing root', async () => {
    const storeRoot = mkdir('convert-context');
    const gitEnv = { ...env, ...isolatedGitEnv(tempDir) };
    createHealthyOpenSpecRoot(storeRoot);
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'specs', 'keep-me.md'), 'user spec\n');
    // Old beta files outside the store shape stay out of the commit.
    fs.writeFileSync(path.join(storeRoot, 'workspace.yaml'), 'old: beta\n');

    const result = await runCLI(
      ['store', 'setup', 'convert-context', '--path', storeRoot, '--json'],
      { cwd: tempDir, env: gitEnv }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.git).toEqual({
      is_repository: true,
      initialized: true,
      committed: true,
    });

    const committedFiles = execFileSync('git', ['show', '--name-only', '--format=', 'HEAD'], {
      cwd: storeRoot,
    })
      .toString()
      .trim()
      .split('\n')
      .sort();
    expect(committedFiles).toEqual([
      '.openspec-store/store.yaml',
      'openspec/changes/archive/.gitkeep',
      'openspec/config.yaml',
      'openspec/specs/keep-me.md',
    ]);

    // A clone of the converted store is immediately a healthy root.
    const cloneRoot = path.join(tempDir, 'convert-clone');
    execFileSync('git', ['clone', storeRoot, cloneRoot], {
      env: { ...process.env, ...gitEnv },
      stdio: 'ignore',
    });
    for (const required of [
      'openspec/config.yaml',
      'openspec/specs/keep-me.md',
      'openspec/changes/archive/.gitkeep',
      '.openspec-store/store.yaml',
    ]) {
      expect(fs.existsSync(path.join(cloneRoot, required))).toBe(true);
    }
    expect(fs.existsSync(path.join(cloneRoot, 'workspace.yaml'))).toBe(false);
  });

  it('registers a clone before any changes exist', async () => {
    const storeRoot = mkdir('empty-team-context');
    const cloneRoot = path.join(tempDir, 'empty-team-clone');
    const gitEnv = { ...env, ...isolatedGitEnv(tempDir) };
    const gitExecEnv = { ...process.env, ...gitEnv };
    const teammateEnv = {
      ...gitEnv,
      XDG_DATA_HOME: path.join(tempDir, 'empty-teammate-data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'empty-teammate-config'),
    };
    fs.mkdirSync(path.join(storeRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'empty-team-context' });
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });
    execFileSync('git', ['add', '-A'], { cwd: storeRoot, env: gitExecEnv });
    execFileSync('git', ['commit', '-m', 'initialize empty store'], {
      cwd: storeRoot,
      env: gitExecEnv,
      stdio: 'ignore',
    });

    execFileSync('git', ['clone', storeRoot, cloneRoot], {
      env: gitExecEnv,
      stdio: 'ignore',
    });
    expect(fs.existsSync(path.join(cloneRoot, 'openspec', 'changes'))).toBe(false);
    expect(fs.existsSync(path.join(cloneRoot, 'openspec', 'specs'))).toBe(false);

    const registered = await runCLI(['store', 'register', cloneRoot, '--json'], {
      cwd: tempDir,
      env: teammateEnv,
    });
    expect(registered.exitCode).toBe(0);
    expect(parseJson(registered).store.id).toBe('empty-team-context');
  });

  it('registers a clone with active changes before specs or archive exist', async () => {
    const storeRoot = mkdir('planned-context');
    const cloneRoot = path.join(tempDir, 'planned-clone');
    const gitEnv = { ...env, ...isolatedGitEnv(tempDir) };
    const gitExecEnv = { ...process.env, ...gitEnv };
    const teammateEnv = {
      ...gitEnv,
      XDG_DATA_HOME: path.join(tempDir, 'teammate-data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'teammate-config'),
    };
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'changes', 'add-widget'), { recursive: true });
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'changes', 'add-widget', 'proposal.md'),
      '# Proposal\n'
    );
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'changes', 'add-widget', 'tasks.md'),
      '# Tasks\n'
    );
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'planned-context' });
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });
    execFileSync('git', ['add', '-A'], { cwd: storeRoot, env: gitExecEnv });
    execFileSync('git', ['commit', '-m', 'draft changes'], {
      cwd: storeRoot,
      env: gitExecEnv,
      stdio: 'ignore',
    });

    const committedFiles = execFileSync('git', ['show', '--name-only', '--format=', 'HEAD'], {
      cwd: storeRoot,
    })
      .toString()
      .trim()
      .split('\n')
      .sort();
    expect(committedFiles).toEqual([
      '.openspec-store/store.yaml',
      'openspec/changes/add-widget/proposal.md',
      'openspec/changes/add-widget/tasks.md',
      'openspec/config.yaml',
    ]);
    expect(committedFiles).not.toContain('openspec/specs/.gitkeep');
    expect(committedFiles).not.toContain('openspec/changes/archive/.gitkeep');

    execFileSync('git', ['clone', storeRoot, cloneRoot], {
      env: gitExecEnv,
      stdio: 'ignore',
    });
    expect(fs.existsSync(path.join(cloneRoot, 'openspec', 'specs'))).toBe(false);
    expect(fs.existsSync(path.join(cloneRoot, 'openspec', 'changes', 'archive'))).toBe(false);

    const registered = await runCLI(['store', 'register', cloneRoot, '--json'], {
      cwd: tempDir,
      env: teammateEnv,
    });
    expect(registered.exitCode).toBe(0);
    expect(parseJson(registered).store.id).toBe('planned-context');
  });

  it('keeps pre-staged user files out of the setup commit', async () => {
    const storeRoot = mkdir('staged-context');
    const gitEnv = { ...env, ...isolatedGitEnv(tempDir) };
    const gitExecEnv = { ...process.env, ...gitEnv };
    createHealthyOpenSpecRoot(storeRoot);
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });
    execFileSync('git', ['add', '-A'], { cwd: storeRoot, env: gitExecEnv });
    execFileSync('git', ['commit', '-m', 'user base'], { cwd: storeRoot, env: gitExecEnv, stdio: 'ignore' });
    fs.writeFileSync(path.join(storeRoot, 'user-staged.txt'), 'user work\n');
    execFileSync('git', ['add', 'user-staged.txt'], { cwd: storeRoot, env: gitExecEnv });

    const result = await runCLI(
      ['store', 'setup', 'staged-context', '--path', storeRoot, '--json'],
      { cwd: tempDir, env: gitEnv }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).git.committed).toBe(true);

    const committedFiles = execFileSync('git', ['show', '--name-only', '--format=', 'HEAD'], {
      cwd: storeRoot,
    })
      .toString()
      .trim()
      .split('\n')
      .sort();
    expect(committedFiles).toEqual([
      '.openspec-store/store.yaml',
      'openspec/changes/archive/.gitkeep',
      'openspec/specs/.gitkeep',
    ]);

    // The user's staged file stays staged and uncommitted.
    const staged = execFileSync('git', ['status', '--porcelain'], { cwd: storeRoot }).toString();
    expect(staged).toContain('A  user-staged.txt');

    // Reruns stay strict no-ops: no new files, no new commit.
    const rerun = await runCLI(
      ['store', 'setup', 'staged-context', '--path', storeRoot, '--json'],
      { cwd: tempDir, env: gitEnv }
    );
    expect(rerun.exitCode).toBe(0);
    const rerunPayload = parseJson(rerun);
    expect(rerunPayload.created_files).toEqual([]);
    expect(rerunPayload.git.committed).toBe(false);
    const commitCount = execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: storeRoot })
      .toString()
      .trim();
    expect(commitCount).toBe('2');
  });

  it('flags clone-fragile directories and commitless clones', async () => {
    const storeRoot = mkdir('fragile-context');
    const gitExecEnv = { ...process.env, ...isolatedGitEnv(tempDir) };
    createHealthyOpenSpecRoot(storeRoot);
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });
    execFileSync('git', ['add', 'openspec/config.yaml'], { cwd: storeRoot, env: gitExecEnv });
    execFileSync('git', ['commit', '-m', 'partial'], { cwd: storeRoot, env: gitExecEnv, stdio: 'ignore' });
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'fragile-context' });
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          'fragile-context': {
            backend: { type: 'git', local_path: storeRoot },
          },
        },
      },
      { globalDataDir }
    );

    const doctor = await runCLI(['store', 'doctor', 'fragile-context', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(doctor.exitCode).toBe(0);
    const store = parseJson(doctor).stores[0];
    expect(store.git.has_commits).toBe(true);
    expect(store.status).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'store_clone_fragile_directories',
        message: expect.stringContaining('openspec/specs/'),
      }),
    ]);

    // A commitless clone refuses register with the empty-clone explanation.
    const emptyClone = mkdir('empty-clone');
    execFileSync('git', ['init'], { cwd: emptyClone, stdio: 'ignore' });
    const register = await runCLI(['store', 'register', emptyClone, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(register.exitCode).toBe(1);
    const registerStatus = parseJson(register).status[0];
    expect(registerStatus.code).toBe('store_register_root_unhealthy');
    expect(registerStatus.message).toContain('no commits');
    expect(registerStatus.fix).toBe(
      'If this is a store clone: commit and push the origin store, pull it into this clone, then rerun register.'
    );
  });
});
