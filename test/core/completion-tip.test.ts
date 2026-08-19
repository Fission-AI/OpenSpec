import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { maybeShowCompletionTip, COMPLETION_TIP_MESSAGE } from '../../src/core/completion-tip.js';
import { getGlobalConfigPath } from '../../src/core/global-config.js';

describe('core/completion-tip', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  function printedTip(): boolean {
    return errorSpy.mock.calls.some((call) =>
      String(call[0] ?? '').includes(COMPLETION_TIP_MESSAGE)
    );
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-completion-tip-'));
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    // HOME too: the already-installed probe reads the shell's completion dirs,
    // so without this the developer's own installed completions would silence
    // the tip and quietly turn these tests vacuous.
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.SHELL = '/bin/zsh';
    delete process.env.CI;
    delete process.env.OPENSPEC_NO_COMPLETIONS;
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('names a command that actually exists', async () => {
    // Asserting the literal, not the imported constant: comparing the message
    // against itself would pass even if the tip advertised a typo'd command.
    expect(COMPLETION_TIP_MESSAGE).toBe(
      "Tip: Run 'openspec completion install' for shell completions"
    );
  });

  it('prints the tip on the first run and records that it was seen', async () => {
    await maybeShowCompletionTip();

    expect(printedTip()).toBe(true);
    expect(JSON.parse(fs.readFileSync(getGlobalConfigPath(), 'utf-8')).completionTipSeen).toBe(true);
  });

  it('does not print the tip again on later runs', async () => {
    await maybeShowCompletionTip();
    errorSpy.mockClear();

    await maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
  });

  it('defers the tip on silent runs without consuming it', async () => {
    await maybeShowCompletionTip({ silent: true });

    expect(printedTip()).toBe(false);
    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);

    await maybeShowCompletionTip();

    expect(printedTip()).toBe(true);
  });

  it.each([
    ['CI', 'true'],
    ['CI', '1'],
    ['OPENSPEC_NO_COMPLETIONS', '1'],
  ])('stays silent when %s=%s', async (key, value) => {
    process.env[key] = value;

    await maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
  });

  it('does not materialize default config fields when recording the flag', async () => {
    // Regression guard: writing a defaults-merged config would stamp `profile`
    // into config.json, and migrateIfNeeded treats a raw `profile` as "already
    // migrated" — permanently suppressing the one-time profile migration and
    // deleting the user's installed workflow skills.
    await maybeShowCompletionTip();

    const raw = JSON.parse(fs.readFileSync(getGlobalConfigPath(), 'utf-8'));
    expect(raw).toEqual({ completionTipSeen: true });
    expect(raw.profile).toBeUndefined();
    expect(raw.delivery).toBeUndefined();
    expect(raw.featureFlags).toBeUndefined();
  });

  it('leaves an unparsable config untouched and stays silent', async () => {
    const configPath = getGlobalConfigPath();
    const corrupt = '{"defaultStore":"acme","profile":"custom",  }';
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, corrupt);

    await maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
    expect(fs.readFileSync(configPath, 'utf-8')).toBe(corrupt);
  });

  it('stays silent rather than repeating when the flag cannot be persisted', async () => {
    // The unwritable condition is created by occupying the config directory's
    // path with a FILE, not by chmod-ing the directory: on Windows a mode of
    // 0o555 does not stop a write, so the chmod form silenced nothing there and
    // this test failed on windows-pwsh only. `mkdirSync(..., recursive: true)`
    // tolerates an existing directory but throws on an existing file, on every
    // platform, so `markTipSeen` fails exactly where it would for a real
    // permission error - before anything is printed.
    const configDir = path.dirname(getGlobalConfigPath());
    fs.mkdirSync(path.dirname(configDir), { recursive: true });
    fs.writeFileSync(configDir, 'not a directory');

    await maybeShowCompletionTip();
    await maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
    // Still a file: nothing partially wrote through the failure.
    expect(fs.statSync(configDir).isFile()).toBe(true);
  });

  it('retires the tip quietly when completions are already installed', async () => {
    // Without this the CLI tells people to install completions they already
    // have — including on the very next command after `completion install`,
    // whose own run only defers the tip.
    process.env.SHELL = '/bin/fish';
    const installed = path.join(tempDir, '.config', 'fish', 'completions', 'openspec.fish');
    fs.mkdirSync(path.dirname(installed), { recursive: true });
    fs.writeFileSync(installed, '# completions');

    await maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
    expect(JSON.parse(fs.readFileSync(getGlobalConfigPath(), 'utf-8')).completionTipSeen).toBe(true);
  });

  it('still shows the tip when that shell has no completions installed', async () => {
    process.env.SHELL = '/bin/fish';

    await maybeShowCompletionTip();

    expect(printedTip()).toBe(true);
  });

  it('preserves unrelated config fields when recording the flag', async () => {
    const configPath = getGlobalConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ defaultStore: 'acme', telemetry: { anonymousId: 'abc' } }, null, 2)
    );

    await maybeShowCompletionTip();

    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(raw.completionTipSeen).toBe(true);
    expect(raw.defaultStore).toBe('acme');
    expect(raw.telemetry.anonymousId).toBe('abc');
  });
});
