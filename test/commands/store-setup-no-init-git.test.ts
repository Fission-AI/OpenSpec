import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getGlobalDataDir,
  getStoreMetadataPath,
  readStoreRegistryState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { isolatedGitEnv } from '../helpers/store-git.js';

/**
 * The nested-repo guard exists because store setup normally runs `git init`,
 * and a new repository inside an existing one is almost always an accident.
 * `--no-init-git` creates no repository, so there is nothing to nest: the
 * guard must not refuse it. The motivating layout is a `$HOME` kept as a
 * dotfiles repository with the guide's recommended `~/openspec/<id>` store.
 */
describe('store setup --no-init-git inside an existing Git repository', () => {
  let tempDir: string;
  let home: string;
  let storeRoot: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-no-init-git-'))
    );
    home = path.join(tempDir, 'home');
    fs.mkdirSync(home, { recursive: true });
    storeRoot = path.join(home, 'openspec', 'team-plans');
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
      ...isolatedGitEnv(tempDir),
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function git(args: string[]): string {
    return execFileSync('git', args, {
      cwd: tempDir,
      env: { ...process.env, ...env },
      stdio: 'pipe',
    }).toString().trim();
  }

  function makeHomeADotfilesRepo(): void {
    git(['init', '-q', home]);
  }

  function setup(flags: string[]): Promise<RunCLIResult> {
    return runCLI(
      ['store', 'setup', 'team-plans', '--path', storeRoot, ...flags, '--json'],
      { cwd: tempDir, env }
    );
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

  it('control: sets up with --no-init-git when no repository encloses the path', async () => {
    const result = await setup(['--no-init-git']);

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).registry.registered).toBe(true);
  }, 30_000);

  it('sets up and registers the store when $HOME is a Git repository', async () => {
    makeHomeADotfilesRepo();

    const result = await setup(['--no-init-git']);

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.status).toEqual([]);
    expect(payload.store.root).toBe(storeRoot);
    expect(payload.registry).toEqual(expect.objectContaining({ registered: true }));
    expect(payload.git).toEqual({
      is_repository: false,
      initialized: false,
      committed: false,
    });
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(true);
    expect(fs.existsSync(path.join(storeRoot, 'openspec', 'config.yaml'))).toBe(true);
  }, 30_000);

  it('creates no repository and commits nothing in the enclosing one', async () => {
    makeHomeADotfilesRepo();

    expect((await setup(['--no-init-git'])).exitCode).toBe(0);

    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(false);
    expect(git(['-C', home, 'rev-list', '--all', '--count'])).toBe('0');
  }, 30_000);

  it("never records the enclosing repository's origin as the store remote", async () => {
    makeHomeADotfilesRepo();
    git(['-C', home, 'remote', 'add', 'origin', 'https://example.com/dotfiles.git']);

    expect((await setup(['--no-init-git'])).exitCode).toBe(0);

    await expect(readStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {
        'team-plans': {
          backend: { type: 'git', local_path: storeRoot },
        },
      },
    });
  }, 30_000);

  it('reports a rerun with --no-init-git as an already-registered no-op', async () => {
    makeHomeADotfilesRepo();
    expect((await setup(['--no-init-git'])).exitCode).toBe(0);

    const rerun = await setup(['--no-init-git']);

    expect(rerun.exitCode).toBe(0);
    expect(parseJson(rerun).registry).toEqual(
      expect.objectContaining({ registered: false, already_registered: true })
    );
  }, 30_000);

  it('still refuses the default setup, which would nest a new repository', async () => {
    makeHomeADotfilesRepo();

    const result = await setup([]);

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({ code: 'store_setup_inside_git_repo' })
    );
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
  }, 30_000);

  it('still refuses an explicit --init-git', async () => {
    makeHomeADotfilesRepo();

    const result = await setup(['--init-git']);

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({ code: 'store_setup_inside_git_repo' })
    );
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
  }, 30_000);
});
