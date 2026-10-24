import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

import {
  walkProjectStoreRegistries,
  getStoreRegistryPath,
  STORE_METADATA_DIR_NAME,
  STORE_REGISTRY_FILE_NAME,
} from '../../../src/core/store/foundation.js';
import {
  commitStoreRegistration,
  listRegisteredStores,
  unregisterStoreRegistration,
} from '../../../src/core/store/registry.js';
import { doctorStores, prepareStoreCleanup } from '../../../src/core/store/operations.js';
import { resolveOpenSpecRoot } from '../../../src/core/root-selection.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-'));
}

function realPath(p: string): string {
  return fs.realpathSync(p);
}

function createOpenSpecRoot(dir: string): void {
  fs.mkdirSync(path.join(dir, 'openspec', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'openspec', 'changes', 'archive'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
}

function createStoreRoot(dir: string, id: string): void {
  createOpenSpecRoot(dir);
  const metaDir = path.join(dir, '.openspec-store');
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, 'store.yaml'), `version: 1\nid: ${id}\n`);
}

function writeProjectRegistry(dir: string, stores: Record<string, { path: string }>): void {
  const metaDir = path.join(dir, '.openspec-store');
  fs.mkdirSync(metaDir, { recursive: true });
  let content = 'version: 1\nstores:\n';
  for (const [id, entry] of Object.entries(stores)) {
    content += `  ${id}:\n    path: ${entry.path}\n`;
  }
  fs.writeFileSync(path.join(metaDir, 'registry.yaml'), content);
}

/**
 * Monorepo-like topology used by the nested tests:
 *
 *   monorepo/            (.openspec-store/registry.yaml: parent-store)
 *     apps/api/          (.openspec-store/registry.yaml: child-store)
 *
 * `nestedDir` is the directory commands run from — a level below both registries.
 */
function setupMonorepo(root: string): { nestedDir: string } {
  const parentStore = path.join(root, 'parent-store');
  const childStore = path.join(root, 'apps', 'api', 'child-store');
  createStoreRoot(parentStore, 'parent-store');
  createStoreRoot(childStore, 'child-store');

  writeProjectRegistry(root, { 'parent-store': { path: 'parent-store' } });

  const apiDir = path.join(root, 'apps', 'api');
  writeProjectRegistry(apiDir, { 'child-store': { path: 'child-store' } });

  return { nestedDir: apiDir };
}

