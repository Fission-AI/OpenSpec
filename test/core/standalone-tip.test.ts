import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const state = vi.hoisted(() => ({
  ci: false,
  standalone: null as string | null,
  scope: 'global' as string | null,
}));

vi.mock('../../src/utils/ci.js', () => ({ isCiEnvironment: () => state.ci }));
vi.mock('../../src/core/version-check.js', () => ({
  getStandaloneBinaryPath: () => state.standalone,
  getCliInstallInfo: () => ({ location: '/x', packageManager: 'npm', scope: state.scope }),
}));

const { maybeShowStandaloneTip, STANDALONE_TIP_MESSAGE } = await import('../../src/core/standalone-tip.js');

describe('standalone tip', () => {
  let configHome: string;
  let originalConfigHome: string | undefined;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const configPath = () => path.join(configHome, 'openspec', 'config.json');
  const shown = () => errorSpy.mock.calls.filter((call) => String(call[0]).includes(STANDALONE_TIP_MESSAGE)).length;

  beforeEach(() => {
    configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-standalone-tip-'));
    originalConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = configHome;
    Object.assign(state, { ci: false, standalone: null, scope: 'global' });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    process.env.XDG_CONFIG_HOME = originalConfigHome;
    fs.rmSync(configHome, { recursive: true, force: true });
  });

  it('offers the standalone install once to a global package-manager install', async () => {
    await maybeShowStandaloneTip();
    await maybeShowStandaloneTip();

    expect(shown()).toBe(1);
    expect(STANDALONE_TIP_MESSAGE).toContain("openspec install");
    expect(JSON.parse(fs.readFileSync(configPath(), 'utf8')).standaloneTipSeen).toBe(true);
  });

  it('keeps the rest of the config untouched when it records the flag', async () => {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify({ profile: 'custom', workflows: ['propose'] }));

    await maybeShowStandaloneTip();

    expect(JSON.parse(fs.readFileSync(configPath(), 'utf8'))).toEqual({
      profile: 'custom',
      workflows: ['propose'],
      standaloneTipSeen: true,
    });
  });

  it('defers without using up the tip when nobody would read it', async () => {
    await maybeShowStandaloneTip({ silent: true });
    expect(shown()).toBe(0);
    expect(fs.existsSync(configPath())).toBe(false);

    await maybeShowStandaloneTip();
    expect(shown()).toBe(1);
  });

  it('stays quiet for the binary itself, in CI, and for installs with nothing to switch', async () => {
    state.standalone = '/home/a/.local/bin/openspec';
    await maybeShowStandaloneTip();
    state.standalone = null;

    state.ci = true;
    await maybeShowStandaloneTip();
    state.ci = false;

    for (const scope of ['project', 'temporary', 'source', null]) {
      state.scope = scope;
      await maybeShowStandaloneTip();
    }

    expect(shown()).toBe(0);
    expect(fs.existsSync(configPath())).toBe(false);
  });

  it('leaves a config it cannot read alone', async () => {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), '{ not json');

    await maybeShowStandaloneTip();

    expect(shown()).toBe(0);
    expect(fs.readFileSync(configPath(), 'utf8')).toBe('{ not json');
  });
});
