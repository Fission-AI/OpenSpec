import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

import {
  findProjectRegistryDir,
  getStoreRegistryPath,
  parseProjectStoreRegistryState,
  listProjectStoreRegistryEntries,
  STORE_METADATA_DIR_NAME,
  STORE_REGISTRY_FILE_NAME,
} from '../../../src/core/store/foundation.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-'));
}

function realPath(p: string): string {
  return fs.realpathSync(p);
}

function writeRegistry(dir: string, content: string): void {
  const registryDir = path.join(dir, STORE_METADATA_DIR_NAME);
  fs.mkdirSync(registryDir, { recursive: true });
  fs.writeFileSync(path.join(registryDir, STORE_REGISTRY_FILE_NAME), content);
}

describe('findProjectRegistryDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the directory containing .openspec-store/registry.yaml', () => {
    writeRegistry(tmpDir, 'version: 1\nstores: {}\n');
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRegistryDir(subDir);
    expect(result).toBe(realPath(tmpDir));
  });

  it('returns null when no registry file exists', () => {
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRegistryDir(subDir);
    expect(result).toBeNull();
  });

  it('finds the nearest registry, not a farther one', () => {
    writeRegistry(tmpDir, 'version: 1\nstores: {}\n');
    const midDir = path.join(tmpDir, 'mid');
    fs.mkdirSync(midDir, { recursive: true });
    writeRegistry(midDir, 'version: 1\nstores: {}\n');
    const subDir = path.join(midDir, 'sub');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRegistryDir(subDir);
    expect(result).toBe(realPath(midDir));
  });
});

describe('getStoreRegistryPath with projectRoot', () => {
  it('resolves to <projectRoot>/.openspec-store/registry.yaml', () => {
    const result = getStoreRegistryPath({ projectRoot: '/project' });

    expect(result).toBe(path.join('/project', '.openspec-store', 'registry.yaml'));
  });

  it('uses global path when projectRoot is not set', () => {
    const result = getStoreRegistryPath({});
    // Should not contain .openspec-store in the project sense
    expect(result).toContain('stores');
    expect(result).toContain('registry.yaml');
  });

  it('resolves path correctly on all platforms using path.join', () => {
    // path.join handles platform separators automatically.
    // On Windows this produces backslashes; on POSIX forward slashes.
    // The test verifies the function uses path.join, not string concatenation.
    const projectRoot = path.resolve('/project');
    const result = getStoreRegistryPath({ projectRoot });
    const expected = path.join(projectRoot, STORE_METADATA_DIR_NAME, STORE_REGISTRY_FILE_NAME);
    expect(result).toBe(expected);
    // Verify no hardcoded separators
    expect(result).not.toContain('\\.openspec-store\\');
  });
});

describe('parseProjectStoreRegistryState', () => {
  it('parses a valid registry with relative paths', () => {
    const content = `
version: 1
stores:
  platform-specs:
    path: platform-specs
  design-specs:
    path: ../design-specs
`;
    const result = parseProjectStoreRegistryState(content);
    expect(result.version).toBe(1);
    expect(result.stores['platform-specs'].path).toBe('platform-specs');
    expect(result.stores['design-specs'].path).toBe('../design-specs');
  });

  it('throws on invalid YAML', () => {
    expect(() => parseProjectStoreRegistryState('not: valid: yaml: [')).toThrow();
  });

  it('throws on unsupported version', () => {
    expect(() => parseProjectStoreRegistryState('version: 2\nstores: {}')).toThrow();
  });

  it('throws on missing stores field', () => {
    expect(() => parseProjectStoreRegistryState('version: 1')).toThrow();
  });

  it('throws on missing version field', () => {
    expect(() => parseProjectStoreRegistryState('stores:\n  specs:\n    path: specs\n')).toThrow();
  });
});

describe('listProjectStoreRegistryEntries', () => {
  it('resolves relative paths against the registry directory in document order', () => {
    const state = parseProjectStoreRegistryState(`
version: 1
stores:
  specs:
    path: specs
  parent-specs:
    path: ../specs
`);
    const entries = listProjectStoreRegistryEntries(state, '/project');
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('specs');
    expect(entries[0].storeRoot).toBe(path.resolve('/project', 'specs'));
    expect(entries[1].id).toBe('parent-specs');
    expect(entries[1].storeRoot).toBe(path.resolve('/project', '../specs'));
  });

  it('preserves document order, not alphabetical order by id', () => {
    const state = parseProjectStoreRegistryState(`
version: 1
stores:
  zebra-specs:
    path: zebra
  alpha-specs:
    path: alpha
`);
    const entries = listProjectStoreRegistryEntries(state, '/project');
    expect(entries[0].id).toBe('zebra-specs');
    expect(entries[1].id).toBe('alpha-specs');
  });
});