describe('walkProjectStoreRegistries', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('collects every registry along the ancestor chain, nearest first', async () => {
    const { nestedDir } = setupMonorepo(tmpDir);

    const levels = await walkProjectStoreRegistries(nestedDir);

    expect(levels).toHaveLength(2);
    expect(realPath(levels[0].registryDir)).toBe(realPath(path.join(tmpDir, 'apps', 'api')));
    expect(Object.keys(levels[0].state.stores)).toEqual(['child-store']);
    expect(realPath(levels[1].registryDir)).toBe(realPath(tmpDir));
    expect(Object.keys(levels[1].state.stores)).toEqual(['parent-store']);
  });

  it('skips a malformed registry with a warning and continues up the chain', async () => {
    const { nestedDir } = setupMonorepo(tmpDir);

    // Add a malformed registry between the nested level and the monorepo root.
    const registryDir = path.join(tmpDir, 'apps', 'mid', STORE_METADATA_DIR_NAME);
    fs.mkdirSync(registryDir, { recursive: true });
    fs.writeFileSync(
      path.join(registryDir, STORE_REGISTRY_FILE_NAME),
      'not: valid: yaml: ['
    );
    const deepDir = path.join(tmpDir, 'apps', 'mid', 'deep');
    fs.mkdirSync(deepDir, { recursive: true });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let levels;
    try {
      levels = await walkProjectStoreRegistries(deepDir);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('is malformed; continuing search in ancestor directories')
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(realPath(path.join(tmpDir, 'apps', 'mid')))
      );
      expect(levels).toHaveLength(1);
      expect(realPath(levels[0].registryDir)).toBe(realPath(tmpDir));
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns an empty array when no registry exists up the chain', async () => {
    const nestedDir = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(nestedDir, { recursive: true });

    const levels = await walkProjectStoreRegistries(nestedDir);

    expect(levels).toEqual([]);
  });

  it('starts the walk from the directory of a file path argument', async () => {
    const { nestedDir } = setupMonorepo(tmpDir);
    const markerFile = path.join(nestedDir, 'marker.txt');
    fs.writeFileSync(markerFile, 'x');

    const levels = await walkProjectStoreRegistries(markerFile);

    expect(levels).toHaveLength(2);
    expect(realPath(levels[0].registryDir)).toBe(realPath(nestedDir));
  });

  it.each([
    ['unsupported version', 'version: 2\nstores:\n  s:\n    path: s\n'],
    ['missing version field', 'stores:\n  s:\n    path: s\n'],
    ['missing stores field', 'version: 1\n'],
    ['entry without a path field', 'version: 1\nstores:\n  s:\n    something: else\n'],
  ])('skips a registry with %s with a warning', async (_label, content) => {
    const registryDir = path.join(tmpDir, 'proj', STORE_METADATA_DIR_NAME);
    fs.mkdirSync(registryDir, { recursive: true });
    fs.writeFileSync(path.join(registryDir, STORE_REGISTRY_FILE_NAME), content);
    const startDir = path.join(tmpDir, 'proj', 'nested');
    fs.mkdirSync(startDir, { recursive: true });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const levels = await walkProjectStoreRegistries(startDir);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('is malformed; continuing search in ancestor directories')
      );
      expect(levels).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('treats an empty stores map as a valid registry without a warning', async () => {
    const registryDir = path.join(tmpDir, 'proj', STORE_METADATA_DIR_NAME);
    fs.mkdirSync(registryDir, { recursive: true });
    fs.writeFileSync(
      path.join(registryDir, STORE_REGISTRY_FILE_NAME),
      'version: 1\nstores: {}\n'
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const levels = await walkProjectStoreRegistries(path.join(tmpDir, 'proj'));

      expect(errorSpy).not.toHaveBeenCalled();
      expect(levels).toHaveLength(1);
      expect(realPath(levels[0].registryDir)).toBe(realPath(path.join(tmpDir, 'proj')));
      expect(Object.keys(levels[0].state.stores)).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles a non-existent start path without error', async () => {
    const missingDir = path.join(tmpDir, 'does-not-exist', 'at-all');

    const levels = await walkProjectStoreRegistries(missingDir);

    expect(levels).toEqual([]);
  });
});

describe('nested project-scoped registry operations', () => {
  let tmpDir: string;
  let nestedDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    nestedDir = setupMonorepo(tmpDir).nestedDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('list shows entries from every registry in the chain with the owning registry directory', async () => {
    const entries = await listRegisteredStores({ projectRoot: nestedDir });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        id: 'child-store',
        registryDir: realPath(nestedDir),
      })
    );
    expect(entries[1]).toEqual(
      expect.objectContaining({
        id: 'parent-store',
        registryDir: realPath(tmpDir),
      })
    );
  });

  it('list returns an empty array when no registry exists in the chain', async () => {
    const emptyRoot = makeTempDir();
    try {
      const entries = await listRegisteredStores({ projectRoot: emptyRoot });
      expect(entries).toEqual([]);
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it('unregister from a nested directory removes the entry from the ancestor registry and reports it', async () => {
    const removed = await unregisterStoreRegistration({
      id: 'parent-store',
      projectRoot: nestedDir,
    });

    expect(removed.id).toBe('parent-store');
    expect(removed.registryDir).toBe(realPath(tmpDir));

    // Ancestor registry no longer contains the entry.
    const parentRegistry = fs.readFileSync(
      getStoreRegistryPath({ projectRoot: tmpDir }),
      'utf-8'
    );
    expect(parentRegistry).not.toContain('parent-store');

    // The nested registry is untouched.
    const nestedRegistry = fs.readFileSync(
      getStoreRegistryPath({ projectRoot: nestedDir }),
      'utf-8'
    );
    expect(nestedRegistry).toContain('child-store');
  });

  it('unregister removes from the nearest registry containing the id (nearest wins)', async () => {
    // Same id registered at both levels, each binding a store whose metadata
    // id matches the registry id.
    createStoreRoot(path.join(tmpDir, 'shared-store'), 'shared-id');
    createStoreRoot(path.join(nestedDir, 'shared-store'), 'shared-id');
    writeProjectRegistry(tmpDir, { 'shared-id': { path: 'shared-store' } });
    writeProjectRegistry(nestedDir, { 'shared-id': { path: 'shared-store' } });

    const removed = await unregisterStoreRegistration({
      id: 'shared-id',
      projectRoot: nestedDir,
    });

    expect(removed.registryDir).toBe(realPath(nestedDir));

    const nestedRegistry = fs.readFileSync(
      getStoreRegistryPath({ projectRoot: nestedDir }),
      'utf-8'
    );
    expect(nestedRegistry).not.toContain('shared-id');

    const parentRegistry = fs.readFileSync(
      getStoreRegistryPath({ projectRoot: tmpDir }),
      'utf-8'
    );
    expect(parentRegistry).toContain('shared-id');
  });

  it('unregister throws when the id is in no registry of the chain', async () => {
    await expect(
      unregisterStoreRegistration({ id: 'unknown', projectRoot: nestedDir })
    ).rejects.toThrow('Unknown store');
  });

  it('doctor from a nested directory inspects the whole chain', async () => {
    const result = await doctorStores(undefined, { projectRoot: nestedDir });

    expect(result.stores).toHaveLength(2);
    const ids = result.stores.map((store) => store.id).sort();
    expect(ids).toEqual(['child-store', 'parent-store']);
  });

  it('doctor by id resolves a store from an ancestor registry', async () => {
    const result = await doctorStores('parent-store', { projectRoot: nestedDir });

    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].id).toBe('parent-store');
    expect(realPath(result.stores[0].root)).toBe(realPath(path.join(tmpDir, 'parent-store')));
  });

  it('doctor reports a fix mentioning --scope project when the id is unknown', async () => {
    await expect(
      doctorStores('no-such-store', { projectRoot: nestedDir })
    ).rejects.toMatchObject({
      diagnostic: {
        code: 'store_not_found',
        fix: expect.stringContaining('--scope project'),
      },
    });
  });

  it('prepareStoreCleanup resolves a store from an ancestor registry', async () => {
    const prepared = await prepareStoreCleanup({ id: 'parent-store', projectRoot: nestedDir });

    expect(prepared.id).toBe('parent-store');
    expect(realPath(prepared.root)).toBe(realPath(path.join(tmpDir, 'parent-store')));
  });

  it('refuses to unregister when the registration changed since it was prepared', async () => {
    await expect(
      unregisterStoreRegistration({
        id: 'parent-store',
        projectRoot: nestedDir,
        expectedBackend: { type: 'git', local_path: path.join(tmpDir, 'elsewhere') },
      })
    ).rejects.toMatchObject({ diagnostic: { code: 'store_registry_changed' } });
  });
});

