import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getStoreMetadataPath,
  getGlobalDataDir,
  prepareStoreCleanup,
  prepareStoreSetup,
  readStoreMetadataState,
  readStoreRegistryState,
  registerStore,
  removeStore,
  resolveRegisteredStore,
  listRegisteredStores,
  setupStore,
  setupPreparedStore,
  unregisterStoreRegistration,
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../../src/core/index.js';

describe('store registry facade', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-registry-'));
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

  it('registers a local Git store by writing metadata and registry state', async () => {
    const storesDir = mkdir('stores');
    const storeRoot = mkdir('stores/acme-context');

    const registered = await registerStore({
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

    await expect(readStoreMetadataState(storeRoot)).resolves.toEqual({
      version: 1,
      id: 'acme-context',
    });
    const registry = await readStoreRegistryState({ globalDataDir: tempDir });
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

    await writeStoreMetadataState(newRoot, { version: 1, id: 'acme-context' });
    await writeStoreRegistryState(
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
      registerStore({
        id: 'acme-context',
        localPath: newRoot,
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/already registered/u);

    const stores = await listRegisteredStores({ globalDataDir: tempDir });
    expect(stores.map((store) => store.id)).toEqual(['acme-context', 'zeta-context']);
    expectSameExistingPath(stores[0].storeRoot, oldRoot);
    expectSameExistingPath(stores[0].backend.local_path, oldRoot);
    expectSameExistingPath(stores[1].storeRoot, zetaRoot);
    expectSameExistingPath(stores[1].backend.local_path, zetaRoot);
  });

  it('rejects registration when existing store metadata has a different id', async () => {
    const storeRoot = mkdir('acme-context');
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'other-context' });

    await expect(
      registerStore({
        id: 'acme-context',
        localPath: storeRoot,
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/does not match registered id/u);

    await expect(readStoreRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
  });

  it('rejects invalid registration input before writing registry state', async () => {
    const storeRoot = mkdir('acme-context');

    await expect(
      registerStore({
        id: 'Acme',
        localPath: storeRoot,
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/kebab-case/u);

    await expect(
      registerStore({
        id: 'acme-context',
        localPath: storeRoot,
        remote: '',
        globalDataDir: tempDir,
      })
    ).rejects.toThrow(/remote must not be empty/u);

    await expect(readStoreRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
  });

  it('removes newly created store metadata when the registry write fails', async () => {
    const storeRoot = mkdir('acme-context');
    const blockedGlobalDataDir = path.join(tempDir, 'blocked-data-dir');
    fs.writeFileSync(blockedGlobalDataDir, 'not a directory\n');

    await expect(
      registerStore({
        id: 'acme-context',
        localPath: storeRoot,
        globalDataDir: blockedGlobalDataDir,
      })
    ).rejects.toThrow();

    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(false);
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
      const prepared = await prepareStoreSetup({
        id: 'team-context',
        path: preparedRoot,
      });
      const otherRoot = mkdir('other-context');
      await writeStoreMetadataState(otherRoot, {
        version: 1,
        id: 'other-context',
      });
      await writeStoreRegistryState(
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

      await setupPreparedStore(prepared, { initGit: false });

      const registry = await readStoreRegistryState({ globalDataDir });
      expect(Object.keys(registry?.stores ?? {})).toEqual(['other-context', 'team-context']);
      expectSameExistingPath(registry?.stores['other-context'].backend.local_path ?? '', otherRoot);
      expectSameExistingPath(registry?.stores['team-context'].backend.local_path ?? '', preparedRoot);
    } finally {
      process.env = originalEnv;
    }
  });

  it('removes only setup-created root files when registry write fails', async () => {
    const originalEnv = { ...process.env };
    const dataHome = mkdir('blocked-data-home');
    fs.writeFileSync(path.join(dataHome, 'openspec'), 'not a directory\n');
    process.env = {
      ...process.env,
      XDG_DATA_HOME: dataHome,
    };
    const storeRoot = path.join(tempDir, 'team-context');

    try {
      await expect(
        setupStore({
          id: 'team-context',
          path: storeRoot,
          initGit: false,
        })
      ).rejects.toThrow();

      expect(fs.existsSync(storeRoot)).toBe(false);
    } finally {
      process.env = originalEnv;
    }
  });

  it('lists registered stores from the machine-local registry', async () => {
    const acmeRoot = mkdir('acme-context');
    const zetaRoot = mkdir('zeta-context');

    await expect(listRegisteredStores({ globalDataDir: tempDir })).resolves.toEqual([]);

    await writeStoreRegistryState(
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

    const stores = await listRegisteredStores({ globalDataDir: tempDir });
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

  it('resolves a registered store and validates portable metadata identity', async () => {
    const storeRoot = mkdir('acme-context');
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'acme-context' });
    await writeStoreRegistryState(
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

    const resolved = await resolveRegisteredStore({
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



  it('rejects missing registry entries and bad registered metadata', async () => {
    await expect(
      resolveRegisteredStore({ id: 'missing-context', globalDataDir: tempDir })
    ).rejects.toThrow(/No store registry found/u);

    // The no-registry fix must not point at --store-path, a flag this PR
    // deliberately rejects everywhere else.
    await expect(
      resolveRegisteredStore({ id: 'missing-context', globalDataDir: tempDir })
    ).rejects.toMatchObject({
      diagnostic: {
        code: 'no_store_registry',
        fix: expect.not.stringContaining('--store-path'),
      },
    });

    const missingMetadataRoot = mkdir('missing-metadata');
    const mismatchedRoot = mkdir('mismatched');
    await writeStoreMetadataState(mismatchedRoot, { version: 1, id: 'other-context' });
    await writeStoreRegistryState(
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
      resolveRegisteredStore({ id: 'unknown-context', globalDataDir: tempDir })
    ).rejects.toThrow(/Unknown store/u);

    await expect(
      resolveRegisteredStore({ id: 'missing-metadata', globalDataDir: tempDir })
    ).rejects.toThrow(new RegExp(getStoreMetadataPath(missingMetadataRoot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));

    await expect(
      resolveRegisteredStore({ id: 'mismatched', globalDataDir: tempDir })
    ).rejects.toThrow(/does not match registered id/u);
  });

  it('refuses a prepared remove when the registry entry changes before deletion', async () => {
    const firstRoot = mkdir('first/team-context');
    const secondRoot = mkdir('second/team-context');
    await writeStoreMetadataState(firstRoot, { version: 1, id: 'team-context' });
    await writeStoreMetadataState(secondRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
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
    const prepared = await prepareStoreCleanup({
      id: 'team-context',
      globalDataDir: tempDir,
    });

    await writeStoreRegistryState(
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

    await expect(removeStore(prepared)).rejects.toThrow(/changed before cleanup/u);
    expect(fs.existsSync(firstRoot)).toBe(true);
    expect(fs.existsSync(secondRoot)).toBe(true);
    const registry = await readStoreRegistryState({ globalDataDir: tempDir });
    expectSameExistingPath(registry?.stores['team-context'].backend.local_path ?? '', secondRoot);
  });

  it('matches prepared cleanup backends by canonical local path', async () => {
    const storeRoot = mkdir('team-context');
    const spelledStoreRoot = `${tempDir}${path.sep}.${path.sep}team-context`;
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
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
    const prepared = await prepareStoreCleanup({
      id: 'team-context',
      globalDataDir: tempDir,
    });

    await writeStoreRegistryState(
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

    const unregistered = await unregisterStoreRegistration({
      id: 'team-context',
      expectedBackend: prepared.backend,
      globalDataDir: tempDir,
    });

    expect(unregistered.id).toBe('team-context');
    expectSameExistingPath(unregistered.storeRoot, storeRoot);
    await expect(readStoreRegistryState({ globalDataDir: tempDir })).resolves.toEqual({
      version: 1,
      stores: {},
    });
  });

  it('removes the registration first and degrades a failed file deletion to a warning', async () => {
    const storeRoot = mkdir('team-context');
    await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
    await writeStoreRegistryState(
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
    const prepared = await prepareStoreCleanup({
      id: 'team-context',
      globalDataDir: tempDir,
    });
    const realRm = fs.promises.rm.bind(fs.promises);
    const rmSpy = vi
      .spyOn(fs.promises, 'rm')
      .mockImplementation(async (target, options) => {
        // Only the store-root deletion fails; lock cleanup is real.
        if (String(target) === storeRoot) {
          throw new Error('simulated delete failure');
        }
        return realRm(target as Parameters<typeof realRm>[0], options);
      });

    // Capstone ordering contract: the registry entry is removed FIRST;
    // a failed file deletion degrades to a warning (orphan files are
    // recoverable, a phantom registration is not).
    let result;
    try {
      result = await removeStore(prepared);
    } finally {
      rmSpy.mockRestore();
    }

    expect(result.files.deleted).toBe(false);
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'store_files_left_on_disk',
        fix: expect.stringContaining('Delete the folder manually:'),
      })
    );
    const registry = await readStoreRegistryState({ globalDataDir: tempDir });
    expect(registry?.stores['team-context']).toBeUndefined();
    expect(fs.existsSync(getStoreMetadataPath(storeRoot))).toBe(true);
  });
});
