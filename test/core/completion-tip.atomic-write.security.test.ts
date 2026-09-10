import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { maybeShowCompletionTip } from '../../src/core/completion-tip.js';
import { getGlobalConfigPath } from '../../src/core/global-config.js';

/**
 * The seen flag used to be written through a predictable
 * `<config>.<pid>.tmp` at the default mode, then renamed over the config -
 * so the config inherited a world-readable mode. Every other atomic writer in
 * the repo uses a randomized temp name and 0600.
 */
describe('core/completion-tip atomic write', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-completion-tip-mode-'));
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
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

  it.skipIf(process.platform === 'win32')(
    'writes the config owner-only and leaves no predictable temp file behind',
    async () => {
      const configPath = getGlobalConfigPath();

      await maybeShowCompletionTip();

      expect(JSON.parse(fs.readFileSync(configPath, 'utf-8')).completionTipSeen).toBe(true);
      expect(fs.statSync(configPath).mode & 0o777).toBe(0o600);
      expect(fs.existsSync(`${configPath}.${process.pid}.tmp`)).toBe(false);
      expect(fs.readdirSync(path.dirname(configPath)).filter((n) => n.endsWith('.tmp'))).toEqual([]);
    }
  );
});
