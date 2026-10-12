import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

import { resolveOpenSpecRoot } from '../../src/core/root-selection.js';

function realPath(p: string): string {
  return fs.realpathSync(p);
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-'));
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
  fs.writeFileSync(
    path.join(metaDir, 'store.yaml'),
    `version: 1\nid: ${id}\n`
  );
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

describe('resolveOpenSpecRoot with project-scoped registry', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves a store from project-scoped registry via --store', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');

    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    const root = await resolveOpenSpecRoot({
      store: 'my-store',
      startPath: tmpDir,
    });

    expect(root.source).toBe('project_store');
    expect(root.storeId).toBe('my-store');
    expect(root.path).toBe(realPath(storeDir));
  });

  it('resolves a store from project-scoped registry from a subdirectory', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');

    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    const subDir = path.join(tmpDir, 'sub', 'deep');
    fs.mkdirSync(subDir, { recursive: true });

    const root = await resolveOpenSpecRoot({
      store: 'my-store',
      startPath: subDir,
    });

    expect(root.source).toBe('project_store');
    expect(root.storeId).toBe('my-store');
  });

  it('resolves a store with a relative parent path', async () => {
    const projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    const storeDir = path.join(tmpDir, 'store');
    createStoreRoot(storeDir, 'external-store');

    writeProjectRegistry(projectDir, { 'external-store': { path: '../store' } });

    const root = await resolveOpenSpecRoot({
      store: 'external-store',
      startPath: projectDir,
    });

    expect(root.source).toBe('project_store');
    expect(root.path).toBe(realPath(storeDir));
  });

  it('falls back to global registry when store ID not in project-scoped', async () => {
    const storeDir = path.join(tmpDir, 'project-store');
    createStoreRoot(storeDir, 'project-store');
    writeProjectRegistry(tmpDir, { 'project-store': { path: 'project-store' } });

    await expect(
      resolveOpenSpecRoot({
        store: 'unknown-store',
        startPath: tmpDir,
      })
    ).rejects.toThrow();
  });

  it('project-scoped registry not found falls back to normal resolution', async () => {
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir, { recursive: true });

    await expect(
      resolveOpenSpecRoot({
        store: 'any-store',
        startPath: subDir,
        allowImplicitRoot: false,
      })
    ).rejects.toThrow();
  });

  it('multiple stores in project-scoped registry', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');

    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    const rootA = await resolveOpenSpecRoot({
      store: 'store-a',
      startPath: tmpDir,
    });
    expect(rootA.source).toBe('project_store');
    expect(rootA.path).toBe(realPath(storeA));

    const rootB = await resolveOpenSpecRoot({
      store: 'store-b',
      startPath: tmpDir,
    });
    expect(rootB.source).toBe('project_store');
    expect(rootB.path).toBe(realPath(storeB));
  });

  it('multiple clones of the same repository resolve independently', async () => {
    // Clone A
    const cloneA = path.join(tmpDir, 'clone-a');
    fs.mkdirSync(cloneA, { recursive: true });
    const storeA = path.join(cloneA, 'my-store');
    createStoreRoot(storeA, 'my-store');
    writeProjectRegistry(cloneA, { 'my-store': { path: 'my-store' } });

    // Clone B
    const cloneB = path.join(tmpDir, 'clone-b');
    fs.mkdirSync(cloneB, { recursive: true });
    const storeB = path.join(cloneB, 'my-store');
    createStoreRoot(storeB, 'my-store');
    writeProjectRegistry(cloneB, { 'my-store': { path: 'my-store' } });

    // Each clone resolves to its own store
    const rootA = await resolveOpenSpecRoot({
      store: 'my-store',
      startPath: cloneA,
    });
    expect(rootA.path).toBe(realPath(storeA));

    const rootB = await resolveOpenSpecRoot({
      store: 'my-store',
      startPath: cloneB,
    });
    expect(rootB.path).toBe(realPath(storeB));

    // No conflict — different paths
    expect(rootA.path).not.toBe(rootB.path);
  });

  it('multiple clones resolve independently even if the global registry contains the same store ID', async () => {
    // Clone A and clone B each bind my-store to their own copy.
    const cloneA = path.join(tmpDir, 'clone-a');
    const cloneB = path.join(tmpDir, 'clone-b');
    for (const clone of [cloneA, cloneB]) {
      fs.mkdirSync(clone, { recursive: true });
      createStoreRoot(path.join(clone, 'my-store'), 'my-store');
      writeProjectRegistry(clone, { 'my-store': { path: 'my-store' } });
    }

    // The global registry also registers my-store, at a different path.
    const globalStore = path.join(tmpDir, 'global-store');
    createStoreRoot(globalStore, 'my-store');
    const globalDir = path.join(tmpDir, 'global-data');
    const globalRegistryPath = path.join(globalDir, 'openspec', 'stores', 'registry.yaml');
    fs.mkdirSync(path.dirname(globalRegistryPath), { recursive: true });
    fs.writeFileSync(
      globalRegistryPath,
      `version: 1\nstores:\n  my-store:\n    backend:\n      type: git\n      local_path: ${globalStore}\n`
    );

    const rootA = await resolveOpenSpecRoot({
      store: 'my-store',
      startPath: cloneA,
      globalDataDir: globalDir,
    });
    const rootB = await resolveOpenSpecRoot({
      store: 'my-store',
      startPath: cloneB,
      globalDataDir: globalDir,
    });

    expect(rootA.path).toBe(realPath(path.join(cloneA, 'my-store')));
    expect(rootB.path).toBe(realPath(path.join(cloneB, 'my-store')));
    expect(rootA.path).not.toBe(globalStore);
    expect(rootB.path).not.toBe(globalStore);
  });

  it('resolves store ID from ancestor project-scoped registry', async () => {
    // meta/ has a registry with shared-store
    const metaDir = path.join(tmpDir, 'meta');
    const metaStore = path.join(metaDir, 'shared-store');
    fs.mkdirSync(metaStore, { recursive: true });
    createStoreRoot(metaStore, 'shared-store');
    writeProjectRegistry(metaDir, { 'shared-store': { path: 'shared-store' } });

    // meta/plugin-a/ has its own registry with a different store, but not shared-store
    const pluginDir = path.join(metaDir, 'plugin-a');
    const pluginStore = path.join(pluginDir, 'plugin-store');
    fs.mkdirSync(pluginStore, { recursive: true });
    createStoreRoot(pluginStore, 'plugin-store');
    writeProjectRegistry(pluginDir, { 'plugin-store': { path: 'plugin-store' } });

    // From plugin-a/, shared-store should resolve from meta/ (ancestor)
    const root = await resolveOpenSpecRoot({
      store: 'shared-store',
      startPath: pluginDir,
    });
    expect(root.source).toBe('project_store');
    expect(root.path).toBe(realPath(metaStore));
  });

  it('nearest project-scoped registry wins on ID conflict', async () => {
    // meta/ has shared-store at ./shared-store
    const metaDir = path.join(tmpDir, 'meta');
    const metaStore = path.join(metaDir, 'shared-store');
    fs.mkdirSync(metaStore, { recursive: true });
    createStoreRoot(metaStore, 'shared-store');
    writeProjectRegistry(metaDir, { 'shared-store': { path: 'shared-store' } });

    // meta/plugin-a/ has shared-store at ./local-store (different path)
    const pluginDir = path.join(metaDir, 'plugin-a');
    const pluginStore = path.join(pluginDir, 'local-store');
    fs.mkdirSync(pluginStore, { recursive: true });
    createStoreRoot(pluginStore, 'shared-store');
    writeProjectRegistry(pluginDir, { 'shared-store': { path: 'local-store' } });

    // From plugin-a/, nearest wins — plugin-a's local-store, not meta's shared-store
    const root = await resolveOpenSpecRoot({
      store: 'shared-store',
      startPath: pluginDir,
    });
    expect(root.source).toBe('project_store');
    expect(root.path).toBe(realPath(pluginStore));
  });

  it('default-root discovery skips a malformed nearest registry and uses an ancestor store', async () => {
    const ancestor = path.join(tmpDir, 'workspace');
    fs.mkdirSync(ancestor, { recursive: true });
    const store = path.join(ancestor, 'platform-specs');
    createStoreRoot(store, 'platform-specs');
    writeProjectRegistry(ancestor, { 'platform-specs': { path: 'platform-specs' } });

    // The cwd project carries a malformed registry — the walk must skip it.
    const projectDir = path.join(ancestor, 'project-a');
    const metaDir = path.join(projectDir, '.openspec-store');
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, 'registry.yaml'), 'not: valid: yaml: [');

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const root = await resolveOpenSpecRoot({ startPath: projectDir });

      expect(root.source).toBe('project_store');
      expect(root.path).toBe(realPath(store));
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('is malformed; continuing search in ancestor directories')
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('default-root discovery skips an empty nearest registry and uses an ancestor store', async () => {
    const ancestor = path.join(tmpDir, 'workspace');
    fs.mkdirSync(ancestor, { recursive: true });
    const store = path.join(ancestor, 'platform-specs');
    createStoreRoot(store, 'platform-specs');
    writeProjectRegistry(ancestor, { 'platform-specs': { path: 'platform-specs' } });

    const projectDir = path.join(ancestor, 'project-a');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.openspec-store'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, '.openspec-store', 'registry.yaml'),
      'version: 1\nstores: {}\n'
    );

    const root = await resolveOpenSpecRoot({ startPath: projectDir });

    expect(root.source).toBe('project_store');
    expect(root.path).toBe(realPath(store));
  });

  it('default-root discovery reports an error when the first store entry is unusable', async () => {
    // Discovery takes the first entry in document order. When that entry's
    // folder does not exist, discovery reports a store_root_missing error
    // rather than skipping to the next entry.
    const projectDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(projectDir, { recursive: true });
    const store = path.join(projectDir, 'platform-specs');
    createStoreRoot(store, 'platform-specs');
    writeProjectRegistry(projectDir, {
      'gone-store': { path: 'gone-store' },
      'platform-specs': { path: 'platform-specs' },
    });

    await expect(
      resolveOpenSpecRoot({ startPath: projectDir })
    ).rejects.toMatchObject({ diagnostic: { code: 'store_root_missing' } });
  });

  it('reports an error naming both registries when the id is nowhere', async () => {
    const store = path.join(tmpDir, 'store-a');
    createStoreRoot(store, 'store-a');
    writeProjectRegistry(tmpDir, { 'store-a': { path: 'store-a' } });
    const emptyGlobalDataDir = path.join(tmpDir, 'empty-global', 'openspec');

    await expect(
      resolveOpenSpecRoot({
        store: 'nope',
        startPath: tmpDir,
        globalDataDir: emptyGlobalDataDir,
      })
    ).rejects.toThrow(/No project-scoped or global registry registers it/);
  });

  it('uses the global registry when no project-scoped registry exists anywhere', async () => {
    // No .openspec-store/registry.yaml in tmpDir or any ancestor — pure backward compat.
    const globalStore = path.join(tmpDir, 'global-store');
    createStoreRoot(globalStore, 'global-store');
    const globalDir = path.join(tmpDir, 'global-data');
    const globalRegistryPath = path.join(globalDir, 'stores', 'registry.yaml');
    fs.mkdirSync(path.dirname(globalRegistryPath), { recursive: true });
    fs.writeFileSync(
      globalRegistryPath,
      `version: 1\nstores:\n  global-store:\n    backend:\n      type: git\n      local_path: ${globalStore}\n`
    );

    const root = await resolveOpenSpecRoot({
      store: 'global-store',
      startPath: tmpDir,
      globalDataDir: globalDir,
    });

    expect(root.source).toBe('store');
    expect(root.path).toBe(realPath(globalStore));
  });

  it('default-root discovery respects document order, not alphabetical order', async () => {
    // Both stores are usable; zebra-specs is listed first in the YAML.
    // Default root must be zebra-specs (document order), not alpha-specs (alphabetical).
    const zebraStore = path.join(tmpDir, 'zebra-specs');
    const alphaStore = path.join(tmpDir, 'alpha-specs');
    createStoreRoot(zebraStore, 'zebra-specs');
    createStoreRoot(alphaStore, 'alpha-specs');
    // writeProjectRegistry writes stores in object-key order; zebra first.
    const metaDir = path.join(tmpDir, '.openspec-store');
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(
      path.join(metaDir, 'registry.yaml'),
      'version: 1\nstores:\n  zebra-specs:\n    path: zebra-specs\n  alpha-specs:\n    path: alpha-specs\n'
    );

    const root = await resolveOpenSpecRoot({ startPath: tmpDir });

    expect(root.source).toBe('project_store');
    expect(root.storeId).toBe('zebra-specs');
    expect(root.path).toBe(realPath(zebraStore));
  });

  it('default-root discovery reports an error when the first store entry is unhealthy (not skipped)', async () => {
    // Discovery takes the first entry in document order. When that entry's
    // folder exists but is not a healthy OpenSpec root, discovery reports an
    // unhealthy_store_root error rather than skipping to the next entry.
    const projectDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(projectDir, { recursive: true });

    // First entry: a folder that exists but is unhealthy (no openspec/ shape).
    const unhealthyStore = path.join(projectDir, 'unhealthy-store');
    fs.mkdirSync(unhealthyStore, { recursive: true });
    const metaDir = path.join(unhealthyStore, '.openspec-store');
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, 'store.yaml'), 'version: 1\nid: unhealthy-store\n');

    // Second entry: a healthy store that must NOT be reached.
    const healthyStore = path.join(projectDir, 'platform-specs');
    createStoreRoot(healthyStore, 'platform-specs');

    writeProjectRegistry(projectDir, {
      'unhealthy-store': { path: 'unhealthy-store' },
      'platform-specs': { path: 'platform-specs' },
    });

    await expect(
      resolveOpenSpecRoot({ startPath: projectDir })
    ).rejects.toMatchObject({ diagnostic: { code: 'unhealthy_store_root' } });
  });

  it('default-root discovery reports store_root_missing when the first entry folder is missing', async () => {
    // The first entry points at a folder that does not exist. Discovery must
    // report store_root_missing rather than skipping to the next entry.
    const projectDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(projectDir, { recursive: true });
    const store = path.join(projectDir, 'platform-specs');
    createStoreRoot(store, 'platform-specs');
    writeProjectRegistry(projectDir, {
      'gone-store': { path: 'gone-store' },
      'platform-specs': { path: 'platform-specs' },
    });

    await expect(
      resolveOpenSpecRoot({ startPath: projectDir })
    ).rejects.toMatchObject({ diagnostic: { code: 'store_root_missing' } });
  });

  it('--store with a missing folder reports store_root_missing with no fallback', async () => {
    // An explicit --store pointing at a registry entry whose folder is missing
    // reports store_root_missing. There is no fallback to other entries or to
    // the global registry.
    const projectDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(projectDir, { recursive: true });
    writeProjectRegistry(projectDir, { 'gone-store': { path: 'gone-store' } });

    await expect(
      resolveOpenSpecRoot({ store: 'gone-store', startPath: projectDir })
    ).rejects.toMatchObject({ diagnostic: { code: 'store_root_missing' } });
  });

  it('a store: pointer to a missing folder reports store_root_missing', async () => {
    // A config.yaml `store:` pointer that names a project-scoped registry entry
    // whose folder is missing reports store_root_missing (no fallback).
    const projectDir = path.join(tmpDir, 'workspace');
    fs.mkdirSync(projectDir, { recursive: true });
    writeProjectRegistry(projectDir, { 'gone-store': { path: 'gone-store' } });

    // A config-only openspec/ directory carrying a store: pointer.
    const openspecDir = path.join(projectDir, 'openspec');
    fs.mkdirSync(openspecDir, { recursive: true });
    fs.writeFileSync(path.join(openspecDir, 'config.yaml'), 'store: gone-store\n');

    await expect(
      resolveOpenSpecRoot({ startPath: projectDir })
    ).rejects.toMatchObject({ diagnostic: { code: 'store_root_missing' } });
  });
});
