import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

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

describe('config command shell completion registry', () => {
  it('should have config command in registry', async () => {
    const { COMMAND_REGISTRY } = await import('../../src/core/completions/command-registry.js');

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    expect(configCmd).toBeDefined();
    expect(configCmd?.description).toBe('View and modify global OpenSpec configuration');
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
    const flagNames = configCmd?.flags?.map((f) => f.name) ?? [];

    expect(flagNames).toContain('scope');
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
});
