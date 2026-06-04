import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Focused tests for `openspec config set` and its --json flag.
 *
 * Covers:
 *   - JSON arrays / objects via --json
 *   - Invalid JSON (with --json) reports the parse error and does not write
 *   - --string and --json conflict
 *   - Schema validation failure (e.g. workflows must be string[])
 *   - Output formatting for strings / numbers / booleans / arrays / objects
 *   - No mutation of the config file on any error path
 *   - Shell completion registry exposes --json on `config set`
 */

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/commands/config.js');
  const program = new Command();
  // commander would otherwise call process.exit() on parse errors; make it throw
  // so the test runner can surface a real failure instead of killing the process.
  program.exitOverride();
  registerConfigCommand(program);
  await program.parseAsync(['node', 'openspec', 'config', ...args]);
}

describe('config set --json', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  function getConfigFilePath(): string {
    return path.join(tempDir, 'openspec', 'config.json');
  }

  function snapshotConfigFile(): string | null {
    const p = getConfigFilePath();
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
  }

  function readConfigJson(): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(getConfigFilePath(), 'utf-8'));
  }

  function getLoggedLines(spy: ReturnType<typeof vi.spyOn>): string[] {
    return spy.mock.calls.map((args) => args.map(String).join(' '));
  }

  beforeEach(() => {
    vi.resetModules();

    tempDir = path.join(
      os.tmpdir(),
      `openspec-config-set-json-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });

    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = tempDir;

    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('JSON arrays / objects', () => {
    it('parses a JSON array of strings into workflows', async () => {
      await runConfigCommand([
        'set',
        'workflows',
        '["propose","explore","apply","sync","archive"]',
        '--json',
      ]);

      expect(process.exitCode).toBeFalsy();
      expect(readConfigJson().workflows).toEqual([
        'propose',
        'explore',
        'apply',
        'sync',
        'archive',
      ]);
      expect(getLoggedLines(consoleLogSpy)).toContain(
        'Set workflows = ["propose","explore","apply","sync","archive"]'
      );
    });

    it('parses a JSON object into featureFlags', async () => {
      await runConfigCommand([
        'set',
        'featureFlags',
        '{"alpha":true,"beta":false}',
        '--json',
      ]);

      expect(process.exitCode).toBeFalsy();
      expect(readConfigJson().featureFlags).toEqual({ alpha: true, beta: false });
      expect(getLoggedLines(consoleLogSpy)).toContain(
        'Set featureFlags = {"alpha":true,"beta":false}'
      );
    });

    it('accepts an empty JSON array', async () => {
      await runConfigCommand(['set', 'workflows', '[]', '--json']);

      expect(process.exitCode).toBeFalsy();
      expect(readConfigJson().workflows).toEqual([]);
      expect(getLoggedLines(consoleLogSpy)).toContain('Set workflows = []');
    });
  });

  describe('invalid JSON with --json', () => {
    it('reports a parse error and does not write the config file', async () => {
      const before = snapshotConfigFile();

      await runConfigCommand(['set', 'workflows', '[propose, apply]', '--json']);

      expect(process.exitCode).toBe(1);
      expect(snapshotConfigFile()).toBe(before);
      const errors = getLoggedLines(consoleErrorSpy);
      expect(
        errors.some((line) =>
          line.startsWith('Error: --json was provided but value is not valid JSON:')
        )
      ).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('reports a parse error for truncated JSON object', async () => {
      const before = snapshotConfigFile();

      await runConfigCommand(['set', 'featureFlags', '{"a":', '--json']);

      expect(process.exitCode).toBe(1);
      expect(snapshotConfigFile()).toBe(before);
    });
  });

  describe('--string / --json conflict', () => {
    it('errors out when both flags are provided', async () => {
      const before = snapshotConfigFile();

      await runConfigCommand([
        'set',
        'workflows',
        '["propose"]',
        '--string',
        '--json',
      ]);

      expect(process.exitCode).toBe(1);
      expect(snapshotConfigFile()).toBe(before);
      expect(getLoggedLines(consoleErrorSpy)).toContain(
        'Error: --string and --json cannot be combined.'
      );
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('schema validation failure', () => {
    it('rejects a JSON value whose shape does not match the schema and does not write', async () => {
      // workflows is array<string>; passing a JSON object should fail schema validation
      const before = snapshotConfigFile();

      await runConfigCommand([
        'set',
        'workflows',
        '{"not":"an array"}',
        '--json',
      ]);

      expect(process.exitCode).toBe(1);
      expect(snapshotConfigFile()).toBe(before);
      const errors = getLoggedLines(consoleErrorSpy);
      expect(
        errors.some((line) => line.startsWith('Error: Invalid configuration'))
      ).toBe(true);
      expect(errors.some((line) => line.toLowerCase().includes('workflows'))).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('rejects an invalid enum value (delivery) and does not write', async () => {
      const before = snapshotConfigFile();

      await runConfigCommand(['set', 'delivery', 'invalid-mode']);

      expect(process.exitCode).toBe(1);
      expect(snapshotConfigFile()).toBe(before);
      const errors = getLoggedLines(consoleErrorSpy);
      expect(
        errors.some((line) => line.startsWith('Error: Invalid configuration'))
      ).toBe(true);
    });

    it('rejects an unknown top-level key without --allow-unknown', async () => {
      const before = snapshotConfigFile();

      await runConfigCommand(['set', 'mysteryKey', '"value"', '--json']);

      expect(process.exitCode).toBe(1);
      expect(snapshotConfigFile()).toBe(before);
      const errors = getLoggedLines(consoleErrorSpy);
      expect(
        errors.some((line) => line.startsWith('Error: Invalid configuration key "mysteryKey"'))
      ).toBe(true);
    });

    it('does not mutate previously stored value when a later set fails validation', async () => {
      // First write a known-good workflows value.
      await runConfigCommand([
        'set',
        'workflows',
        '["propose","apply"]',
        '--json',
      ]);
      expect(readConfigJson().workflows).toEqual(['propose', 'apply']);
      const goodSnapshot = snapshotConfigFile();

      // Now try a value that the schema must reject.
      await runConfigCommand([
        'set',
        'workflows',
        '[1,2,3]',
        '--json',
      ]);

      expect(process.exitCode).toBe(1);
      // File on disk must be untouched.
      expect(snapshotConfigFile()).toBe(goodSnapshot);
      // In-memory read should still return the original good value.
      expect(readConfigJson().workflows).toEqual(['propose', 'apply']);
    });
  });

  describe('output formatting', () => {
    it('quotes plain string values', async () => {
      await runConfigCommand(['set', 'profile', 'custom']);
      expect(getLoggedLines(consoleLogSpy)).toContain('Set profile = "custom"');
    });

    it('renders boolean values without quotes', async () => {
      await runConfigCommand(['set', 'featureFlags.alpha', 'true']);
      expect(getLoggedLines(consoleLogSpy)).toContain('Set featureFlags.alpha = true');
      expect(readConfigJson().featureFlags).toEqual({ alpha: true });
    });

    it('renders arrays via JSON.stringify', async () => {
      await runConfigCommand(['set', 'workflows', '["propose"]', '--json']);
      expect(getLoggedLines(consoleLogSpy)).toContain('Set workflows = ["propose"]');
    });

    it('renders objects via JSON.stringify', async () => {
      await runConfigCommand(['set', 'featureFlags', '{"x":true}', '--json']);
      expect(getLoggedLines(consoleLogSpy)).toContain('Set featureFlags = {"x":true}');
    });

    it('--string keeps a number-looking value as a quoted string', async () => {
      // featureFlags.alpha must be boolean per schema, so use an unknown key with --allow-unknown
      // to exercise --string formatting independently of schema typing.
      await runConfigCommand([
        'set',
        'someText',
        '42',
        '--string',
        '--allow-unknown',
      ]);
      expect(getLoggedLines(consoleLogSpy)).toContain('Set someText = "42"');
      expect(readConfigJson().someText).toBe('42');
    });
  });
});

describe('config set shell completion registry', () => {
  it('exposes --json alongside --string and --allow-unknown', async () => {
    const { COMMAND_REGISTRY } = await import(
      '../../src/core/completions/command-registry.js'
    );

    const configCmd = COMMAND_REGISTRY.find((cmd) => cmd.name === 'config');
    const setCmd = configCmd?.subcommands?.find((s) => s.name === 'set');
    expect(setCmd).toBeDefined();

    const flagNames = setCmd?.flags?.map((f) => f.name) ?? [];
    expect(flagNames).toContain('string');
    expect(flagNames).toContain('json');
    expect(flagNames).toContain('allow-unknown');

    const jsonFlag = setCmd?.flags?.find((f) => f.name === 'json');
    expect(jsonFlag?.description).toMatch(/json/i);
  });
});
