import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getRemoteSchemaCacheDir,
  installRemoteSchemaCache,
  verifyRemoteSchemaCache,
} from '../../../src/core/remote-schema/cache.js';
import { computeBundleIntegrity } from '../../../src/core/remote-schema/bundle.js';

describe('remote schema cache', () => {
  let tempDir: string;
  let dataDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-cache-test-'));
    dataDir = path.join(tempDir, 'data');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('installs a verified bundle in a content-addressed directory', () => {
    const source = path.join(tempDir, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'schema.yaml'), 'name: demo\nversion: 1\n');
    const { integrity } = computeBundleIntegrity(source);

    const installed = installRemoteSchemaCache(source, integrity, dataDir);

    expect(installed).toBe(getRemoteSchemaCacheDir(integrity, dataDir));
    expect(verifyRemoteSchemaCache(integrity, dataDir)).toBe(installed);
    expect(fs.readFileSync(path.join(installed, 'schema.yaml'), 'utf8')).toContain('demo');
  });

  it('rejects cache content that no longer matches the lock digest', () => {
    const source = path.join(tempDir, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'schema.yaml'), 'name: demo\nversion: 1\n');
    const { integrity } = computeBundleIntegrity(source);
    const installed = installRemoteSchemaCache(source, integrity, dataDir);
    fs.appendFileSync(path.join(installed, 'schema.yaml'), '# changed\n');

    expect(() => verifyRemoteSchemaCache(integrity, dataDir)).toThrow(
      /does not match its locked integrity/
    );
  });

  it('does not replace an existing valid cache entry', () => {
    const source = path.join(tempDir, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'schema.yaml'), 'name: demo\nversion: 1\n');
    const { integrity } = computeBundleIntegrity(source);
    const installed = installRemoteSchemaCache(source, integrity, dataDir);
    const preservedTime = new Date('2000-01-01T00:00:00.000Z');
    fs.utimesSync(installed, preservedTime, preservedTime);

    expect(installRemoteSchemaCache(source, integrity, dataDir)).toBe(installed);
    expect(fs.statSync(installed).mtimeMs).toBe(preservedTime.getTime());
  });

  it('atomically replaces a corrupt cache and removes the displaced directory', () => {
    const source = path.join(tempDir, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'schema.yaml'), 'name: demo\nversion: 1\n');
    const { integrity } = computeBundleIntegrity(source);
    const installed = installRemoteSchemaCache(source, integrity, dataDir);
    fs.writeFileSync(path.join(installed, 'schema.yaml'), 'corrupt\n');

    expect(installRemoteSchemaCache(source, integrity, dataDir)).toBe(installed);
    expect(verifyRemoteSchemaCache(integrity, dataDir)).toBe(installed);
    expect(
      fs.readdirSync(path.dirname(installed)).filter((entry) => entry.startsWith('.displaced-'))
    ).toEqual([]);
  });

  it('rejects malformed integrity values before constructing a path', () => {
    expect(() => getRemoteSchemaCacheDir('../escape', dataDir)).toThrow(
      /valid SHA-256 integrity/
    );
  });
});
