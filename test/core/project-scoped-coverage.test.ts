import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

import { resolveOpenSpecRoot } from '../../src/core/root-selection.js';
import { doctorStores } from '../../src/core/store/operations.js';
import { assembleReferenceIndex } from '../../src/core/references.js';
import { findProjectRegistryDir } from '../../src/core/store/foundation.js';

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

describe('doctorStores with projectRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('inspects project-scoped stores', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    const result = await doctorStores(undefined, { projectRoot: tmpDir });
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].id).toBe('my-store');
  });

  it('returns empty when no project-scoped registry', async () => {
    const result = await doctorStores(undefined, { projectRoot: tmpDir });
    expect(result.stores).toHaveLength(0);
  });

  it('inspects specific store by id', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    const result = await doctorStores('store-a', { projectRoot: tmpDir });
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].id).toBe('store-a');
  });
});

describe('assembleReferenceIndex with projectRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves references from project-scoped registry', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    // Root is store-a, references store-b (not a self-reference)
    const root = await resolveOpenSpecRoot({
      store: 'store-a',
      startPath: tmpDir,
    });

    const entries = await assembleReferenceIndex({
      references: [{ id: 'store-b', remote: undefined }],
      resolvedRoot: root,
      includeSpecs: false,
      projectRoot: tmpDir,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].store_id).toBe('store-b');
    expect(entries[0].root).toBe(realPath(storeB));
  });

  it('project entry wins over a global entry on ID conflict', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    const globalB = path.join(tmpDir, 'global-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    const root = await resolveOpenSpecRoot({ store: 'store-a', startPath: tmpDir });

    const entries = await assembleReferenceIndex({
      references: [{ id: 'store-b', remote: undefined }],
      resolvedRoot: root,
      includeSpecs: false,
      projectRoot: tmpDir,
      registryEntries: [
        { id: 'store-b', backend: { type: 'git', local_path: globalB } },
      ],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].root).toBe(realPath(storeB));
  });

  it('resolves references through an ancestor registry in the chain', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });
    const nested = path.join(tmpDir, 'apps', 'api');
    fs.mkdirSync(nested, { recursive: true });

    const root = await resolveOpenSpecRoot({ store: 'store-a', startPath: tmpDir });

    const entries = await assembleReferenceIndex({
      references: [{ id: 'store-b', remote: undefined }],
      resolvedRoot: root,
      includeSpecs: false,
      projectRoot: nested,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].root).toBe(realPath(storeB));
  });

  it('keeps project entries resolvable when the global registry is unreadable', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    const root = await resolveOpenSpecRoot({ store: 'store-a', startPath: tmpDir });

    const entries = await assembleReferenceIndex({
      references: [{ id: 'store-b', remote: undefined }],
      resolvedRoot: root,
      includeSpecs: false,
      projectRoot: tmpDir,
      registryEntries: null,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].root).toBe(realPath(storeB));
    expect(entries[0].status).toEqual([]);
  });

  it('reports unreadable global when a reference is in no project registry', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    createStoreRoot(storeA, 'store-a');
    writeProjectRegistry(tmpDir, { 'store-a': { path: 'store-a' } });

    const root = await resolveOpenSpecRoot({ store: 'store-a', startPath: tmpDir });

    const entries = await assembleReferenceIndex({
      references: [{ id: 'store-missing', remote: undefined }],
      resolvedRoot: root,
      includeSpecs: false,
      projectRoot: tmpDir,
      registryEntries: null,
    });

    expect(entries[0].status).toEqual([
      expect.objectContaining({ code: 'reference_registry_unreadable' }),
    ]);
  });
});

describe('resolveFromInspection error paths for project-scoped', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws when store metadata is missing', async () => {
    // Create store with openspec root but NO .openspec-store/store.yaml
    const storeDir = path.join(tmpDir, 'my-store');
    createOpenSpecRoot(storeDir);
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    await expect(
      resolveOpenSpecRoot({ store: 'my-store', startPath: tmpDir })
    ).rejects.toThrow('missing identity metadata');
  });

  it('throws when store metadata id does not match', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'wrong-id');
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    await expect(
      resolveOpenSpecRoot({ store: 'my-store', startPath: tmpDir })
    ).rejects.toThrow('does not match');
  });

  it('throws when store root is unhealthy', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    // Create .openspec-store/store.yaml but NO openspec/ root
    const metaDir = path.join(storeDir, '.openspec-store');
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, 'store.yaml'), 'version: 1\nid: my-store\n');
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    await expect(
      resolveOpenSpecRoot({ store: 'my-store', startPath: tmpDir })
    ).rejects.toThrow('healthy OpenSpec root');
  });
});

describe('store: pointer with merged registry', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves store: pointer through merged registry', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    // Create a config-only repo with store: pointer
    const repoDir = path.join(tmpDir, 'my-repo');
    fs.mkdirSync(path.join(repoDir, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\nstore: my-store\n'
    );

    const root = await resolveOpenSpecRoot({
      startPath: repoDir,
    });

    expect(root.storeId).toBe('my-store');
    expect(root.path).toBe(realPath(storeDir));
    expect(root.source).toBe('project_store');
  });
});

describe('warning messages', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves from global when ID not found in any project-scoped registry', async () => {
    const projectStore = path.join(tmpDir, 'project-store');
    createStoreRoot(projectStore, 'project-store');
    writeProjectRegistry(tmpDir, { 'project-store': { path: 'project-store' } });

    const globalStore = path.join(tmpDir, 'global-store');
    createStoreRoot(globalStore, 'global-store');

    const globalDir = makeTempDir();
    try {
      const globalRegistryPath = path.join(globalDir, 'openspec', 'stores', 'registry.yaml');
      fs.mkdirSync(path.dirname(globalRegistryPath), { recursive: true });
      fs.writeFileSync(globalRegistryPath, `version: 1\nstores:\n  global-store:\n    backend:\n      type: git\n      local_path: ${globalStore}\n`);

      const root = await resolveOpenSpecRoot({
        store: 'global-store',
        startPath: tmpDir,
        globalDataDir: path.join(globalDir, 'openspec'),
      });

      expect(root.source).toBe('store');
    } finally {
      fs.rmSync(globalDir, { recursive: true, force: true });
    }
  });

  it('emits a human-facing warning for a malformed registry', async () => {
    const metaDir = path.join(tmpDir, '.openspec-store');
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, 'registry.yaml'), 'not: valid: yaml: [');

    const globalStore = path.join(tmpDir, 'global-store');
    createStoreRoot(globalStore, 'global-store');

    const globalDir = makeTempDir();
    try {
      const globalRegistryPath = path.join(globalDir, 'openspec', 'stores', 'registry.yaml');
      fs.mkdirSync(path.dirname(globalRegistryPath), { recursive: true });
      fs.writeFileSync(globalRegistryPath, `version: 1\nstores:\n  global-store:\n    backend:\n      type: git\n      local_path: ${globalStore}\n`);

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const root = await resolveOpenSpecRoot({
          store: 'global-store',
          startPath: tmpDir,
          globalDataDir: path.join(globalDir, 'openspec'),
        });

        expect(root.source).toBe('store');
        expect(spy).toHaveBeenCalledWith(
          expect.stringContaining('malformed; continuing search')
        );
      } finally {
        spy.mockRestore();
      }
    } finally {
      fs.rmSync(globalDir, { recursive: true, force: true });
    }
  });
});
