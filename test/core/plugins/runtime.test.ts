import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { delegateToPlugin } from '../../../src/core/plugins/runtime.js';
import type { ResolvedPlugin } from '../../../src/core/plugins/types.js';

/**
 * Build a ResolvedPlugin with a given `bin`, bypassing manifest validation so we
 * can exercise the runtime's defense-in-depth containment check directly — as if
 * a crafted manifest had slipped past validation.
 */
function pluginWithBin(packageRoot: string, bin: string): ResolvedPlugin {
  return {
    id: 'demo-engine',
    namespace: 'demo',
    manifest: {
      manifestVersion: 1,
      id: 'demo-engine',
      namespace: 'demo',
      bin,
      openspecCompat: '>=1.0.0',
    },
    packageRoot,
    source: 'project',
    compatible: true,
    enabled: true,
  };
}

describe('plugins/runtime delegateToPlugin bin containment', () => {
  let tempDir: string;
  let packageRoot: string;
  let sentinel: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
    packageRoot = path.join(tempDir, 'pkg');
    fs.mkdirSync(packageRoot, { recursive: true });
    // A would-be target that lives OUTSIDE the package root. If the runtime ever
    // launched it, it would create this sentinel file.
    sentinel = path.join(tempDir, 'pwned.txt');
    fs.writeFileSync(
      path.join(tempDir, 'outside.js'),
      `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'x');\n`
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('launches a safe in-package bin', () => {
    fs.writeFileSync(
      path.join(packageRoot, 'cli.js'),
      `require('node:fs').writeFileSync(${JSON.stringify(path.join(packageRoot, 'ran.txt'))}, 'x');\n`
    );
    const code = delegateToPlugin(pluginWithBin(packageRoot, 'cli.js'), []);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(packageRoot, 'ran.txt'))).toBe(true);
  });

  it.each([
    ['parent traversal', '../outside.js'],
    ['backslash traversal', '..\\outside.js'],
  ])('refuses a bin that escapes the package (%s) without launching it', (_label, bin) => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = delegateToPlugin(pluginWithBin(packageRoot, bin), []);
    expect(code).toBe(1);
    expect(fs.existsSync(sentinel)).toBe(false);
    expect(err.mock.calls.flat().join(' ')).toMatch(/outside its package/);
  });

  it('refuses an absolute bin without launching it', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const absolute = path.join(tempDir, 'outside.js');
    const code = delegateToPlugin(pluginWithBin(packageRoot, absolute), []);
    expect(code).toBe(1);
    expect(fs.existsSync(sentinel)).toBe(false);
    expect(err.mock.calls.flat().join(' ')).toMatch(/outside its package/);
  });

  it('refuses a package-local symlink whose target escapes the package', () => {
    // `bin` is lexically safe ("cli.js") and lexically inside the package, but the
    // file is a symlink pointing at a script outside the package root.
    const link = path.join(packageRoot, 'cli.js');
    try {
      fs.symlinkSync(path.join(tempDir, 'outside.js'), link);
    } catch {
      // Platforms without symlink permission (rare in CI) can't exercise this.
      return;
    }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = delegateToPlugin(pluginWithBin(packageRoot, 'cli.js'), []);
    expect(code).toBe(1);
    expect(fs.existsSync(sentinel)).toBe(false);
    expect(err.mock.calls.flat().join(' ')).toMatch(/resolves outside its package/);
  });

  it('launches a package-local symlink whose target stays inside the package', () => {
    // A symlink is fine as long as it resolves to a file within the package.
    fs.writeFileSync(
      path.join(packageRoot, 'real-cli.js'),
      `require('node:fs').writeFileSync(${JSON.stringify(path.join(packageRoot, 'ran.txt'))}, 'x');\n`
    );
    const link = path.join(packageRoot, 'cli.js');
    try {
      fs.symlinkSync(path.join(packageRoot, 'real-cli.js'), link);
    } catch {
      return;
    }
    const code = delegateToPlugin(pluginWithBin(packageRoot, 'cli.js'), []);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(packageRoot, 'ran.txt'))).toBe(true);
  });
});
