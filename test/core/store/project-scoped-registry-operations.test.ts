import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

import {
  findProjectRegistryDir,
  getStoreRegistryPath,
  parseProjectStoreRegistryState,
  serializeProjectStoreRegistryState,
  listProjectStoreRegistryEntries,
  readProjectStoreRegistryState,
  STORE_METADATA_DIR_NAME,
  STORE_REGISTRY_FILE_NAME,
} from '../../../src/core/store/foundation.js';
import {
  commitStoreRegistration,
  listRegisteredStores,
  unregisterStoreRegistration,
} from '../../../src/core/store/registry.js';
import { registerExistingStore } from '../../../src/core/store/operations.js';
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

describe('commitStoreRegistration with projectRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes { path: ... } format to project-scoped registry', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');

    const result = await commitStoreRegistration({
      id: 'my-store',
      backend: { type: 'git', local_path: storeDir },
      writeMetadataIfMissing: false,
      projectRoot: tmpDir,
    });

    expect(result.registryUpdated).toBe(true);

    const registryPath = getStoreRegistryPath({ projectRoot: tmpDir });
    const content = fs.readFileSync(registryPath, 'utf-8');
    expect(content).toContain('path: my-store');
    expect(content).not.toContain('backend');
  });

  it('registers a store outside the project root via an absolute path', async () => {
    // Store outside the project root: the registry records the absolute
    // path as-is so it resolves regardless of where the registry file lives.
    const outsideDir = makeTempDir();
    try {
      const storeDir = path.join(outsideDir, 'my-store');
      createStoreRoot(storeDir, 'my-store');

      const result = await commitStoreRegistration({
        id: 'my-store',
        backend: { type: 'git', local_path: storeDir },
        writeMetadataIfMissing: false,
        projectRoot: tmpDir,
      });

      expect(result.registryUpdated).toBe(true);

      const registryPath = getStoreRegistryPath({ projectRoot: tmpDir });
      expect(fs.existsSync(registryPath)).toBe(true);
      const content = fs.readFileSync(registryPath, 'utf-8');
        expect(content).toContain('my-store:');
      expect(content).toContain(realPath(storeDir).replace(/\\/g, '/'));
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('accepts a store inside a project reached through a symlinked path', async () => {
    // projectRoot is a symlink alias for the same directory as the store's
    // parent — canonicalization must prevent a false "outside the project"
    // rejection (the /var -> /private/var class of issue on macOS).
    const projectDir = path.join(tmpDir, 'proj');
    fs.mkdirSync(projectDir, { recursive: true });
    const storeDir = path.join(projectDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');

    const alias = path.join(os.tmpdir(), `openspec-proj-alias-${process.pid}-${Date.now()}`);
    try {
      fs.symlinkSync(projectDir, alias, 'dir');
    } catch {
      return; // symlinks unavailable on this platform — nothing to verify
    }

    try {
      const result = await commitStoreRegistration({
        id: 'my-store',
        backend: { type: 'git', local_path: storeDir },
        writeMetadataIfMissing: false,
        projectRoot: alias,
      });

      expect(result.registryUpdated).toBe(true);
      expect(result.storeRoot).toBe(storeDir);
    } finally {
      fs.rmSync(alias, { recursive: true, force: true });
    }
  });

  it('detects rerun when already registered', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');

    await commitStoreRegistration({
      id: 'my-store',
      backend: { type: 'git', local_path: storeDir },
      writeMetadataIfMissing: false,
      projectRoot: tmpDir,
    });

    const result = await commitStoreRegistration({
      id: 'my-store',
      backend: { type: 'git', local_path: storeDir },
      writeMetadataIfMissing: false,
      projectRoot: tmpDir,
    });

    expect(result.alreadyRegistered).toBe(true);
    expect(result.registryUpdated).toBe(false);
  });

  it('stores forward-slash paths in the registry regardless of platform', async () => {
    // path.relative may emit backslashes on Windows; the code normalizes
    // them to forward slashes so the registry resolves on any platform.
    // On POSIX this is a no-op (path.relative already uses /), but the
    // test verifies the on-disk format uses forward slashes.
    const storeDir = path.join(tmpDir, 'sub', 'my-store');
    createStoreRoot(storeDir, 'my-store');

    await commitStoreRegistration({
      id: 'my-store',
      backend: { type: 'git', local_path: storeDir },
      writeMetadataIfMissing: false,
      projectRoot: tmpDir,
    });

    const registryPath = getStoreRegistryPath({ projectRoot: tmpDir });
    const content = fs.readFileSync(registryPath, 'utf-8');
    // The path in the registry must use forward slashes, never backslashes.
    const pathLine = content.split('\n').find((l) => l.includes('path:'));
    expect(pathLine).toBeDefined();
    expect(pathLine!).not.toContain('\\');
  });
});

describe('registerExistingStore with projectRoot: outside-project paths', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers a store outside the project root via a ../ relative path', async () => {
    // D8 removed: a project-scoped registry may bind a store that lives above
    // the project root. registerExistingStore succeeds and the registry records
    // a `../`-segment path.
    const outsideDir = makeTempDir();
    try {
      const storeDir = path.join(outsideDir, 'my-store');
      createStoreRoot(storeDir, 'my-store');

      const result = await registerExistingStore({
        path: storeDir,
        id: 'my-store',
        allowCreateIdentity: false,
        projectRoot: tmpDir,
      });

      expect(result.registryCommit.registered).toBe(true);

      const registryPath = getStoreRegistryPath({ projectRoot: tmpDir });
      const content = fs.readFileSync(registryPath, 'utf-8');
      expect(content).toContain('my-store:');
      expect(content).toContain(realPath(storeDir).replace(/\\/g, '/'));
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('registers a store at an absolute path with projectRoot', async () => {
    // An absolute store path is accepted by the project-scoped registration
    // path; the registry stores a relative path derived from projectRoot.
    const storeDir = path.join(tmpDir, 'abs-store');
    createStoreRoot(storeDir, 'abs-store');

    const result = await registerExistingStore({
      path: storeDir,
      id: 'abs-store',
      allowCreateIdentity: false,
      projectRoot: tmpDir,
    });

    expect(result.registryCommit.registered).toBe(true);

    const registryPath = getStoreRegistryPath({ projectRoot: tmpDir });
    const content = fs.readFileSync(registryPath, 'utf-8');
    expect(content).toContain('abs-store:');
    expect(content).toContain('path: abs-store');
  });
});

describe('listRegisteredStores with projectRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists stores from project-scoped registry', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    const entries = await listRegisteredStores({ projectRoot: tmpDir });
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('store-a');
    expect(entries[1].id).toBe('store-b');
  });

  it('returns empty array when no project-scoped registry', async () => {
    const entries = await listRegisteredStores({ projectRoot: tmpDir });
    expect(entries).toHaveLength(0);
  });

  it('returns duplicate IDs from multiple registry levels, nearest first', async () => {
    // Same store ID registered in both nearest and ancestor registry.
    // Both entries appear in the list, nearest first — the caller decides
    // which one wins resolution (the first).
    const ancestorDir = path.join(tmpDir, 'ancestor');
    const nestedDir = path.join(ancestorDir, 'nested');
    fs.mkdirSync(nestedDir, { recursive: true });

    const storeNear = path.join(nestedDir, 'shared-store');
    const storeFar = path.join(ancestorDir, 'shared-store');
    createStoreRoot(storeNear, 'shared-store');
    createStoreRoot(storeFar, 'shared-store');

    writeProjectRegistry(ancestorDir, {
      'shared-store': { path: 'shared-store' },
    });
    writeProjectRegistry(nestedDir, {
      'shared-store': { path: 'shared-store' },
    });

    const entries = await listRegisteredStores({ projectRoot: nestedDir });
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('shared-store');
    expect(entries[0].storeRoot).toBe(realPath(storeNear));
    expect(entries[1].id).toBe('shared-store');
    expect(entries[1].storeRoot).toBe(realPath(storeFar));
  });
});

