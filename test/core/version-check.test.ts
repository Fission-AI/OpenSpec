import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { compareVersions, getAvailableCliUpdate } from '../../src/core/version-check.js';

const require = (await import('module')).createRequire(import.meta.url);
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
    expect(compareVersions('1.7.0-beta.2', '1.7.0-beta.1')).toBe(1);
  });

  it('tolerates a leading v and partial versions', () => {
    expect(compareVersions('v1.7.0', '1.6.0')).toBe(1);
    expect(compareVersions('1.7', '1.7.0')).toBe(0);
  });
});

describe('getAvailableCliUpdate', () => {
  let tmpDir: string;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-version-check-'));
    originalEnv = {
      TMPDIR: process.env.TMPDIR,
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      OPENSPEC_NO_UPDATE_CHECK: process.env.OPENSPEC_NO_UPDATE_CHECK,
    };
    process.env.TMPDIR = tmpDir;
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
    fs.rmSync(tmpDir, { recursive: true, force: true });
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

  it('caches the result so repeat runs skip the network', async () => {
    const newer = bumpMajor(OPENSPEC_VERSION);
    const fetchSpy = mockRegistry(newer);

    await getAvailableCliUpdate();
    await getAvailableCliUpdate();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('skips the check entirely when opted out', async () => {
    const fetchSpy = mockRegistry(bumpMajor(OPENSPEC_VERSION));

    process.env.OPENSPEC_NO_UPDATE_CHECK = '1';
    await expect(getAvailableCliUpdate()).resolves.toBeNull();

    delete process.env.OPENSPEC_NO_UPDATE_CHECK;
    process.env.CI = 'true';
    await expect(getAvailableCliUpdate()).resolves.toBeNull();

    delete process.env.CI;
    process.env.NODE_ENV = 'test';
    await expect(getAvailableCliUpdate()).resolves.toBeNull();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
