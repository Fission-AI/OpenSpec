import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  DEFAULT_OPENSPEC_SCHEMA,
  getGlobalDataDir,
  getStoresDir,
  getStoreMetadataPath,
  readStoreMetadataState,
  readStoreRegistryState,
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createHealthyOpenSpecRoot } from '../helpers/store-git.js';

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

describe('store command', () => {
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

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-command-'));
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

  function expectHealthyOpenSpecRoot(root: string): void {
    expect(fs.existsSync(path.join(root, 'openspec', 'config.yaml')) || fs.existsSync(path.join(root, 'openspec', 'config.yml'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'openspec', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'openspec', 'changes'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'openspec', 'changes', 'archive'))).toBe(true);
  }

  function expectNoGeneratedAgentOrBetaArtifacts(root: string): void {
    for (const artifact of [
      'initiatives',
      '.openspec-workspace',
      'workspace.yaml',
      'AGENTS.md',
      '.codex',
      '.claude',
      '.cursor',
    ]) {
      expect(fs.existsSync(path.join(root, artifact))).toBe(false);
    }
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

  it('sets up a store at an explicit path without Git in non-interactive JSON mode', async () => {
    const storeRoot = expectedExistingPath(mkdir('team-context'));
    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = parseJson(result);
    expect(payload.store).toEqual({
      id: 'team-context',
      root: storeRoot,
      metadata_path: getStoreMetadataPath(storeRoot),
    });
    expect(payload.git).toEqual({
      is_repository: false,
      initialized: false,
      committed: false,
    });
    expect(payload.registry).toEqual({
      path: expect.any(String),
      registered: true,
      already_registered: false,
    });
    expect(payload.created_files).toEqual([
      'openspec/',
      'openspec/specs/',
      'openspec/changes/',
      'openspec/changes/archive/',
      'openspec/config.yaml',
      'openspec/specs/.gitkeep',
      'openspec/changes/archive/.gitkeep',
      '.openspec-store/store.yaml',
    ]);
    expect(payload.status).toEqual([]);
    expectHealthyOpenSpecRoot(storeRoot);
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'utf-8')).toContain(
      `schema: ${DEFAULT_OPENSPEC_SCHEMA}`
    );
    expectNoGeneratedAgentOrBetaArtifacts(storeRoot);
    await expect(readStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'team-context',
    });
    await expect(readStoreRegistryState({ globalDataDir })).resolves.toEqual({
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

  it('runs guided setup when no args are passed in an interactive terminal', async () => {
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
    const storeRoot = path.join(tempDir, 'guided-context');
    const { input, confirm } = await getPromptMocks();
    input.mockImplementation(async (options: { message: string; default?: string }) => {
      if (options.message === 'Store name') return 'guided-context';
      if (options.message === 'Where should this store live?') return storeRoot;
      return options.default;
    });
    confirm.mockResolvedValueOnce(true);

    await runStoreCommand(['setup', '--no-init-git']);

    expect(input).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Store name',
    }));
    // The suggested location is a visible user path, never the XDG data dir.
    expect(input).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Where should this store live?',
      default: '~/openspec/guided-context',
    }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenNthCalledWith(1, {
      message: 'Create this store?',
      default: true,
    });
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(true);
    expectHealthyOpenSpecRoot(storeRoot);
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(false);
    expect(process.exitCode).toBeUndefined();
  });

  it('requires an explicit path for non-interactive JSON setup', async () => {
    const result = await runCLI(['store', 'setup', 'team-context', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_setup_path_required',
      })
    );
    expect(
      fs.existsSync(path.join(getStoresDir({ globalDataDir }), 'team-context'))
    ).toBe(false);
  });

  it('requires a setup id for non-interactive JSON setup', async () => {
    const result = await runCLI(['store', 'setup', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_setup_id_required',
      })
    );
  });

  it('supports explicit current-directory setup', async () => {
    const storeRoot = mkdir('team-context');

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', '.', '--no-init-git', '--json'],
      { cwd: storeRoot, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).store.root).toBe(expectedExistingPath(storeRoot));
    expectHealthyOpenSpecRoot(storeRoot);
  });

  it('accepts an existing Git-only setup directory', async () => {
    const storeRoot = mkdir('team-context');
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.git).toEqual({
      is_repository: true,
      initialized: false,
      committed: false,
    });
    expect(payload.created_files).toEqual([
      'openspec/',
      'openspec/specs/',
      'openspec/changes/',
      'openspec/changes/archive/',
      'openspec/config.yaml',
      'openspec/specs/.gitkeep',
      'openspec/changes/archive/.gitkeep',
      '.openspec-store/store.yaml',
    ]);
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(true);
    expectHealthyOpenSpecRoot(storeRoot);
  });

  it('preserves an existing healthy OpenSpec root during setup', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot, 'config.yml');
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'specs', 'note.md'), 'keep\n');

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    // First-time accept of an existing root anchors its empty directories
    // (specs/ has user content here, so only archive/ gets an anchor).
    expect(payload.created_files).toEqual([
      'openspec/changes/archive/.gitkeep',
      '.openspec-store/store.yaml',
    ]);
    expect(fs.existsSync(path.join(storeRoot, 'openspec', 'config.yaml'))).toBe(false);
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'config.yml'), 'utf-8')).toBe(
      `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`
    );
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'specs', 'note.md'), 'utf-8')).toBe('keep\n');
  });

  it('ignores old beta files inside an otherwise healthy root', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);
    fs.mkdirSync(path.join(storeRoot, 'initiatives'), { recursive: true });
    fs.mkdirSync(path.join(storeRoot, '.codex'), { recursive: true });
    fs.writeFileSync(path.join(storeRoot, 'workspace.yaml'), 'old: beta\n');
    fs.writeFileSync(path.join(storeRoot, 'AGENTS.md'), 'old beta guidance\n');

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(path.join(storeRoot, 'initiatives'))).toBe(true);
    expect(fs.existsSync(path.join(storeRoot, '.codex'))).toBe(true);
    expect(fs.readFileSync(path.join(storeRoot, 'workspace.yaml'), 'utf-8')).toBe('old: beta\n');
    expect(fs.readFileSync(path.join(storeRoot, 'AGENTS.md'), 'utf-8')).toBe('old beta guidance\n');
  });

  it('does not treat beta-only folders as healthy roots', async () => {
    const storeRoot = mkdir('team-context');
    fs.mkdirSync(path.join(storeRoot, 'initiatives'), { recursive: true });
    fs.writeFileSync(path.join(storeRoot, 'workspace.yaml'), 'old: beta\n');

    const setup = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    const register = await runCLI(
      ['store', 'register', storeRoot, '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(setup.exitCode).toBe(1);
    expect(parseJson(setup).status[0]).toEqual(expect.objectContaining({
      code: 'store_setup_non_empty_directory',
    }));
    expect(register.exitCode).toBe(1);
    expect(parseJson(register).status[0]).toEqual(expect.objectContaining({
      code: 'store_register_root_unhealthy',
    }));
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('rejects explicit setup paths inside an existing Git repo in non-interactive mode', async () => {
    const repoRoot = mkdir('repo');
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
    const storeRoot = path.join(repoRoot, 'team-context');

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_setup_inside_git_repo',
      })
    );
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
  });

  it('rejects setup paths inside git-like parents when git cannot resolve the repo', async () => {
    const repoRoot = mkdir('repo');
    fs.writeFileSync(path.join(repoRoot, '.git'), `gitdir: ${path.join(tempDir, 'missing-gitdir')}\n`);
    const storeRoot = path.join(repoRoot, 'team-context');

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_setup_inside_git_repo',
      })
    );
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('rejects interactive setup paths inside an existing Git repo without prompting through', async () => {
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
    const repoRoot = mkdir('repo');
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
    const storeRoot = path.join(repoRoot, 'team-context');
    confirm.mockResolvedValue(true);

    await runStoreCommand(['setup', 'team-context', '--path', storeRoot]);

    expect(confirm).not.toHaveBeenCalled();
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('rejects non-empty setup folders without store metadata', async () => {
    const storeRoot = mkdir('existing');
    fs.writeFileSync(path.join(storeRoot, 'notes.md'), 'hello\n');

    const result = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_setup_non_empty_directory',
      })
    );
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
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

    await runStoreCommand(['setup', 'team-context', '--path', storeRoot]);

    expect(confirm).not.toHaveBeenCalled();
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('refuses to register a plain folder by inferring the folder name', async () => {
    const storeRoot = mkdir('team-context');

    const result = await runCLI(
      ['store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_register_root_unhealthy',
      })
    );
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('registers a cloned healthy store without rewriting planning files', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'specs', 'note.md'), 'keep\n');
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });

    const result = await runCLI(
      ['store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.store.id).toBe('team-context');
    expect(payload.registry.registered).toBe(true);
    expect(payload.created_files).toEqual([]);
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'specs', 'note.md'), 'utf-8')).toBe('keep\n');
  });

  it('requires confirmation before registering a healthy root without identity', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);

    const refused = await runCLI(
      ['store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(refused.exitCode).toBe(1);
    expect(parseJson(refused).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_register_identity_confirmation_required',
      })
    );
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);

    const confirmed = await runCLI(
      ['store', 'register', storeRoot, '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(confirmed.exitCode).toBe(0);
    expect(parseJson(confirmed).created_files).toEqual(['.openspec-store/store.yaml']);
    await expect(readStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'team-context',
    });
  });

  it('writes nothing when interactive register conversion is declined', async () => {
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
    confirm.mockResolvedValue(false);
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);

    await runStoreCommand(['register', storeRoot]);

    expect(confirm).toHaveBeenCalledWith({
      message: "Turn this OpenSpec root into store 'team-context'?",
      default: false,
    });
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
    await expect(readStoreRegistryState({ globalDataDir })).resolves.toBeNull();
    expect(process.exitCode).toBe(1);
  });

  it('reports repeated setup and register as no-op success', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n# user edit\n');

    const firstSetup = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    expect(firstSetup.exitCode).toBe(0);

    const secondSetup = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    expect(secondSetup.exitCode).toBe(0);
    const setupPayload = parseJson(secondSetup);
    expect(setupPayload.created_files).toEqual([]);
    expect(setupPayload.status[0]).toEqual(
      expect.objectContaining({
        code: 'store_already_registered',
      })
    );

    // A rerun with defaulted Git flags stays a strict no-op: it neither
    // requires a commit identity nor git-inits the registered no-Git store.
    const defaultFlagsRerun = await runCLI(
      ['store', 'setup', 'team-context', '--path', storeRoot, '--json'],
      { cwd: tempDir, env }
    );
    expect(defaultFlagsRerun.exitCode).toBe(0);
    const defaultFlagsPayload = parseJson(defaultFlagsRerun);
    expect(defaultFlagsPayload.created_files).toEqual([]);
    expect(defaultFlagsPayload.git).toEqual({
      is_repository: false,
      initialized: false,
      committed: false,
    });
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(false);

    const secondRegister = await runCLI(
      ['store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );
    expect(secondRegister.exitCode).toBe(0);
    const registerPayload = parseJson(secondRegister);
    expect(registerPayload.created_files).toEqual([]);
    expect(registerPayload.status[0]).toEqual(
      expect.objectContaining({
        code: 'store_already_registered',
      })
    );
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'utf-8')).toBe(
      'schema: spec-driven\n# user edit\n'
    );
    await expect(readStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {
        'team-context': {
          backend: {
            type: 'git',
            local_path: expectedExistingPath(storeRoot),
          },
        },
      },
    });
  });

  it('rejects registry id and alias path conflicts', async () => {
    const firstRoot = mkdir('first/team-context');
    const secondRoot = mkdir('second/team-context');
    const aliasRoot = path.join(tempDir, 'alias-team-context');
    createHealthyOpenSpecRoot(firstRoot);
    createHealthyOpenSpecRoot(secondRoot);
    await writeStoreMetadataState(firstRoot, { version: 1, id: 'team-context' });
    await writeStoreMetadataState(secondRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
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
      ['store', 'register', secondRoot, '--id', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(sameId.exitCode).toBe(1);
    expect(parseJson(sameId).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_id_conflict',
      })
    );

    fs.rmSync(path.join(firstRoot, '.openspec-store'), { recursive: true, force: true });
    await writeStoreMetadataState(firstRoot, { version: 1, id: 'other-context' });
    fs.symlinkSync(firstRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir');
    const samePath = await runCLI(
      ['store', 'register', aliasRoot, '--id', 'other-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(samePath.exitCode).toBe(1);
    expect(parseJson(samePath).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_path_conflict',
      })
    );
  });

  it('lists the local registry without health checks', async () => {
    await writeStoreRegistryState(
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

    const result = await runCLI(['store', 'list', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual({
      stores: [
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

  it('unregisters a store without deleting local files', async () => {
    const storeRoot = mkdir('team-context');
    const canonicalStoreRoot = expectedExistingPath(storeRoot);
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: canonicalStoreRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(
      ['store', 'unregister', 'team-context', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual(expect.objectContaining({
      store: expect.objectContaining({
        id: 'team-context',
        root: canonicalStoreRoot,
      }),
      registry: expect.objectContaining({
        removed: true,
      }),
      files: expect.objectContaining({
        deleted: false,
        left_on_disk: canonicalStoreRoot,
      }),
    }));
    await expect(readStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {},
    });
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(true);
  });

  it('requires explicit confirmation before removing files non-interactively', async () => {
    const storeRoot = mkdir('team-context');
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: storeRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(
      ['store', 'remove', 'team-context', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_remove_confirmation_required',
      })
    );
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(true);
  });

  it('removes a store after explicit non-interactive confirmation', async () => {
    const storeRoot = mkdir('team-context');
    const canonicalStoreRoot = expectedExistingPath(storeRoot);
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: canonicalStoreRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(
      ['store', 'remove', 'team-context', '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual(expect.objectContaining({
      store: expect.objectContaining({
        id: 'team-context',
        root: canonicalStoreRoot,
      }),
      registry: expect.objectContaining({
        removed: true,
      }),
      files: expect.objectContaining({
        deleted: true,
        deleted_path: canonicalStoreRoot,
      }),
    }));
    await expect(readStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {},
    });
    expect(fs.existsSync(storeRoot)).toBe(false);
  });

  it('refuses to remove files when the folder lacks matching store metadata', async () => {
    const storeRoot = mkdir('team-context');
    const canonicalStoreRoot = expectedExistingPath(storeRoot);
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: canonicalStoreRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(
      ['store', 'remove', 'team-context', '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'store_remove_metadata_missing',
      })
    );
    expect(fs.existsSync(storeRoot)).toBe(true);
    await expect(readStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {
        'team-context': {
          backend: {
            type: 'git',
            local_path: canonicalStoreRoot,
          },
        },
      },
    });
  });

  it('rejects an explicit blank doctor id', async () => {
    const result = await runCLI(['store', 'doctor', '', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_store_id',
      })
    );
  });

  it('doctors registered store path, metadata, and Git presence', async () => {
    const healthyRoot = mkdir('healthy-context');
    const mismatchRoot = mkdir('mismatch-context');
    execFileSync('git', ['init'], { cwd: healthyRoot, stdio: 'ignore' });
    createHealthyOpenSpecRoot(healthyRoot);
    createHealthyOpenSpecRoot(mismatchRoot);
    await writeStoreMetadataState(healthyRoot, { version: 1, id: 'healthy-context' });
    await writeStoreMetadataState(mismatchRoot, { version: 1, id: 'other-context' });
    await writeStoreRegistryState(
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

    const result = await runCLI(['store', 'doctor', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    const byId = Object.fromEntries(payload.stores.map((store: any) => [store.id, store]));
    // A healthy root in a commitless repo is the clone trap; doctor warns.
    expect(byId['healthy-context'].status).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'store_git_no_commits',
      }),
    ]);
    expect(byId['healthy-context'].openspec_root.healthy).toBe(true);
    expect(byId['healthy-context'].git).toEqual({
      is_repository: true,
      has_commits: false,
      has_uncommitted_changes: true,
      has_remote: false,
      origin_url: null,
    });
    expect(byId['missing-context'].status[0]).toEqual(
      expect.objectContaining({
        code: 'store_root_missing',
      })
    );
    expect(byId['missing-context'].openspec_root.present).toBeNull();
    expect(byId['mismatch-context'].status[0]).toEqual(
      expect.objectContaining({
        code: 'store_metadata_id_mismatch',
      })
    );
  });

  it('reports OpenSpec root health separately without repairing it', async () => {
    const storeRoot = mkdir('team-context');
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: storeRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const result = await runCLI(['store', 'doctor', 'team-context', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(result.exitCode).toBe(0);
    const store = parseJson(result).stores[0];
    expect(store.openspec_root.archive.present).toBe(false);
    expect(store.openspec_root.status[0]).toEqual(
      expect.objectContaining({
        code: 'openspec_archive_missing',
      })
    );
    expect(fs.existsSync(path.join(storeRoot, 'openspec', 'changes', 'archive'))).toBe(false);
  });

  it('register errors are terminal: one-checkout rule, no circular fix texts', async () => {
    // Register the original checkout.
    const original = mkdir('team-context');
    createHealthyOpenSpecRoot(original);
    await writeStoreMetadataState(original, { version: 1, id: 'team-context' });
    const first = await runCLI(['store', 'register', original, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(first.exitCode).toBe(0);

    // A second checkout with the same committed id is refused with the
    // one-checkout rule and the unregister escape — never "choose a
    // different id".
    const secondCheckout = mkdir('elsewhere/team-context');
    createHealthyOpenSpecRoot(secondCheckout);
    await writeStoreMetadataState(secondCheckout, { version: 1, id: 'team-context' });
    const conflict = await runCLI(['store', 'register', secondCheckout, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(conflict.exitCode).toBe(1);
    const conflictStatus = parseJson(conflict).status[0];
    expect(conflictStatus.code).toBe('store_id_conflict');
    expect(conflictStatus.message).toContain('One checkout per store id');
    expect(conflictStatus.message).toContain(expectedExistingPath(original));
    expect(conflictStatus.fix).toContain('openspec store unregister team-context');
    expect(conflictStatus.fix).not.toContain('different store id');

    // Mismatched --id when the metadata id is already registered elsewhere:
    // the fix names the one-checkout rule instead of pointing back at the
    // already-registered error.
    const mismatchRegistered = await runCLI(
      ['store', 'register', secondCheckout, '--id', 'team-context-2', '--json'],
      { cwd: tempDir, env }
    );
    expect(mismatchRegistered.exitCode).toBe(1);
    const mismatchRegisteredStatus = parseJson(mismatchRegistered).status[0];
    expect(mismatchRegisteredStatus.code).toBe('store_metadata_id_mismatch');
    expect(mismatchRegisteredStatus.fix).toContain('One checkout per store id');
    expect(mismatchRegisteredStatus.fix).toContain('unregister team-context');
    expect(mismatchRegisteredStatus.fix).not.toContain('Use --id team-context or');

    // Mismatched --id when the metadata id is free: the plain fix applies.
    const freeRoot = mkdir('free-context');
    createHealthyOpenSpecRoot(freeRoot);
    await writeStoreMetadataState(freeRoot, { version: 1, id: 'free-context' });
    const mismatchFree = await runCLI(
      ['store', 'register', freeRoot, '--id', 'wrong-id', '--json'],
      { cwd: tempDir, env }
    );
    expect(mismatchFree.exitCode).toBe(1);
    const mismatchFreeStatus = parseJson(mismatchFree).status[0];
    expect(mismatchFreeStatus.code).toBe('store_metadata_id_mismatch');
    expect(mismatchFreeStatus.fix).toContain('Use --id free-context');
  });

  // Built by concatenation so the vocabulary sweep never matches this file.
  const RETIRED_GROUP = 'context' + '-store';
  const OLD_DATA_DIR_NAME = `${RETIRED_GROUP}s`;

  describe('committed format and data dir guards', () => {

    it('pins the committed store metadata literals and the stores data dir', async () => {
      const storeRoot = mkdir('pin-context');
      const result = await runCLI(
        ['store', 'setup', 'pin-context', '--path', storeRoot, '--no-init-git', '--json'],
        { cwd: tempDir, env }
      );

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(storeRoot, '.openspec-store', 'store.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(getStoresDir({ globalDataDir }), 'registry.yaml'))).toBe(
        true
      );
      expect(fs.existsSync(path.join(globalDataDir, OLD_DATA_DIR_NAME))).toBe(false);
    });

    it('registers a store repo created before the rename', async () => {
      // The committed store format predates the rename. The fixture writes
      // the exact pre-rename bytes inline (not via the current writer), so
      // this fails if the on-disk contract ever drifts.
      const storeRoot = mkdir('pre-rename-context');
      createHealthyOpenSpecRoot(storeRoot);
      const metadataDir = path.join(storeRoot, '.openspec-store');
      fs.mkdirSync(metadataDir, { recursive: true });
      fs.writeFileSync(
        path.join(metadataDir, 'store.yaml'),
        'version: 1\nid: pre-rename-context\n'
      );

      const result = await runCLI(['store', 'register', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });

      expect(result.exitCode).toBe(0);
      expect(parseJson(result).store).toEqual(
        expect.objectContaining({ id: 'pre-rename-context' })
      );
    });

    it('ignores old data-dir registries instead of reading or migrating them', async () => {
      const oldDir = path.join(globalDataDir, OLD_DATA_DIR_NAME);
      fs.mkdirSync(oldDir, { recursive: true });
      const oldRegistry = path.join(oldDir, 'registry.yaml');
      fs.writeFileSync(
        oldRegistry,
        'version: 1\nstores:\n  ghost-context:\n    path: /tmp/ghost\n'
      );

      const valid = await runCLI(['store', 'list', '--json'], { cwd: tempDir, env });
      expect(valid.exitCode).toBe(0);
      expect(parseJson(valid).stores).toEqual([]);

      fs.writeFileSync(oldRegistry, ':[ not yaml at all');
      const corrupt = await runCLI(['store', 'list', '--json'], { cwd: tempDir, env });
      expect(corrupt.exitCode).toBe(0);
      expect(parseJson(corrupt).stores).toEqual([]);

      // The old dir is neither cleaned up nor migrated.
      expect(fs.readFileSync(oldRegistry, 'utf-8')).toBe(':[ not yaml at all');
    });
  });

  describe('store group surface', () => {
    it('hints lifecycle attempts under the store group at --store', async () => {
      const result = await runCLI(['store', 'new', 'change', 'billing-rework'], {
        cwd: tempDir,
        env,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("unknown command 'new' for 'openspec store'");
      expect(result.stderr).toContain(
        'setup, register, unregister, remove, list (ls), doctor'
      );
      expect(result.stderr).toContain('openspec new change billing-rework --store <id>');
    });

    it('never suggests an invalid command for partial new invocations', async () => {
      const result = await runCLI(['store', 'new', 'my-change'], { cwd: tempDir, env });

      expect(result.exitCode).toBe(1);
      // 'new my-change' would be invalid; the hint falls back to the full form.
      expect(result.stderr).toContain('openspec new change <change-id> --store <id>');
      expect(result.stderr).not.toContain('openspec new my-change');
    });

    it('falls back to the generic example when flags interleave operands', async () => {
      const result = await runCLI(
        ['store', 'new', '--schema', 'core', 'change', 'billing-rework'],
        { cwd: tempDir, env }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('openspec new change <change-id> --store <id>');
      expect(result.stderr).not.toContain('core');
    });

    it('emits one JSON status document for --json invocations', async () => {
      const result = await runCLI(['store', 'bogus', '--json'], { cwd: tempDir, env });

      expect(result.exitCode).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload.status[0]).toEqual(
        expect.objectContaining({
          code: 'unknown_store_subcommand',
          message: expect.stringContaining("Unknown command 'bogus'"),
        })
      );
    });

    it('emits one JSON status document for a bare store --json (no subcommand)', async () => {
      const result = await runCLI(['store', '--json'], { cwd: tempDir, env });

      expect(result.exitCode).toBe(1);
      const payload = JSON.parse(result.stdout);
      expect(payload.status[0]).toEqual(
        expect.objectContaining({
          code: 'unknown_store_subcommand',
          message: expect.stringContaining('Missing subcommand'),
        })
      );
    });

    it('keeps no alias for the retired group name', async () => {
      const result = await runCLI([RETIRED_GROUP, 'list'], { cwd: tempDir, env });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(`unknown command '${RETIRED_GROUP}'`);
    });

    it('lists store in --help with the locked one-liner and no retired group', async () => {
      const result = await runCLI(['--help'], { cwd: tempDir, env });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Create and manage stores - standalone');
      expect(result.stdout).not.toContain(RETIRED_GROUP);
    });
  });

});
