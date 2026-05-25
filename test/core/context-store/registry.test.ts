import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getContextStoreMetadataPath,
  mountInitiativesCollection,
  readContextStoreMetadataState,
  readContextStoreRegistryState,
  registerContextStore,
  resolveRegisteredContextStore,
  listRegisteredContextStores,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
} from '../../../src/core/index.js';

describe('context store registry facade', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-context-store-registry-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mkdir(relativePath: string): string {
    const dirPath = path.join(tempDir, relativePath);
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  }

  function expectedExistingPath(existingPath: string): string {
    return process.platform === 'win32' ? fs.realpathSync.native(existingPath) : existingPath;
  }

  it('registers a local Git context store by writing metadata and registry state', async () => {
    const storesDir = mkdir('stores');
    const storeRoot = mkdir('stores/acme-context');

    await expect(
      registerContextStore({
        id: 'acme-context',
        localPath: 'acme-context',
        remote: 'git@github.com:acme/context.git',
        branch: 'main',
        cwd: storesDir,
        globalDataDir: tempDir,
      })
    ).resolves.toEqual({
      id: 'acme-context',
      storeRoot: expectedExistingPath(storeRoot),
      backend: {
        type: 'git',
        local_path: expectedExistingPath(storeRoot),
        remote: 'git@github.com:acme/context.git',
        branch: 'main',
      },
    });

    await expect(readContextStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'acme-context',
    });
    await expect(readContextStoreRegistryState({ globalDataDir: tempDir })).resolves.toEqual({
      version: 1,
      stores: {
        'acme-context': {
          backend: {
            type: 'git',
            local_path: expectedExistingPath(storeRoot),
            remote: 'git@github.com:acme/context.git',
            branch: 'main',
          },
        },
      },
    });
  });

  it('merges registry entries and updates the registered path for an existing id', async () => {
    const oldRoot = mkdir('old/acme-context');
    const newRoot = mkdir('new/acme-context');
    const zetaRoot = mkdir('zeta-context');

    await writeContextStoreMetadataState(newRoot, { version: 1, id: 'acme-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'zeta-context': {
            backend: {
              type: 'git',
              local_path: zetaRoot,
            },
          },
          'acme-context': {
            backend: {
              type: 'git',
              local_path: oldRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    await registerContextStore({
      id: 'acme-context',
      localPath: newRoot,
      globalDataDir: tempDir,
    });

    await expect(listRegisteredContextStores({ globalDataDir: tempDir })).resolves.toEqual([
      {
        id: 'acme-context',
        storeRoot: expectedExistingPath(newRoot),
        backend: {
          type: 'git',
          local_path: expectedExistingPath(newRoot),
        },
      },
      {
        id: 'zeta-context',
        storeRoot: zetaRoot,
        backend: {
          type: 'git',
          local_path: zetaRoot,
        },
      },
    ]);
  });

  it('rejects registration when existing store metadata has a different id', async () => {
    const storeRoot = mkdir('acme-context');
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'other-context' });

    await expect(
      registerContextStore({
        id: 'acme-context',
        localPath: storeRoot,
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/does not match registered id/u);

    await expect(readContextStoreRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
  });

  it('rejects invalid registration input before writing registry state', async () => {
    const storeRoot = mkdir('acme-context');

    await expect(
      registerContextStore({
        id: 'Acme',
        localPath: storeRoot,
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/kebab-case/u);

    await expect(
      registerContextStore({
        id: 'acme-context',
        localPath: storeRoot,
        remote: '',
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/remote must not be empty/u);

    await expect(readContextStoreRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
  });

  it('lists registered context stores from the machine-local registry', async () => {
    const acmeRoot = mkdir('acme-context');
    const zetaRoot = mkdir('zeta-context');

    await expect(listRegisteredContextStores({ globalDataDir: tempDir })).resolves.toEqual([]);

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'zeta-context': {
            backend: {
              type: 'git',
              local_path: zetaRoot,
            },
          },
          'acme-context': {
            backend: {
              type: 'git',
              local_path: acmeRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    await expect(listRegisteredContextStores({ globalDataDir: tempDir })).resolves.toEqual([
      {
        id: 'acme-context',
        storeRoot: acmeRoot,
        backend: {
          type: 'git',
          local_path: acmeRoot,
        },
      },
      {
        id: 'zeta-context',
        storeRoot: zetaRoot,
        backend: {
          type: 'git',
          local_path: zetaRoot,
        },
      },
    ]);
  });

  it('resolves a registered context store and validates portable metadata identity', async () => {
    const storeRoot = mkdir('acme-context');
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'acme-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'acme-context': {
            backend: {
              type: 'git',
              local_path: storeRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    await expect(
      resolveRegisteredContextStore({ id: 'acme-context', globalDataDir: tempDir })
    ).resolves.toEqual({
      id: 'acme-context',
      storeRoot,
      backend: {
        type: 'git',
        local_path: storeRoot,
      },
    });
  });

  it('rejects missing registry entries and bad registered metadata', async () => {
    await expect(
      resolveRegisteredContextStore({ id: 'missing-context', globalDataDir: tempDir })
    ).rejects.toThrow(/No context store registry found/u);

    const missingMetadataRoot = mkdir('missing-metadata');
    const mismatchedRoot = mkdir('mismatched');
    await writeContextStoreMetadataState(mismatchedRoot, { version: 1, id: 'other-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'missing-metadata': {
            backend: {
              type: 'git',
              local_path: missingMetadataRoot,
            },
          },
          mismatched: {
            backend: {
              type: 'git',
              local_path: mismatchedRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    await expect(
      resolveRegisteredContextStore({ id: 'unknown-context', globalDataDir: tempDir })
    ).rejects.toThrow(/Unknown context store/u);

    await expect(
      resolveRegisteredContextStore({ id: 'missing-metadata', globalDataDir: tempDir })
    ).rejects.toThrow(new RegExp(getContextStoreMetadataPath(missingMetadataRoot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));

    await expect(
      resolveRegisteredContextStore({ id: 'mismatched', globalDataDir: tempDir })
    ).rejects.toThrow(/does not match registered id/u);
  });

  it('mounts the initiatives collection for a resolved store root', async () => {
    const storeRoot = mkdir('acme-context');
    const initiatives = mountInitiativesCollection(storeRoot);

    expect(initiatives.collectionId).toBe('initiatives');
    expect(initiatives.mountRoot).toBe(path.join(storeRoot, 'initiatives'));
    expect(initiatives.toStorePath('launch-billing-flow/initiative.yaml')).toBe(
      'initiatives/launch-billing-flow/initiative.yaml'
    );
  });
});