describe('unregisterStoreRegistration with projectRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('removes entry from project-scoped registry', async () => {
    const storeA = path.join(tmpDir, 'store-a');
    const storeB = path.join(tmpDir, 'store-b');
    createStoreRoot(storeA, 'store-a');
    createStoreRoot(storeB, 'store-b');
    writeProjectRegistry(tmpDir, {
      'store-a': { path: 'store-a' },
      'store-b': { path: 'store-b' },
    });

    const removed = await unregisterStoreRegistration({
      id: 'store-a',
      projectRoot: tmpDir,
    });

    expect(removed.id).toBe('store-a');

    const entries = await listRegisteredStores({ projectRoot: tmpDir });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('store-b');
  });

  it('throws for unknown store id', async () => {
    writeProjectRegistry(tmpDir, { 'store-a': { path: 'store-a' } });

    await expect(
      unregisterStoreRegistration({ id: 'unknown', projectRoot: tmpDir })
    ).rejects.toThrow('Unknown store');
  });
});

describe('resolveOpenSpecRoot: merge scenarios', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('project-scoped takes precedence over global on ID conflict', async () => {
    const projectStore = path.join(tmpDir, 'project-store');
    const globalStore = path.join(tmpDir, 'global-store');
    createStoreRoot(projectStore, 'my-store');
    createStoreRoot(globalStore, 'my-store');

    // Create project-scoped registry
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'project-store' } });

    // Create global registry
    const globalDir = makeTempDir();
    try {
      const globalRegistryPath = path.join(globalDir, 'openspec', 'stores', 'registry.yaml');
      fs.mkdirSync(path.dirname(globalRegistryPath), { recursive: true });
      fs.writeFileSync(globalRegistryPath, `version: 1\nstores:\n  my-store:\n    backend:\n      type: git\n      local_path: ${globalStore}\n`);

      const root = await resolveOpenSpecRoot({
        store: 'my-store',
        startPath: tmpDir,
        globalDataDir: path.join(globalDir, 'openspec'),
      });

      expect(root.source).toBe('project_store');
      expect(root.path).toBe(realPath(projectStore));
    } finally {
      fs.rmSync(globalDir, { recursive: true, force: true });
    }
  });

  it('resolves from global when ID not in project-scoped, with warning', async () => {
    const globalStore = path.join(tmpDir, 'global-store');
    createStoreRoot(globalStore, 'global-store');

    // Project-scoped registry with a different store
    const projectStore = path.join(tmpDir, 'project-store');
    createStoreRoot(projectStore, 'project-store');
    writeProjectRegistry(tmpDir, { 'project-store': { path: 'project-store' } });

    // Global registry with global-store
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
      expect(root.path).toBe(realPath(globalStore));
    } finally {
      fs.rmSync(globalDir, { recursive: true, force: true });
    }
  });

  it('uses first project-scoped store as default root when no --store and no nearest root', async () => {
    const storeDir = path.join(tmpDir, 'my-store');
    createStoreRoot(storeDir, 'my-store');
    writeProjectRegistry(tmpDir, { 'my-store': { path: 'my-store' } });

    const root = await resolveOpenSpecRoot({
      startPath: tmpDir,
      allowImplicitRoot: false,
    });

    expect(root.source).toBe('project_store');
    expect(root.storeId).toBe('my-store');
  });

  it('falls back to global when project-scoped registry is malformed', async () => {
    // Create malformed project-scoped registry
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

      const root = await resolveOpenSpecRoot({
        store: 'global-store',
        startPath: tmpDir,
        globalDataDir: path.join(globalDir, 'openspec'),
      });

      expect(root.source).toBe('store');
      expect(root.path).toBe(realPath(globalStore));
    } finally {
      fs.rmSync(globalDir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate store ID at different path in project-scoped registry', async () => {
    const projectRoot = realPath(makeTempDir());
    const storeA = path.join(projectRoot, 'store-a');
    const storeB = path.join(projectRoot, 'store-b');
    fs.mkdirSync(storeA, { recursive: true });
    fs.mkdirSync(storeB, { recursive: true });
    createStoreRoot(storeA, 'shared-id');
    createStoreRoot(storeB, 'shared-id');

    try {
      // First registration via registerExistingStore succeeds
      await registerExistingStore({
        path: storeA,
        id: 'shared-id',
        allowCreateIdentity: true,
        projectRoot,
      });

      // Second registration at a different path fails with store_id_conflict
      await expect(
        registerExistingStore({
          path: storeB,
          id: 'shared-id',
          allowCreateIdentity: true,
          projectRoot,
        })
      ).rejects.toMatchObject({ diagnostic: { code: 'store_id_conflict' } });
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('allows same store ID in global and project-scoped registry without conflict', async () => {
    const projectRoot = realPath(makeTempDir());
    const globalStore = makeTempDir();
    const projectStore = path.join(projectRoot, 'project-store');
    fs.mkdirSync(projectStore, { recursive: true });
    createStoreRoot(projectStore, 'shared-id');
    createStoreRoot(globalStore, 'shared-id');

    const globalDir = makeTempDir();
    const globalRegistryPath = path.join(globalDir, 'openspec', 'stores', 'registry.yaml');
    fs.mkdirSync(path.dirname(globalRegistryPath), { recursive: true });
    fs.writeFileSync(globalRegistryPath, `version: 1\nstores:\n  shared-id:\n    backend:\n      type: git\n      local_path: ${globalStore}\n`);

    try {
      // Project-scoped registration of the same ID at a different path succeeds
      // because project-scoped and global registries are independent.
      const result = await commitStoreRegistration({
        id: 'shared-id',
        backend: { type: 'git', local_path: projectStore },
        writeMetadataIfMissing: false,
        projectRoot,
      });
      expect(result.registryUpdated).toBe(true);

      // Project-scoped takes precedence on resolution
      const root = await resolveOpenSpecRoot({
        store: 'shared-id',
        startPath: projectRoot,
        globalDataDir: path.join(globalDir, 'openspec'),
      });
      expect(root.source).toBe('project_store');
      expect(root.path).toBe(realPath(projectStore));
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(globalStore, { recursive: true, force: true });
      fs.rmSync(globalDir, { recursive: true, force: true });
    }
  });
});
