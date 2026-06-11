import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getContextStoreMetadataPath,
  getGlobalDataDir,
  createPathContextStoreBinding,
  createRegisteredContextStoreBinding,
  mountInitiativesCollection,
  prepareContextStoreCleanup,
  prepareContextStoreSetup,
  readContextStoreMetadataState,
  readContextStoreRegistryState,
  registerContextStore,
  removeContextStore,
  resolveContextStoreBinding,
  resolveRegisteredContextStore,
  listRegisteredContextStores,
  setupPreparedContextStore,
  unregisterContextStoreRegistration,
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

  function canonicalPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function expectSameExistingPath(actualPath: string, expectedPath: string): void {
    expect(canonicalPath(actualPath)).toBe(canonicalPath(expectedPath));
  }

  it('registers a local Git context store by writing metadata and registry state', async () => {
    const storesDir = mkdir('stores');
    const storeRoot = mkdir('stores/acme-context');

    const registered = await registerContextStore({
      id: 'acme-context',
      localPath: 'acme-context',
      remote: 'git@github.com:acme/context.git',
      branch: 'main',
      cwd: storesDir,
      globalDataDir: tempDir,
    });

    expect(registered).toEqual({
      id: 'acme-context',
      storeRoot: expect.any(String),
      backend: {
        type: 'git',
        local_path: expect.any(String),
        remote: 'git@github.com:acme/context.git',
        branch: 'main',
      },
    });
    expectSameExistingPath(registered.storeRoot, storeRoot);
    expectSameExistingPath(registered.backend.local_path, storeRoot);

    await expect(readContextStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'acme-context',
    });
    const registry = await readContextStoreRegistryState({ globalDataDir: tempDir });
    expect(registry).toEqual({
      version: 1,
      stores: {
        'acme-context': {
          backend: {
            type: 'git',
            local_path: expect.any(String),
            remote: 'git@github.com:acme/context.git',
            branch: 'main',
          },
        },
      },
    });
    expectSameExistingPath(
      registry?.stores['acme-context'].backend.local_path ?? '',
      storeRoot
    );
  });

  it('rejects a registered path rewrite for an existing id', async () => {
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

    await expect(
      registerContextStore({
        id: 'acme-context',
        localPath: newRoot,
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/already registered/u);

    const stores = await listRegisteredContextStores({ globalDataDir: tempDir });
    expect(stores.map((store) => store.id)).toEqual(['acme-context', 'zeta-context']);
    expectSameExistingPath(stores[0].storeRoot, oldRoot);
    expectSameExistingPath(stores[0].backend.local_path, oldRoot);
    expectSameExistingPath(stores[1].storeRoot, zetaRoot);
    expectSameExistingPath(stores[1].backend.local_path, zetaRoot);
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

  it('removes newly created store metadata when the registry write fails', async () => {
    const storeRoot = mkdir('acme-context');
    const blockedGlobalDataDir = path.join(tempDir, 'blocked-data-dir');
    fs.writeFileSync(blockedGlobalDataDir, 'not a directory\n');

    await expect(
      registerContextStore({
        id: 'acme-context',
        localPath: storeRoot,
        globalDataDir: blockedGlobalDataDir,
      })
    ).rejects.toThrow();

    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(false);
  });

  it('commits prepared setup against the latest registry state', async () => {
    const originalEnv = { ...process.env };
    const dataHome = path.join(tempDir, 'data-home');
    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
    };

    try {
      const globalDataDir = getGlobalDataDir();
      const preparedRoot = path.join(tempDir, 'team-context');
      const prepared = await prepareContextStoreSetup({
        id: 'team-context',
        path: preparedRoot,
      });
      const otherRoot = mkdir('other-context');
      await writeContextStoreMetadataState(otherRoot, {
        version: 1,
        id: 'other-context',
      });
      await writeContextStoreRegistryState(
        {
          version: 1,
          stores: {
            'other-context': {
              backend: {
                type: 'git',
                local_path: otherRoot,
              },
            },
          },
        },
        { globalDataDir }
      );

      await setupPreparedContextStore(prepared, { initGit: false });

      const registry = await readContextStoreRegistryState({ globalDataDir });
      expect(Object.keys(registry?.stores ?? {})).toEqual(['other-context', 'team-context']);
      expectSameExistingPath(registry?.stores['other-context'].backend.local_path ?? '', otherRoot);
      expectSameExistingPath(registry?.stores['team-context'].backend.local_path ?? '', preparedRoot);
    } finally {
      process.env = originalEnv;
    }
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

    const stores = await listRegisteredContextStores({ globalDataDir: tempDir });
    expect(stores).toEqual([
      {
        id: 'acme-context',
        storeRoot: expect.any(String),
        backend: {
          type: 'git',
          local_path: expect.any(String),
        },
      },
      {
        id: 'zeta-context',
        storeRoot: expect.any(String),
        backend: {
          type: 'git',
          local_path: expect.any(String),
        },
      },
    ]);
    expectSameExistingPath(stores[0].storeRoot, acmeRoot);
    expectSameExistingPath(stores[0].backend.local_path, acmeRoot);
    expectSameExistingPath(stores[1].storeRoot, zetaRoot);
    expectSameExistingPath(stores[1].backend.local_path, zetaRoot);
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

    const resolved = await resolveRegisteredContextStore({
      id: 'acme-context',
      globalDataDir: tempDir,
    });
    expect(resolved).toEqual({
      id: 'acme-context',
      storeRoot: expect.any(String),
      backend: {
        type: 'git',
        local_path: expect.any(String),
      },
    });
    expectSameExistingPath(resolved.storeRoot, storeRoot);
    expectSameExistingPath(resolved.backend.local_path, storeRoot);
  });

  it('resolves registry and path context store bindings', async () => {
    const registeredRoot = mkdir('registered-context');
    const pathRoot = mkdir('path-context');
    await writeContextStoreMetadataState(registeredRoot, {
      version: 1,
      id: 'registered-context',
    });
    await writeContextStoreMetadataState(pathRoot, {
      version: 1,
      id: 'path-context',
    });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'registered-context': {
            backend: {
              type: 'git',
              local_path: registeredRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    const registered = await resolveContextStoreBinding(
      createRegisteredContextStoreBinding('registered-context'),
      { globalDataDir: tempDir }
    );
    expect(registered).toEqual(
      expect.objectContaining({
        id: 'registered-context',
        root: expect.any(String),
        source: 'registry',
        warnings: [],
      })
    );
    expectSameExistingPath(registered.root, registeredRoot);

    const pathBound = await resolveContextStoreBinding(
      createPathContextStoreBinding({
        id: 'path-context',
        path: pathRoot,
      }),
      { globalDataDir: tempDir }
    );
    expect(pathBound).toEqual(
      expect.objectContaining({
        id: 'path-context',
        root: expect.any(String),
        source: 'path',
        warnings: [],
      })
    );
    expectSameExistingPath(pathBound.root, pathRoot);
  });

  it('warns when a path binding resolves to a different metadata id', async () => {
    const storeRoot = mkdir('renamed-context');
    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id: 'new-context',
    });

    const resolved = await resolveContextStoreBinding({
      id: 'old-context',
      selector: {
        kind: 'path',
        path: storeRoot,
        observed_id: 'old-context',
      },
    });

    expect(resolved.id).toBe('new-context');
    expect(resolved.warnings).toEqual([
      expect.objectContaining({
        code: 'context_store_binding_id_changed',
      }),
    ]);
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

  it('refuses a prepared remove when the registry entry changes before deletion', async () => {
    const firstRoot = mkdir('first/team-context');
    const secondRoot = mkdir('second/team-context');
    await writeContextStoreMetadataState(firstRoot, { version: 1, id: 'team-context' });
    await writeContextStoreMetadataState(secondRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: firstRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );
    const prepared = await prepareContextStoreCleanup({
      id: 'team-context',
      globalDataDir: tempDir,
    });

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: secondRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    await expect(removeContextStore(prepared)).rejects.toThrow(/changed before cleanup/u);
    expect(fs.existsSync(firstRoot)).toBe(true);
    expect(fs.existsSync(secondRoot)).toBe(true);
    const registry = await readContextStoreRegistryState({ globalDataDir: tempDir });
    expectSameExistingPath(registry?.stores['team-context'].backend.local_path ?? '', secondRoot);
  });

  it('matches prepared cleanup backends by canonical local path', async () => {
    const storeRoot = mkdir('team-context');
    const spelledStoreRoot = `${tempDir}${path.sep}.${path.sep}team-context`;
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: spelledStoreRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );
    const prepared = await prepareContextStoreCleanup({
      id: 'team-context',
      globalDataDir: tempDir,
    });

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: storeRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );

    const unregistered = await unregisterContextStoreRegistration({
      id: 'team-context',
      expectedBackend: prepared.backend,
      globalDataDir: tempDir,
    });

    expect(unregistered.id).toBe('team-context');
    expectSameExistingPath(unregistered.storeRoot, storeRoot);
    await expect(readContextStoreRegistryState({ globalDataDir: tempDir })).resolves.toEqual({
      version: 1,
      stores: {},
    });
  });

  it('keeps the registry entry when prepared remove fails to delete files', async () => {
    const storeRoot = mkdir('team-context');
    await writeContextStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'team-context': {
            backend: {
              type: 'git',
              local_path: storeRoot,
            },
          },
        },
      },
      { globalDataDir: tempDir }
    );
    const prepared = await prepareContextStoreCleanup({
      id: 'team-context',
      globalDataDir: tempDir,
    });
    const rmSpy = vi
      .spyOn(fs.promises, 'rm')
      .mockRejectedValueOnce(new Error('simulated delete failure'));

    try {
      await expect(removeContextStore(prepared)).rejects.toThrow(/simulated delete failure/u);
    } finally {
      rmSpy.mockRestore();
    }

    const registry = await readContextStoreRegistryState({ globalDataDir: tempDir });
    expectSameExistingPath(registry?.stores['team-context'].backend.local_path ?? '', storeRoot);
    expect(fs.existsSync(getContextStoreMetadataPath(storeRoot))).toBe(true);
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
