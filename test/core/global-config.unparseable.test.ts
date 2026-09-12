import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { runCLI } from '../helpers/run-cli.js';

/**
 * A global config file with a typo is still the user's file. Reads fall back
 * to defaults with a warning, but nothing may write those defaults back over
 * it, and telemetry may not read them as consent: the file can hold
 * `telemetry.enabled: false`.
 */

const SETTINGS = {
  featureFlags: {},
  profile: 'custom',
  delivery: 'both',
  telemetry: { noticeSeen: true, anonymousId: '0e249867-af5d-445b-92c7-722fbec024f1', enabled: false },
  workflows: ['propose', 'apply', 'verify'],
};
const VALID = `${JSON.stringify(SETTINGS, null, 2)}\n`;
// The trailing comma a hand edit leaves behind.
const TYPO = VALID.replace(/\n}\n$/, ',\n}\n');

describe('an unparseable global config', () => {
  let tempDir: string;
  let configPath: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: typeof process.exitCode;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-unparseable-config-'));
    originalEnv = { ...process.env };
    originalExitCode = process.exitCode;

    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.APPDATA = path.join(tempDir, 'appdata');
    // Telemetry stays on at the environment level, as in a user's shell, so
    // only the config file decides.
    delete process.env.OPENSPEC_TELEMETRY;
    delete process.env.DO_NOT_TRACK;
    delete process.env.CI;

    configPath = path.join(tempDir, 'openspec', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(async () => {
    const { shutdown } = await import('../../src/telemetry/index.js');
    await shutdown();
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const read = () => fs.readFileSync(configPath, 'utf-8');

  it('is detected as unreadable, while a missing or valid file is not', async () => {
    const { isGlobalConfigUnreadable } = await import('../../src/core/global-config.js');

    expect(isGlobalConfigUnreadable()).toBe(false);
    fs.writeFileSync(configPath, VALID);
    expect(isGlobalConfigUnreadable()).toBe(false);
    fs.writeFileSync(configPath, TYPO);
    expect(isGlobalConfigUnreadable()).toBe(true);
  });

  describe('saveGlobalConfig', () => {
    it('refuses to overwrite it, names the file and the fix, and leaves it byte-identical', async () => {
      const { saveGlobalConfig } = await import('../../src/core/global-config.js');
      fs.writeFileSync(configPath, TYPO);

      let message = '';
      try {
        saveGlobalConfig({ profile: 'core' });
      } catch (error) {
        message = (error as Error).message;
      }

      expect(message).toContain(configPath);
      expect(message).toContain('openspec config edit');
      expect(read()).toBe(TYPO);
    });

    it('replaces it when asked to, as a reset does', async () => {
      const { saveGlobalConfig } = await import('../../src/core/global-config.js');
      fs.writeFileSync(configPath, TYPO);

      saveGlobalConfig({ profile: 'core' }, { replaceUnreadable: true });

      expect(JSON.parse(read())).toEqual({ profile: 'core' });
    });

    it('still creates a missing file and overwrites a valid one', async () => {
      const { saveGlobalConfig } = await import('../../src/core/global-config.js');

      saveGlobalConfig({ profile: 'custom' });
      expect(JSON.parse(read())).toEqual({ profile: 'custom' });
      saveGlobalConfig({ profile: 'core' });
      expect(JSON.parse(read())).toEqual({ profile: 'core' });
    });
  });

  describe('telemetry', () => {
    // Fresh modules per test: telemetry caches the anonymous id it minted.
    beforeEach(() => {
      vi.resetModules();
    });

    it('is off when the file cannot be parsed', async () => {
      fs.writeFileSync(configPath, TYPO);
      const { isTelemetryEnabled } = await import('../../src/telemetry/index.js');

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('is on for a valid file with no opt-out', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ profile: 'core' }));
      const { isTelemetryEnabled } = await import('../../src/telemetry/index.js');

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('sends nothing and writes nothing when a command runs', async () => {
      fs.writeFileSync(configPath, TYPO);
      const { maybeShowTelemetryNotice, trackCommand, shutdown } = await import('../../src/telemetry/index.js');

      await maybeShowTelemetryNotice();
      await trackCommand('list', '0.0.0-test');
      await shutdown();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(read()).toBe(TYPO);
      // The existing warning still tells the user their settings are ignored.
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
    });

    it('still records the notice and identity in a valid file, keeping its other settings', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ profile: 'custom', workflows: ['propose'] }, null, 2));
      const { maybeShowTelemetryNotice, trackCommand, shutdown } = await import('../../src/telemetry/index.js');

      await maybeShowTelemetryNotice();
      await trackCommand('list', '0.0.0-test');
      await shutdown();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const saved = JSON.parse(read());
      expect(saved.profile).toBe('custom');
      expect(saved.workflows).toEqual(['propose']);
      expect(saved.telemetry.noticeSeen).toBe(true);
      expect(saved.telemetry.anonymousId).toEqual(expect.any(String));
    });

    it('still creates the file on a first run', async () => {
      const { trackCommand, shutdown } = await import('../../src/telemetry/index.js');

      await trackCommand('list', '0.0.0-test');
      await shutdown();

      expect(JSON.parse(read()).telemetry.anonymousId).toEqual(expect.any(String));
    });

    it('never has a telemetry update written over the file', async () => {
      fs.writeFileSync(configPath, TYPO);
      const { updateTelemetryConfig } = await import('../../src/telemetry/config.js');

      await expect(updateTelemetryConfig({ noticeSeen: true })).rejects.toThrow(/could not be parsed/);
      expect(read()).toBe(TYPO);
    });
  });

  describe('openspec config', () => {
    let registerConfigCommand: typeof import('../../src/commands/config.js').registerConfigCommand;

    // Imported once: the command module pulls in most of the CLI.
    beforeAll(async () => {
      ({ registerConfigCommand } = await import('../../src/commands/config.js'));
    }, 60_000);

    async function runConfig(args: string[]): Promise<void> {
      const program = new Command();
      registerConfigCommand(program);
      await program.parseAsync(['node', 'openspec', 'config', ...args]);
    }

    const errorOutput = () => consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    it.each([
      [['set', 'profile', 'core']],
      [['set', 'telemetry.enabled', 'true']],
      [['unset', 'profile']],
      [['profile', 'core']],
    ])('refuses `config %s` and leaves the file unchanged', async (args) => {
      fs.writeFileSync(configPath, TYPO);

      await runConfig(args);

      expect(read()).toBe(TYPO);
      expect(process.exitCode).toBe(1);
      expect(errorOutput()).toContain(configPath);
      expect(errorOutput()).toContain('openspec config edit');
    });

    it('lets `config reset --all` replace the file with defaults', async () => {
      fs.writeFileSync(configPath, TYPO);

      await runConfig(['reset', '--all', '--yes']);

      const saved = JSON.parse(read());
      expect(saved.profile).toBe('core');
      expect(saved.telemetry).toBeUndefined();
    });

    it('still sets a value in a valid file', async () => {
      fs.writeFileSync(configPath, VALID);

      await runConfig(['set', 'profile', 'core']);

      const saved = JSON.parse(read());
      expect(saved.profile).toBe('core');
      expect(saved.telemetry).toEqual(SETTINGS.telemetry);
    });
  });

  it('is left byte-identical by a read-only CLI command', async () => {
    const project = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(project, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(project, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(path.join(project, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(configPath, TYPO);

    const result = await runCLI(['list'], {
      cwd: project,
      env: {
        XDG_CONFIG_HOME: tempDir,
        HOME: tempDir,
        USERPROFILE: tempDir,
        // Telemetry on at the environment level, as for a real user.
        OPENSPEC_TELEMETRY: '1',
        DO_NOT_TRACK: '0',
        CI: 'false',
      },
      timeoutMs: 60_000,
    });

    expect(read()).toBe(TYPO);
    expect(result.stderr).toContain('Invalid JSON');
  }, 120_000);
});
