import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadRegistry,
  searchRegistry,
  findRegistryEntry,
  getPackageRegistryPath,
  RegistryError,
} from '../../../src/core/plugins/registry.js';

describe('plugins/registry built-in index', () => {
  it('ships a parseable registry with the OpenLore listing', () => {
    const entries = loadRegistry(getPackageRegistryPath());
    const openlore = entries.find((e) => e.id === 'openlore');
    expect(openlore).toBeDefined();
    expect(openlore?.npm).toBe('openlore');
    expect(openlore?.namespace).toBe('lore');
    expect(openlore?.openspecCompat).toBeTruthy();
  });

  it('finds entries by id or npm name', () => {
    const entries = loadRegistry(getPackageRegistryPath());
    expect(findRegistryEntry('openlore', entries)?.id).toBe('openlore');
    expect(findRegistryEntry('lore', entries)).toBeUndefined();
  });

  it('filters with a query', () => {
    const entries = loadRegistry(getPackageRegistryPath());
    // OpenLore's summary mentions "Reverse-engineer".
    expect(searchRegistry('reverse', entries).map((e) => e.id)).toContain('openlore');
    expect(searchRegistry('openlore', entries).length).toBe(1);
    expect(searchRegistry('no-such-plugin-xyz', entries).length).toBe(0);
  });
});

describe('plugins/registry version handling', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-registry-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('rejects an unsupported registry version', () => {
    const p = path.join(tempDir, 'registry.json');
    fs.writeFileSync(p, JSON.stringify({ registryVersion: 99, plugins: [] }));
    expect(() => loadRegistry(p)).toThrow(RegistryError);
    expect(() => loadRegistry(p)).toThrow(/newer than supported/);
  });

  it('rejects a malformed registry', () => {
    const p = path.join(tempDir, 'registry.json');
    fs.writeFileSync(p, '{ not json');
    expect(() => loadRegistry(p)).toThrow(RegistryError);
  });

  it('throws when the registry file is missing', () => {
    expect(() => loadRegistry(path.join(tempDir, 'nope.json'))).toThrow(RegistryError);
  });
});