describe('regression: register writes at the level where it runs', () => {
  let tmpDir: string;
  let nestedDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    nestedDir = setupMonorepo(tmpDir).nestedDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('register --scope project writes a new registry at the current level, leaving ancestors untouched', async () => {
    const storeDir = path.join(nestedDir, 'local-store');
    createStoreRoot(storeDir, 'local-store');

    const result = await commitStoreRegistration({
      id: 'local-store',
      backend: { type: 'git', local_path: storeDir },
      writeMetadataIfMissing: false,
      projectRoot: nestedDir,
    });

    expect(result.registryUpdated).toBe(true);

    const nestedRegistry = fs.readFileSync(
      getStoreRegistryPath({ projectRoot: nestedDir }),
      'utf-8'
    );
    expect(nestedRegistry).toContain('local-store');
    expect(nestedRegistry).toContain('child-store');

    const parentRegistry = fs.readFileSync(
      getStoreRegistryPath({ projectRoot: tmpDir }),
      'utf-8'
    );
    expect(parentRegistry).not.toContain('local-store');
    expect(parentRegistry).toContain('parent-store');
  });
});

describe('regression: store resolution still walks the chain (D4 unchanged)', () => {
  let tmpDir: string;
  let nestedDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    nestedDir = setupMonorepo(tmpDir).nestedDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves a store registered in an ancestor registry from a nested directory', async () => {
    const root = await resolveOpenSpecRoot({
      store: 'parent-store',
      startPath: nestedDir,
    });

    expect(root.source).toBe('project_store');
    expect(root.storeId).toBe('parent-store');
    expect(realPath(root.path)).toBe(realPath(path.join(tmpDir, 'parent-store')));
  });

  it('picks the nearest registry when the same id exists on several levels', async () => {
    createStoreRoot(path.join(tmpDir, 'shared-store'), 'shared-id');
    createStoreRoot(path.join(nestedDir, 'shared-store'), 'shared-id');
    writeProjectRegistry(tmpDir, { 'shared-id': { path: 'shared-store' } });
    writeProjectRegistry(nestedDir, { 'shared-id': { path: 'shared-store' } });

    const root = await resolveOpenSpecRoot({
      store: 'shared-id',
      startPath: nestedDir,
    });

    expect(root.storeId).toBe('shared-id');
    expect(realPath(root.path)).toBe(realPath(path.join(nestedDir, 'shared-store')));
  });
});
