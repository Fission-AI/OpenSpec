import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  DEFAULT_OPENSPEC_SCHEMA,
  getDefaultContextStoreRoot,
  getGlobalDataDir,
  getContextStoreMetadataPath,
  readContextStoreMetadataState,
  readContextStoreRegistryState,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

async function runContextStoreCommand(args: string[]): Promise<void> {
  const { registerContextStoreCommand } = await import('../../src/commands/context-store.js');
  const program = new Command();
  registerContextStoreCommand(program);
  await program.parseAsync(['node', 'openspec', 'context-store', ...args]);
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

  // Isolates real git invocations from the host's gitconfig (signing, hooks).
  function isolatedGitEnv(): NodeJS.ProcessEnv {
    const emptyConfig = path.join(tempDir, 'gitconfig-empty');
    if (!fs.existsSync(emptyConfig)) {
      fs.writeFileSync(emptyConfig, '');
    }
    return {
      GIT_CONFIG_GLOBAL: emptyConfig,
      GIT_CONFIG_SYSTEM: emptyConfig,
      GIT_AUTHOR_NAME: 'Context Store Tester',
      GIT_AUTHOR_EMAIL: 'tester@example.com',
      GIT_COMMITTER_NAME: 'Context Store Tester',
      GIT_COMMITTER_EMAIL: 'tester@example.com',
    };
  }

  function expectedExistingPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function createHealthyOpenSpecRoot(root: string, configName = 'config.yaml'): void {
    fs.mkdirSync(path.join(root, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'openspec', 'changes', 'archive'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', configName), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);
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

  it('sets up a context store at an explicit path without Git in non-interactive JSON mode', async () => {
    const storeRoot = expectedExistingPath(mkdir('team-context'));
    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

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
      if (options.message === 'Context store name') return 'guided-context';
      if (options.message === 'Where should this context store live?') return storeRoot;
      return options.default;
    });
    confirm.mockResolvedValueOnce(true);

    await runContextStoreCommand(['setup', '--no-init-git']);

    expect(input).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Context store name',
    }));
    // The suggested location is a visible user path, never the XDG data dir.
    expect(input).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Where should this context store live?',
      default: '~/openspec/guided-context',
    }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenNthCalledWith(1, {
      message: 'Create this context store?',
      default: true,
    });
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(true);
    expectHealthyOpenSpecRoot(storeRoot);
    expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(false);
    expect(process.exitCode).toBeUndefined();
  });

  it('requires an explicit path for non-interactive JSON setup', async () => {
    const result = await runCLI(['context-store', 'setup', 'team-context', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_setup_path_required',
      })
    );
    expect(fs.existsSync(getDefaultContextStoreRoot('team-context', { globalDataDir }))).toBe(false);
  });

  it('requires a setup id for non-interactive JSON setup', async () => {
    const result = await runCLI(['context-store', 'setup', '--json'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_setup_id_required',
      })
    );
  });

  it('supports explicit current-directory setup', async () => {
    const storeRoot = mkdir('team-context');

    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', '.', '--no-init-git', '--json'],
      { cwd: storeRoot, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).context_store.root).toBe(expectedExistingPath(storeRoot));
    expectHealthyOpenSpecRoot(storeRoot);
  });

  it('accepts an existing Git-only setup directory', async () => {
    const storeRoot = mkdir('team-context');
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });

    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
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
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
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
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
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
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    const register = await runCLI(
      ['context-store', 'register', storeRoot, '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(setup.exitCode).toBe(1);
    expect(parseJson(setup).status[0]).toEqual(expect.objectContaining({
      code: 'context_store_setup_non_empty_directory',
    }));
    expect(register.exitCode).toBe(1);
    expect(parseJson(register).status[0]).toEqual(expect.objectContaining({
      code: 'context_store_register_root_unhealthy',
    }));
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('rejects explicit setup paths inside an existing Git repo in non-interactive mode', async () => {
    const repoRoot = mkdir('repo');
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
    const storeRoot = path.join(repoRoot, 'team-context');

    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_setup_inside_git_repo',
      })
    );
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
  });

  it('rejects setup paths inside git-like parents when git cannot resolve the repo', async () => {
    const repoRoot = mkdir('repo');
    fs.writeFileSync(path.join(repoRoot, '.git'), `gitdir: ${path.join(tempDir, 'missing-gitdir')}\n`);
    const storeRoot = path.join(repoRoot, 'team-context');

    const result = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_setup_inside_git_repo',
      })
    );
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
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

    await runContextStoreCommand(['setup', 'team-context', '--path', storeRoot]);

    expect(confirm).not.toHaveBeenCalled();
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
    expect(process.exitCode).toBe(1);
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

  it('refuses to register a plain folder by inferring the folder name', async () => {
    const storeRoot = mkdir('team-context');

    const result = await runCLI(
      ['context-store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_register_root_unhealthy',
      })
    );
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('registers a cloned healthy context store without rewriting planning files', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'specs', 'note.md'), 'keep\n');
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });

    const result = await runCLI(
      ['context-store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    const payload = parseJson(result);
    expect(payload.context_store.id).toBe('team-context');
    expect(payload.registry.registered).toBe(true);
    expect(payload.created_files).toEqual([]);
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'specs', 'note.md'), 'utf-8')).toBe('keep\n');
  });

  it('requires confirmation before registering a healthy root without identity', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);

    const refused = await runCLI(
      ['context-store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(refused.exitCode).toBe(1);
    expect(parseJson(refused).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_register_identity_confirmation_required',
      })
    );
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);

    const confirmed = await runCLI(
      ['context-store', 'register', storeRoot, '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(confirmed.exitCode).toBe(0);
    expect(parseJson(confirmed).created_files).toEqual(['.openspec-store/store.yaml']);
    await expect(readContextStoreMetadataState(storeRoot)).resolves.toEqual({
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

    await runContextStoreCommand(['register', storeRoot]);

    expect(confirm).toHaveBeenCalledWith({
      message: "Turn this OpenSpec root into context store 'team-context'?",
      default: false,
    });
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
    await expect(readContextStoreRegistryState({ globalDataDir })).resolves.toBeNull();
    expect(process.exitCode).toBe(1);
  });

  it('reports repeated setup and register as no-op success', async () => {
    const storeRoot = mkdir('team-context');
    createHealthyOpenSpecRoot(storeRoot);
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n# user edit\n');

    const firstSetup = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    expect(firstSetup.exitCode).toBe(0);

    const secondSetup = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    expect(secondSetup.exitCode).toBe(0);
    const setupPayload = parseJson(secondSetup);
    expect(setupPayload.created_files).toEqual([]);
    expect(setupPayload.status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_already_registered',
      })
    );

    // A rerun with defaulted Git flags stays a strict no-op: it neither
    // requires a commit identity nor git-inits the registered no-Git store.
    const defaultFlagsRerun = await runCLI(
      ['context-store', 'setup', 'team-context', '--path', storeRoot, '--json'],
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
      ['context-store', 'register', storeRoot, '--json'],
      { cwd: tempDir, env }
    );
    expect(secondRegister.exitCode).toBe(0);
    const registerPayload = parseJson(secondRegister);
    expect(registerPayload.created_files).toEqual([]);
    expect(registerPayload.status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_already_registered',
      })
    );
    expect(fs.readFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'utf-8')).toBe(
      'schema: spec-driven\n# user edit\n'
    );
    await expect(readContextStoreRegistryState({ globalDataDir })).resolves.toEqual({
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
    await writeContextStoreMetadataState(firstRoot, { version: 1, id: 'team-context' });
    await writeContextStoreMetadataState(secondRoot, { version: 1, id: 'team-context' });
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
    await writeContextStoreMetadataState(firstRoot, { version: 1, id: 'other-context' });
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

  it('unregisters a context store without deleting local files', async () => {
    const storeRoot = mkdir('team-context');
    const canonicalStoreRoot = expectedExistingPath(storeRoot);
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
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
      ['context-store', 'unregister', 'team-context', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual(expect.objectContaining({
      context_store: expect.objectContaining({
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
    await expect(readContextStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {},
    });
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(true);
  });

  it('requires explicit confirmation before removing files non-interactively', async () => {
    const storeRoot = mkdir('team-context');
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
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
      ['context-store', 'remove', 'team-context', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_remove_confirmation_required',
      })
    );
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(true);
  });

  it('removes a context store after explicit non-interactive confirmation', async () => {
    const storeRoot = mkdir('team-context');
    const canonicalStoreRoot = expectedExistingPath(storeRoot);
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
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
      ['context-store', 'remove', 'team-context', '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result)).toEqual(expect.objectContaining({
      context_store: expect.objectContaining({
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
    await expect(readContextStoreRegistryState({ globalDataDir })).resolves.toEqual({
      version: 1,
      stores: {},
    });
    expect(fs.existsSync(storeRoot)).toBe(false);
  });

  it('refuses to remove files when the folder lacks matching context-store metadata', async () => {
    const storeRoot = mkdir('team-context');
    const canonicalStoreRoot = expectedExistingPath(storeRoot);
    await writeContextStoreRegistryState(
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
      ['context-store', 'remove', 'team-context', '--yes', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_remove_metadata_missing',
      })
    );
    expect(fs.existsSync(storeRoot)).toBe(true);
    await expect(readContextStoreRegistryState({ globalDataDir })).resolves.toEqual({
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
    execFileSync('git', ['init'], { cwd: healthyRoot, stdio: 'ignore' });
    createHealthyOpenSpecRoot(healthyRoot);
    createHealthyOpenSpecRoot(mismatchRoot);
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
    // A healthy root in a commitless repo is the clone trap; doctor warns.
    expect(byId['healthy-context'].status).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'context_store_git_no_commits',
      }),
    ]);
    expect(byId['healthy-context'].openspec_root.healthy).toBe(true);
    expect(byId['healthy-context'].git).toEqual({
      is_repository: true,
      has_commits: false,
      has_uncommitted_changes: true,
      has_remote: false,
    });
    expect(byId['missing-context'].status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_root_missing',
      })
    );
    expect(byId['missing-context'].openspec_root.present).toBeNull();
    expect(byId['mismatch-context'].status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_metadata_id_mismatch',
      })
    );
  });

  it('reports OpenSpec root health separately without repairing it', async () => {
    const storeRoot = mkdir('team-context');
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
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

    const result = await runCLI(['context-store', 'doctor', 'team-context', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(result.exitCode).toBe(0);
    const store = parseJson(result).context_stores[0];
    expect(store.openspec_root.archive.present).toBe(false);
    expect(store.openspec_root.status[0]).toEqual(
      expect.objectContaining({
        code: 'openspec_archive_missing',
      })
    );
    expect(fs.existsSync(path.join(storeRoot, 'openspec', 'changes', 'archive'))).toBe(false);
  });

  it('defaults to Git without prompting in interactive setup', async () => {
    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPENSPEC_TELEMETRY: '0',
      ...isolatedGitEnv(),
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
      if (options.message === 'Where should this context store live?') return storeRoot;
      throw new Error(`Unexpected prompt: ${options.message}`);
    });
    confirm.mockResolvedValue(true);

    await runContextStoreCommand(['setup', 'interactive-context']);

    // No Git prompt: Git is the default, and the summary reflects it.
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenNthCalledWith(1, {
      message: 'Create this context store?',
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
    expect(committed).toBe('Initialize OpenSpec context store interactive-context');
    expect(process.exitCode).toBeUndefined();
  });

  it('keeps pre-staged user files out of the setup commit', async () => {
    const storeRoot = mkdir('staged-context');
    const gitEnv = { ...env, ...isolatedGitEnv() };
    const gitExecEnv = { ...process.env, ...gitEnv };
    createHealthyOpenSpecRoot(storeRoot);
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });
    execFileSync('git', ['add', '-A'], { cwd: storeRoot, env: gitExecEnv });
    execFileSync('git', ['commit', '-m', 'user base'], { cwd: storeRoot, env: gitExecEnv, stdio: 'ignore' });
    fs.writeFileSync(path.join(storeRoot, 'user-staged.txt'), 'user work\n');
    execFileSync('git', ['add', 'user-staged.txt'], { cwd: storeRoot, env: gitExecEnv });

    const result = await runCLI(
      ['context-store', 'setup', 'staged-context', '--path', storeRoot, '--json'],
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
      ['context-store', 'setup', 'staged-context', '--path', storeRoot, '--json'],
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

  it('register errors are terminal: one-checkout rule, no circular fix texts', async () => {
    // Register the original checkout.
    const original = mkdir('team-context');
    createHealthyOpenSpecRoot(original);
    await writeContextStoreMetadataState(original, { version: 1, id: 'team-context' });
    const first = await runCLI(['context-store', 'register', original, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(first.exitCode).toBe(0);

    // A second checkout with the same committed id is refused with the
    // one-checkout rule and the unregister escape — never "choose a
    // different id".
    const secondCheckout = mkdir('elsewhere/team-context');
    createHealthyOpenSpecRoot(secondCheckout);
    await writeContextStoreMetadataState(secondCheckout, { version: 1, id: 'team-context' });
    const conflict = await runCLI(['context-store', 'register', secondCheckout, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(conflict.exitCode).toBe(1);
    const conflictStatus = parseJson(conflict).status[0];
    expect(conflictStatus.code).toBe('context_store_id_conflict');
    expect(conflictStatus.message).toContain('One checkout per store id');
    expect(conflictStatus.message).toContain(expectedExistingPath(original));
    expect(conflictStatus.fix).toContain('openspec context-store unregister team-context');
    expect(conflictStatus.fix).not.toContain('different context store id');

    // Mismatched --id when the metadata id is already registered elsewhere:
    // the fix names the one-checkout rule instead of pointing back at the
    // already-registered error.
    const mismatchRegistered = await runCLI(
      ['context-store', 'register', secondCheckout, '--id', 'team-context-2', '--json'],
      { cwd: tempDir, env }
    );
    expect(mismatchRegistered.exitCode).toBe(1);
    const mismatchRegisteredStatus = parseJson(mismatchRegistered).status[0];
    expect(mismatchRegisteredStatus.code).toBe('context_store_metadata_id_mismatch');
    expect(mismatchRegisteredStatus.fix).toContain('One checkout per store id');
    expect(mismatchRegisteredStatus.fix).toContain('unregister team-context');
    expect(mismatchRegisteredStatus.fix).not.toContain('Use --id team-context or');

    // Mismatched --id when the metadata id is free: the plain fix applies.
    const freeRoot = mkdir('free-context');
    createHealthyOpenSpecRoot(freeRoot);
    await writeContextStoreMetadataState(freeRoot, { version: 1, id: 'free-context' });
    const mismatchFree = await runCLI(
      ['context-store', 'register', freeRoot, '--id', 'wrong-id', '--json'],
      { cwd: tempDir, env }
    );
    expect(mismatchFree.exitCode).toBe(1);
    const mismatchFreeStatus = parseJson(mismatchFree).status[0];
    expect(mismatchFreeStatus.code).toBe('context_store_metadata_id_mismatch');
    expect(mismatchFreeStatus.fix).toContain('Use --id free-context');
  });

  it('flags clone-fragile directories and commitless clones', async () => {
    const storeRoot = mkdir('fragile-context');
    const gitExecEnv = { ...process.env, ...isolatedGitEnv() };
    createHealthyOpenSpecRoot(storeRoot);
    execFileSync('git', ['init'], { cwd: storeRoot, stdio: 'ignore' });
    execFileSync('git', ['add', 'openspec/config.yaml'], { cwd: storeRoot, env: gitExecEnv });
    execFileSync('git', ['commit', '-m', 'partial'], { cwd: storeRoot, env: gitExecEnv, stdio: 'ignore' });
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'fragile-context' });
    await writeContextStoreRegistryState(
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

    const doctor = await runCLI(['context-store', 'doctor', 'fragile-context', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(doctor.exitCode).toBe(0);
    const store = parseJson(doctor).context_stores[0];
    expect(store.git.has_commits).toBe(true);
    expect(store.status).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'context_store_clone_fragile_directories',
        message: expect.stringContaining('openspec/specs/'),
      }),
    ]);

    // A commitless clone refuses register with the empty-clone explanation.
    const emptyClone = mkdir('empty-clone');
    execFileSync('git', ['init'], { cwd: emptyClone, stdio: 'ignore' });
    const register = await runCLI(['context-store', 'register', emptyClone, '--json'], {
      cwd: tempDir,
      env,
    });
    expect(register.exitCode).toBe(1);
    const registerStatus = parseJson(register).status[0];
    expect(registerStatus.code).toBe('context_store_register_root_unhealthy');
    expect(registerStatus.message).toContain('no commits');
    expect(registerStatus.fix).toContain('Commit and push the origin store');
  });
});
