import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import { createRequire } from 'module';
import {
  compareVersions,
  getAvailableCliUpdate,
  getInstallDir,
  isProjectLocalInstall,
  displayCliUpdateNote,
} from '../../src/core/version-check.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

function bumpMajor(version: string): string {
  const major = Number.parseInt(version.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

describe('compareVersions', () => {
  it('orders release versions numerically', () => {
    expect(compareVersions('1.7.0', '1.6.0')).toBe(1);
    expect(compareVersions('1.6.0', '1.7.0')).toBe(-1);
    expect(compareVersions('1.6.0', '1.6.0')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });

  it('sorts prereleases below their release', () => {
    expect(compareVersions('1.7.0-beta.1', '1.7.0')).toBe(-1);
    expect(compareVersions('1.7.0', '1.7.0-beta.1')).toBe(1);
    expect(compareVersions('1.7.0-beta.1', '1.6.0')).toBe(1);
  });

  it('compares prerelease identifiers per SemVer', () => {
    expect(compareVersions('1.7.0-beta.10', '1.7.0-beta.2')).toBe(1);
    expect(compareVersions('1.7.0-beta.2', '1.7.0-beta.10')).toBe(-1);
    expect(compareVersions('1.7.0-beta.2', '1.7.0-beta.2')).toBe(0);
    // Numeric identifiers rank below alphanumeric ones.
    expect(compareVersions('1.7.0-1', '1.7.0-alpha')).toBe(-1);
    // A longer identifier list wins an otherwise equal comparison.
    expect(compareVersions('1.7.0-beta.1.1', '1.7.0-beta.1')).toBe(1);
    expect(compareVersions('1.7.0-alpha', '1.7.0-beta')).toBe(-1);
  });

  it('tolerates a leading v, build metadata, and partial versions', () => {
    expect(compareVersions('v1.7.0', '1.6.0')).toBe(1);
    expect(compareVersions('1.7', '1.7.0')).toBe(0);
    expect(compareVersions('1.7.0+build.5', '1.7.0')).toBe(0);
  });
});

describe('getAvailableCliUpdate', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      OPENSPEC_NO_UPDATE_CHECK: process.env.OPENSPEC_NO_UPDATE_CHECK,
    };
    // The check is disabled under test/CI by design; opt back in to exercise it.
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.OPENSPEC_NO_UPDATE_CHECK;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.restoreAllMocks();
  });

  function mockRegistry(version: string) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ version }), { status: 200 })
    );
  }

  it('reports the published version when the installed CLI is behind', async () => {
    const newer = bumpMajor(OPENSPEC_VERSION);
    mockRegistry(newer);
    await expect(getAvailableCliUpdate()).resolves.toBe(newer);
  });

  it('returns null when the installed CLI is current', async () => {
    mockRegistry(OPENSPEC_VERSION);
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null and never throws when the registry is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ENOTFOUND'));
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null on a non-OK registry response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('returns null when the registry payload has no usable version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ version: 42 }), { status: 200 })
    );
    await expect(getAvailableCliUpdate()).resolves.toBeNull();
  });

  it('requests the registry with a timeout so it cannot hang the command', async () => {
    const fetchSpy = mockRegistry(OPENSPEC_VERSION);
    await getAvailableCliUpdate();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://registry.npmjs.org/@fission-ai/openspec/latest');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('names the global install command and the copy that answered', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
      lines.push(String(line ?? ''));
    });

    displayCliUpdateNote('9.9.9');
    const output = lines.join('\n');

    expect(output).toContain(`v${OPENSPEC_VERSION} → v9.9.9`);
    expect(output).toContain('npm install -g @fission-ai/openspec@latest');
    expect(output).toContain(`Running from: ${getInstallDir()}`);
  });

  it('recognizes a project-local install so it is not told to use -g', () => {
    const cwd = process.cwd();
    expect(isProjectLocalInstall(path.join(cwd, 'node_modules', '@fission-ai', 'openspec'))).toBe(
      true
    );
    expect(isProjectLocalInstall('/usr/local/lib/node_modules/@fission-ai/openspec')).toBe(false);
    expect(isProjectLocalInstall(getInstallDir())).toBe(false);
    expect(isProjectLocalInstall(null)).toBe(false);
  });

  it('skips the check entirely when opted out', async () => {
    const fetchSpy = mockRegistry(bumpMajor(OPENSPEC_VERSION));

    for (const [key, value] of [
      ['OPENSPEC_NO_UPDATE_CHECK', '1'],
      ['OPENSPEC_NO_UPDATE_CHECK', ''],
      ['CI', 'true'],
      ['CI', '1'],
      ['CI', 'TRUE'],
      ['NODE_ENV', 'test'],
    ] as const) {
      process.env[key] = value;
      await expect(getAvailableCliUpdate()).resolves.toBeNull();
      delete process.env[key];
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still runs when CI is set to a disabled value', async () => {
    const newer = bumpMajor(OPENSPEC_VERSION);
    mockRegistry(newer);
    process.env.CI = 'false';
    await expect(getAvailableCliUpdate()).resolves.toBe(newer);
  });
});
