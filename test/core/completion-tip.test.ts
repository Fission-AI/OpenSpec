import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { maybeShowCompletionTip, COMPLETION_TIP_MESSAGE } from '../../src/core/completion-tip.js';
import { getGlobalConfig, getGlobalConfigPath } from '../../src/core/global-config.js';

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

  it('prints the tip on the first run and records that it was seen', () => {
    maybeShowCompletionTip();

    expect(printedTip()).toBe(true);
    expect(getGlobalConfig().completionTipSeen).toBe(true);
  });

  it('does not print the tip again on later runs', () => {
    maybeShowCompletionTip();
    errorSpy.mockClear();

    maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
  });

  it('defers the tip on silent runs without consuming it', () => {
    maybeShowCompletionTip({ silent: true });

    expect(printedTip()).toBe(false);
    expect(getGlobalConfig().completionTipSeen).toBeUndefined();

    maybeShowCompletionTip();

    expect(printedTip()).toBe(true);
  });

  it.each([
    ['CI', 'true'],
    ['CI', '1'],
    ['OPENSPEC_NO_COMPLETIONS', '1'],
  ])('stays silent when %s=%s', (key, value) => {
    process.env[key] = value;

    maybeShowCompletionTip();

    expect(printedTip()).toBe(false);
    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
  });

  it('preserves unrelated config fields when recording the flag', () => {
    const configPath = getGlobalConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ defaultStore: 'acme', telemetry: { anonymousId: 'abc' } }, null, 2)
    );

    maybeShowCompletionTip();

    const config = getGlobalConfig();
    expect(config.completionTipSeen).toBe(true);
    expect(config.defaultStore).toBe('acme');
    expect(config.telemetry?.anonymousId).toBe('abc');
  });

  it('never throws when the config directory cannot be written', () => {
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'file-in-the-way', 'config');
    fs.writeFileSync(path.join(tempDir, 'file-in-the-way'), 'not a directory');

    expect(() => maybeShowCompletionTip()).not.toThrow();
  });
});
