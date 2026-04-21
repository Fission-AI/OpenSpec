import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

import {
  getConfigPath,
  readConfig,
  writeConfig,
  getTelemetryConfig,
  updateTelemetryConfig,
} from '../../src/telemetry/config.js';

describe('telemetry/config', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  function restoreEnv(env: NodeJS.ProcessEnv): void {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, env);
  }

  function defaultConfigDir(): string {
    return os.platform() === 'win32'
      ? path.join(tempDir, 'appdata', 'openspec')
      : path.join(tempDir, '.config', 'openspec');
  }

  function defaultConfigPath(): string {
    return path.join(defaultConfigDir(), 'config.json');
  }

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `openspec-telemetry-test-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Mock HOME/USERPROFILE to point to temp dir
    // On POSIX, os.homedir() uses HOME; on Windows it uses USERPROFILE
    originalEnv = { ...process.env };
    delete process.env.XDG_CONFIG_HOME;
    process.env.APPDATA = path.join(tempDir, 'appdata');
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
  });

  afterEach(() => {
    // Restore environment
    restoreEnv(originalEnv);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getConfigPath', () => {
    it('should return path to config.json in the default config directory', () => {
      const result = getConfigPath();
      expect(result).toBe(defaultConfigPath());
    });

    it('should use XDG_CONFIG_HOME when set', () => {
      const xdgConfigHome = path.join(tempDir, 'xdg-config');
      process.env.XDG_CONFIG_HOME = xdgConfigHome;

      const result = getConfigPath();

      expect(result).toBe(path.join(xdgConfigHome, 'openspec', 'config.json'));
    });
  });

  describe('readConfig', () => {
    it('should return empty object when config file does not exist', async () => {
      const config = await readConfig();
      expect(config).toEqual({});
    });

    it('should load valid config from file', async () => {
      const configDir = defaultConfigDir();
      const configPath = defaultConfigPath();

      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        telemetry: { anonymousId: 'test-id', noticeSeen: true }
      }));

      const config = await readConfig();
      expect(config.telemetry).toEqual({ anonymousId: 'test-id', noticeSeen: true });
    });

    it('should return empty object for invalid JSON', async () => {
      const configDir = defaultConfigDir();
      const configPath = defaultConfigPath();

      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, '{ invalid json }');

      const config = await readConfig();
      expect(config).toEqual({});
    });

    it('should migrate telemetry from legacy path when XDG_CONFIG_HOME is set', async () => {
      const xdgConfigHome = path.join(tempDir, 'xdg-config');
      const legacyConfigDir = path.join(tempDir, '.config', 'openspec');
      const legacyConfigPath = path.join(legacyConfigDir, 'config.json');
      const newConfigPath = path.join(xdgConfigHome, 'openspec', 'config.json');
      process.env.XDG_CONFIG_HOME = xdgConfigHome;

      fs.mkdirSync(legacyConfigDir, { recursive: true });
      fs.writeFileSync(legacyConfigPath, JSON.stringify({
        telemetry: { anonymousId: 'legacy-id', noticeSeen: true },
      }));

      const config = await readConfig();

      expect(config.telemetry).toEqual({ anonymousId: 'legacy-id', noticeSeen: true });
      expect(JSON.parse(fs.readFileSync(newConfigPath, 'utf-8')).telemetry).toEqual({
        anonymousId: 'legacy-id',
        noticeSeen: true,
      });
    });

    it('should not overwrite invalid new config during legacy migration', async () => {
      const xdgConfigHome = path.join(tempDir, 'xdg-config');
      const legacyConfigDir = path.join(tempDir, '.config', 'openspec');
      const legacyConfigPath = path.join(legacyConfigDir, 'config.json');
      const newConfigDir = path.join(xdgConfigHome, 'openspec');
      const newConfigPath = path.join(newConfigDir, 'config.json');
      const invalidJson = '{ invalid json }';
      process.env.XDG_CONFIG_HOME = xdgConfigHome;

      fs.mkdirSync(legacyConfigDir, { recursive: true });
      fs.writeFileSync(legacyConfigPath, JSON.stringify({
        telemetry: { anonymousId: 'legacy-id', noticeSeen: true },
      }));

      fs.mkdirSync(newConfigDir, { recursive: true });
      fs.writeFileSync(newConfigPath, invalidJson);

      const config = await readConfig();

      expect(config.telemetry).toEqual({ anonymousId: 'legacy-id', noticeSeen: true });
      expect(fs.readFileSync(newConfigPath, 'utf-8')).toBe(invalidJson);
    });

    it('should fill only missing telemetry fields from legacy config', async () => {
      const xdgConfigHome = path.join(tempDir, 'xdg-config');
      const legacyConfigDir = path.join(tempDir, '.config', 'openspec');
      const legacyConfigPath = path.join(legacyConfigDir, 'config.json');
      const newConfigDir = path.join(xdgConfigHome, 'openspec');
      const newConfigPath = path.join(newConfigDir, 'config.json');
      process.env.XDG_CONFIG_HOME = xdgConfigHome;

      fs.mkdirSync(legacyConfigDir, { recursive: true });
      fs.writeFileSync(legacyConfigPath, JSON.stringify({
        telemetry: { anonymousId: 'legacy-id', noticeSeen: true },
        legacyOnly: 'ignored',
      }));

      fs.mkdirSync(newConfigDir, { recursive: true });
      fs.writeFileSync(newConfigPath, JSON.stringify({
        featureFlags: { existing: true },
        telemetry: { anonymousId: 'new-id' },
      }));

      const config = await readConfig();

      expect(config.featureFlags).toEqual({ existing: true });
      expect(config.telemetry).toEqual({ anonymousId: 'new-id', noticeSeen: true });
      expect((config as Record<string, unknown>).legacyOnly).toBeUndefined();
      expect(JSON.parse(fs.readFileSync(newConfigPath, 'utf-8')).telemetry).toEqual({
        anonymousId: 'new-id',
        noticeSeen: true,
      });
    });
  });

  describe('writeConfig', () => {
    it('should create directory if it does not exist', async () => {
      const configDir = defaultConfigDir();

      await writeConfig({ telemetry: { noticeSeen: true } });

      expect(fs.existsSync(configDir)).toBe(true);
    });

    it('should write config to file', async () => {
      const configPath = defaultConfigPath();

      await writeConfig({ telemetry: { anonymousId: 'test-123' } });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('test-123');
    });

    it('should write config to XDG_CONFIG_HOME when set', async () => {
      const xdgConfigHome = path.join(tempDir, 'xdg-config');
      const configPath = path.join(xdgConfigHome, 'openspec', 'config.json');
      process.env.XDG_CONFIG_HOME = xdgConfigHome;

      await writeConfig({ telemetry: { anonymousId: 'test-123' } });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('test-123');
    });

    it('should preserve existing fields when updating', async () => {
      const configDir = defaultConfigDir();
      const configPath = defaultConfigPath();

      // Create initial config with other fields
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        existingField: 'preserved',
        telemetry: { anonymousId: 'old-id' }
      }));

      // Update telemetry
      await writeConfig({ telemetry: { noticeSeen: true } });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.existingField).toBe('preserved');
      expect(parsed.telemetry.noticeSeen).toBe(true);
    });

    it('should deep merge telemetry fields', async () => {
      const configDir = defaultConfigDir();
      const configPath = defaultConfigPath();

      // Create initial config
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        telemetry: { anonymousId: 'existing-id' }
      }));

      // Update with noticeSeen only
      await writeConfig({ telemetry: { noticeSeen: true } });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('existing-id');
      expect(parsed.telemetry.noticeSeen).toBe(true);
    });
  });

  describe('getTelemetryConfig', () => {
    it('should return empty object when no config exists', async () => {
      const config = await getTelemetryConfig();
      expect(config).toEqual({});
    });

    it('should return telemetry section from config', async () => {
      const configDir = defaultConfigDir();
      const configPath = defaultConfigPath();

      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        telemetry: { anonymousId: 'my-id', noticeSeen: false }
      }));

      const config = await getTelemetryConfig();
      expect(config).toEqual({ anonymousId: 'my-id', noticeSeen: false });
    });
  });

  describe('updateTelemetryConfig', () => {
    it('should create telemetry config when none exists', async () => {
      await updateTelemetryConfig({ anonymousId: 'new-id' });

      const configPath = defaultConfigPath();
      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('new-id');
    });

    it('should merge with existing telemetry config', async () => {
      const configDir = defaultConfigDir();
      const configPath = defaultConfigPath();

      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        telemetry: { anonymousId: 'existing-id' }
      }));

      await updateTelemetryConfig({ noticeSeen: true });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('existing-id');
      expect(parsed.telemetry.noticeSeen).toBe(true);
    });
  });
});
