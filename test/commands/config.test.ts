import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { parse as parseYaml } from 'yaml';

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/commands/config.js');
  const program = new Command();
  registerConfigCommand(program);
  await program.parseAsync(['node', 'openspec', 'config', ...args]);
}

describe('config command integration', () => {
  // These tests use real file system operations with XDG_CONFIG_HOME override
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `openspec-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Save original env and set XDG_CONFIG_HOME
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = tempDir;

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Restore spies
    consoleErrorSpy.mockRestore();

    // Reset module cache to pick up new XDG_CONFIG_HOME
    vi.resetModules();
  });

  it('should use XDG_CONFIG_HOME for config path', async () => {
    const { getGlobalConfigPath } = await import('../../src/core/global-config.js');
    const configPath = getGlobalConfigPath();
    expect(configPath).toBe(path.join(tempDir, 'openspec', 'config.json'));
  });

  it('should save and load config correctly', async () => {
    const { getGlobalConfig, saveGlobalConfig } = await import('../../src/core/global-config.js');

    saveGlobalConfig({ featureFlags: { test: true } });
    const config = getGlobalConfig();
    expect(config.featureFlags).toEqual({ test: true });
  });

  it('should return defaults when config file does not exist', async () => {
    const { getGlobalConfig, getGlobalConfigPath } = await import('../../src/core/global-config.js');

    const configPath = getGlobalConfigPath();
    // Make sure config doesn't exist
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    const config = getGlobalConfig();
    expect(config.featureFlags).toEqual({});
  });

  it('should preserve unknown fields', async () => {
    const { getGlobalConfig, getGlobalConfigDir } = await import('../../src/core/global-config.js');

    const configDir = getGlobalConfigDir();
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({
      featureFlags: {},
      customField: 'preserved',
    }));

    const config = getGlobalConfig();
    expect((config as Record<string, unknown>).customField).toBe('preserved');
  });

  it('should handle invalid JSON gracefully', async () => {
    const { getGlobalConfig, getGlobalConfigDir } = await import('../../src/core/global-config.js');

    const configDir = getGlobalConfigDir();
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), '{ invalid json }');

    const config = getGlobalConfig();
    // Should return defaults
    expect(config.featureFlags).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
  });
});

describe('config command project scope', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalExitCode: number | undefined;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-config-project-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalExitCode = process.exitCode;

    process.env.XDG_CONFIG_HOME = tempDir;
    process.chdir(tempDir);
    process.exitCode = undefined;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.resetModules();
  });

  it('set/get with --scope project writes project config without mutating global config', async () => {
    const { getGlobalConfig } = await import('../../src/core/global-config.js');

    await runConfigCommand(['--scope', 'project', 'set', 'profile', 'custom']);

    const projectConfigPath = path.join(tempDir, 'openspec', 'config.yaml');
    expect(fs.existsSync(projectConfigPath)).toBe(true);

    const parsed = parseYaml(fs.readFileSync(projectConfigPath, 'utf-8')) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      schema: 'spec-driven',
      profile: 'custom',
    });

    expect(getGlobalConfig().profile).toBe('core');

    consoleLogSpy.mockClear();
    await runConfigCommand(['--scope', 'project', 'get', 'profile']);
    expect(consoleLogSpy).toHaveBeenCalledWith('custom');
  });

  it('project-scoped writes preserve existing schema/context/rules fields', async () => {
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
context: Keep me
rules:
  proposal:
    - Keep this
`
    );

    await runConfigCommand(['--scope', 'project', 'set', 'delivery', 'commands']);

    const parsed = parseYaml(
      fs.readFileSync(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8')
    ) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      schema: 'spec-driven',
      context: 'Keep me',
      delivery: 'commands',
    });
    expect(parsed.rules).toEqual({ proposal: ['Keep this'] });
  });

  it('unset with --scope project removes key without mutating global config', async () => {
    const { getGlobalConfig, saveGlobalConfig } = await import('../../src/core/global-config.js');
    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'both', workflows: ['explore'] });

    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
