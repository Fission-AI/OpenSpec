import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateManifest,
  loadManifestFromRoot,
  packageDeclaresPlugin,
  RESERVED_NAMESPACES,
} from '../../../src/core/plugins/manifest.js';

const validManifest = {
  manifestVersion: 1,
  id: 'demo-engine',
  namespace: 'demo',
  bin: 'cli.js',
  openspecCompat: '>=1.0.0',
};

describe('plugins/manifest validateManifest', () => {
  it('accepts a minimal valid manifest', () => {
    const result = validateManifest(validManifest);
    expect(result.valid).toBe(true);
    expect(result.manifest?.namespace).toBe('demo');
  });

  it('rejects a manifest missing an executable', () => {
    const { bin, ...noBin } = validManifest;
    const result = validateManifest(noBin);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/executable|bin/i);
  });

  it('rejects a missing required field', () => {
    const { openspecCompat, ...missing } = validManifest;
    const result = validateManifest(missing);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/openspecCompat/);
  });

  it('rejects a reserved namespace', () => {
    const result = validateManifest({ ...validManifest, namespace: 'init' });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/reserved/);
  });

  it('rejects an invalid namespace format', () => {
    const result = validateManifest({ ...validManifest, namespace: 'Demo Engine' });
    expect(result.valid).toBe(false);
  });

  it('rejects a manifestVersion newer than supported', () => {
    const result = validateManifest({ ...validManifest, manifestVersion: 99 });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/newer than supported/);
  });

  it('preserves unknown fields (forward compatibility)', () => {
    const result = validateManifest({ ...validManifest, futureField: { a: 1 } });
    expect(result.valid).toBe(true);
    expect((result.manifest as Record<string, unknown>).futureField).toEqual({ a: 1 });
  });

  it('keeps a stable reserved namespace set', () => {
    expect(RESERVED_NAMESPACES).toContain('init');
    expect(RESERVED_NAMESPACES).toContain('spec');
    expect(RESERVED_NAMESPACES).toContain('plugin');
  });
});

describe('plugins/manifest loadManifestFromRoot', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-manifest-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads from the package.json "openspec" key', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'demo-engine', version: '0.4.0', openspec: validManifest })
    );
    const loaded = loadManifestFromRoot(tempDir);
    expect(loaded?.origin).toBe('package.json');
    expect(loaded?.version).toBe('0.4.0');
    expect(loaded?.manifest.id).toBe('demo-engine');
  });

  it('falls back to openspec.plugin.json', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }));
    fs.writeFileSync(path.join(tempDir, 'openspec.plugin.json'), JSON.stringify(validManifest));
    const loaded = loadManifestFromRoot(tempDir);
    expect(loaded?.origin).toBe('manifest-file');
  });

  it('prefers the package.json key over the standalone file', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ openspec: { ...validManifest, namespace: 'frompkg' } })
    );
    fs.writeFileSync(
      path.join(tempDir, 'openspec.plugin.json'),
      JSON.stringify({ ...validManifest, namespace: 'fromfile' })
    );
    expect(loadManifestFromRoot(tempDir)?.manifest.namespace).toBe('frompkg');
  });

  it('returns null when no manifest is present', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'plain' }));
    expect(loadManifestFromRoot(tempDir)).toBeNull();
  });

  it('throws an actionable error on an invalid manifest', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ openspec: { manifestVersion: 1, id: 'x' } })
    );
    expect(() => loadManifestFromRoot(tempDir)).toThrow(/Invalid OpenSpec plugin manifest/);
  });
});

describe('plugins/manifest packageDeclaresPlugin', () => {
  it('detects the manifest key', () => {
    expect(packageDeclaresPlugin({ openspec: {} })).toBe(true);
    expect(packageDeclaresPlugin({ name: 'x' })).toBe(false);
    expect(packageDeclaresPlugin(null)).toBe(false);
  });
});
