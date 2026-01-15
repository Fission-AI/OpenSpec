import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  getConfigPath,
  readConfig,
  writeConfig,
  getTelemetryConfig,
  updateTelemetryConfig,
} from '../../src/telemetry/config.js';

describe('telemetry/config', () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = path.join(os.tmpdir(), `openspec-telemetry-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Mock HOME/USERPROFILE to point to temp dir
    // On POSIX, os.homedir() uses HOME; on Windows it uses USERPROFILE
    originalHome = process.env.HOME;
    originalUserProfile = process.env.USERPROFILE;
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
  });

  afterEach(() => {
    // Restore HOME/USERPROFILE
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalUserProfile;

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getConfigPath', () => {
    it('should return path to config.json in .config/openspec', () => {
      const result = getConfigPath();
      expect(result).toBe(path.join(tempDir, '.config', 'openspec', 'config.json'));
    });
  });

  describe('readConfig', () => {
    it('should return empty object when config file does not exist', async () => {
      const config = await readConfig();
      expect(config).toEqual({});
    });

    it('should load valid config from file', async () => {
      const configDir = path.join(tempDir, '.config', 'openspec');
      const configPath = path.join(configDir, 'config.json');

      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        telemetry: { anonymousId: 'test-id', noticeSeen: true }
      }));

      const config = await readConfig();
      expect(config.telemetry).toEqual({ anonymousId: 'test-id', noticeSeen: true });
    });

    it('should return empty object for invalid JSON', async () => {
      const configDir = path.join(tempDir, '.config', 'openspec');
      const configPath = path.join(configDir, 'config.json');

      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, '{ invalid json }');

      const config = await readConfig();
      expect(config).toEqual({});
    });
  });

  describe('writeConfig', () => {
    it('should create directory if it does not exist', async () => {
      const configDir = path.join(tempDir, '.config', 'openspec');

      await writeConfig({ telemetry: { noticeSeen: true } });

      expect(fs.existsSync(configDir)).toBe(true);
    });

    it('should write config to file', async () => {
      const configPath = path.join(tempDir, '.config', 'openspec', 'config.json');

      await writeConfig({ telemetry: { anonymousId: 'test-123' } });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('test-123');
    });

    it('should preserve existing fields when updating', async () => {
      const configDir = path.join(tempDir, '.config', 'openspec');
      const configPath = path.join(configDir, 'config.json');

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
      const configDir = path.join(tempDir, '.config', 'openspec');
      const configPath = path.join(configDir, 'config.json');

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
      const configDir = path.join(tempDir, '.config', 'openspec');
      const configPath = path.join(configDir, 'config.json');

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

      const configPath = path.join(tempDir, '.config', 'openspec', 'config.json');
      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.telemetry.anonymousId).toBe('new-id');
    });

    it('should merge with existing telemetry config', async () => {
      const configDir = path.join(tempDir, '.config', 'openspec');
      const configPath = path.join(configDir, 'config.json');

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