profile: custom
`
    );

    await runConfigCommand(['--scope', 'project', 'unset', 'profile']);

    const parsed = parseYaml(
      fs.readFileSync(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8')
    ) as Record<string, unknown>;
    expect(parsed).toEqual({ schema: 'spec-driven' });
    expect(getGlobalConfig().profile).toBe('custom');
  });

  it('rejects unsupported project-scoped keys', async () => {
    await runConfigCommand(['--scope', 'project', 'set', 'schema', 'spec-driven']);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Project scope only supports profile-related keys')
    );
  });

  it('builds project config paths with cross-platform join semantics (including win32-style roots)', async () => {
    const { getProjectConfigFilePaths } = await import('../../src/commands/config.js');

    const windowsLikeRoot = 'C:\\repo\\sample-project';
    const paths = getProjectConfigFilePaths(windowsLikeRoot);

    expect(path.win32.normalize(paths.yamlPath)).toBe(
      path.win32.join(windowsLikeRoot, 'openspec', 'config.yaml')
    );
    expect(path.win32.normalize(paths.ymlPath)).toBe(
      path.win32.join(windowsLikeRoot, 'openspec', 'config.yml')
    );
  });
});

describe('config command shell completion registry', () => {
  it('should have config command in registry', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    expect(configCmd).toBeDefined();
    expect(configCmd?.description).toBe('View and modify OpenSpec configuration');
  });

  it('should have all config subcommands in registry', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    const subcommandNames = configCmd?.subcommands?.map((s) => s.name) ?? [];

    expect(subcommandNames).toContain('path');
    expect(subcommandNames).toContain('list');
    expect(subcommandNames).toContain('get');
    expect(subcommandNames).toContain('set');
    expect(subcommandNames).toContain('unset');
    expect(subcommandNames).toContain('reset');
    expect(subcommandNames).toContain('edit');
  });

  it('should have --json flag on list subcommand', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    const listCmd = configCmd?.subcommands?.find((s) => s.name === 'list');
    const flagNames = listCmd?.flags?.map((f) => f.name) ?? [];

    expect(flagNames).toContain('json');
  });

  it('should have --string flag on set subcommand', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    const setCmd = configCmd?.subcommands?.find((s) => s.name === 'set');
    const flagNames = setCmd?.flags?.map((f) => f.name) ?? [];

    expect(flagNames).toContain('string');
    expect(flagNames).toContain('allow-unknown');
  });

  it('should have --all and -y flags on reset subcommand', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    const resetCmd = configCmd?.subcommands?.find((s) => s.name === 'reset');
    const flagNames = resetCmd?.flags?.map((f) => f.name) ?? [];

    expect(flagNames).toContain('all');
    expect(flagNames).toContain('yes');
  });

  it('should have --scope flag on config command', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    const scopeFlag = configCmd?.flags?.find((f) => f.name === 'scope');

    expect(scopeFlag).toBeDefined();
    expect(scopeFlag?.values).toEqual(['user', 'project']);
  });

  it('should include update scope override flag in registry', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const updateCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'update');
    const scopeFlag = updateCmd?.flags?.find((f) => f.name === 'scope');
    const forceFlag = updateCmd?.flags?.find((f) => f.name === 'force');

    expect(forceFlag).toBeDefined();
    expect(scopeFlag).toBeDefined();
    expect(scopeFlag?.values).toEqual(['user', 'project']);
  });
});

describe('config key validation', () => {
  it('rejects unknown top-level keys', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('unknownKey').valid).toBe(false);
  });

  it('allows feature flag keys', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('featureFlags.someFlag').valid).toBe(true);
  });

  it('rejects deeply nested feature flag keys', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('featureFlags.someFlag.extra').valid).toBe(false);
  });

  it('allows profile key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('profile').valid).toBe(true);
  });

  it('allows delivery key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('delivery').valid).toBe(true);
  });

  it('allows workflows key', async () => {
    const { validateConfigKeyPath } = await import('../../src/core/config-schema.js');
    expect(validateConfigKeyPath('workflows').valid).toBe(true);
  });
});

describe('config profile command', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-profile-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.resetModules();
  });

  it('core preset should set profile to core and preserve delivery', async () => {
    const { getGlobalConfig, saveGlobalConfig } = await import('../../src/core/global-config.js');

    // Set initial config with custom delivery
    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills', workflows: ['explore'] });

    // Simulate the core preset logic
    const config = getGlobalConfig();
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');
    config.profile = 'core';
    config.workflows = [...CORE_WORKFLOWS];
    // Delivery should be preserved
    saveGlobalConfig(config);

    const result = getGlobalConfig();
    expect(result.profile).toBe('core');
    expect(result.delivery).toBe('skills'); // preserved
    expect(result.workflows).toEqual(['propose', 'explore', 'apply', 'archive']);
  });

  it('custom workflow selection should set profile to custom', async () => {
    const { getGlobalConfig, saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');

    // Simulate custom selection that differs from core
    const selectedWorkflows = ['explore', 'new', 'apply', 'ff', 'verify'];
    const isCoreMatch =
      selectedWorkflows.length === CORE_WORKFLOWS.length &&
      CORE_WORKFLOWS.every((w: string) => selectedWorkflows.includes(w));

    expect(isCoreMatch).toBe(false);

    saveGlobalConfig({
      featureFlags: {},
      profile: isCoreMatch ? 'core' : 'custom',
      delivery: 'both',
      workflows: selectedWorkflows,
    });

    const result = getGlobalConfig();
    expect(result.profile).toBe('custom');
    expect(result.workflows).toEqual(selectedWorkflows);
  });

  it('selecting exactly core workflows should set profile to core', async () => {
    const { CORE_WORKFLOWS } = await import('../../src/core/profiles.js');

    const selectedWorkflows = [...CORE_WORKFLOWS];
    const isCoreMatch =
      selectedWorkflows.length === CORE_WORKFLOWS.length &&
      CORE_WORKFLOWS.every((w: string) => selectedWorkflows.includes(w));

    expect(isCoreMatch).toBe(true);
  });

  it('config schema should validate profile and delivery values', async () => {
    const { validateConfig } = await import('../../src/core/config-schema.js');

    expect(validateConfig({ featureFlags: {}, profile: 'core', delivery: 'both' }).success).toBe(true);
    expect(validateConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills' }).success).toBe(true);
    expect(validateConfig({ featureFlags: {}, profile: 'custom', delivery: 'commands', workflows: ['explore'] }).success).toBe(true);
  });

  it('config schema should reject invalid profile values', async () => {
    const { validateConfig } = await import('../../src/core/config-schema.js');

    const result = validateConfig({ featureFlags: {}, profile: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('config schema should reject invalid delivery values', async () => {
    const { validateConfig } = await import('../../src/core/config-schema.js');

    const result = validateConfig({ featureFlags: {}, delivery: 'invalid' });
    expect(result.success).toBe(false);
  });
});
