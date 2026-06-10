import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resolveOpenSpecRoot,
  RootSelectionError,
} from '../../src/core/root-selection.js';
import {
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
} from '../../src/core/context-store/foundation.js';

describe('resolveOpenSpecRoot', () => {
  let tempDir: string;
  let globalDataDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-root-selection-'))
    );
    globalDataDir = path.join(tempDir, 'global-data');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function createOpenSpecRoot(rootDir: string): void {
    fs.mkdirSync(path.join(rootDir, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'openspec', 'changes', 'archive'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  }

  async function registerStore(
    id: string,
    options: { healthyRoot?: boolean; metadataId?: string | null } = {}
  ): Promise<string> {
    const storeRoot = mkdir(`stores/${id}`);
    if (options.healthyRoot !== false) {
      createOpenSpecRoot(storeRoot);
    }
    if (options.metadataId !== null) {
      await writeContextStoreMetadataState(storeRoot, {
        version: 1,
        id: options.metadataId ?? id,
      });
    }

    const existing = fs.existsSync(path.join(globalDataDir, 'context-stores', 'registry.yaml'));
    const registryStores = existing
      ? (await import('../../src/core/context-store/foundation.js').then((m) =>
          m.readContextStoreRegistryState({ globalDataDir })
        ))?.stores ?? {}
      : {};

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          ...registryStores,
          [id]: { backend: { type: 'git', local_path: storeRoot } },
        },
      },
      { globalDataDir }
    );

    return storeRoot;
  }

  async function expectRootSelectionError(
    promise: Promise<unknown>,
    code: string
  ): Promise<RootSelectionError> {
    let caught: unknown;
    try {
      await promise;
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RootSelectionError);
    const error = caught as RootSelectionError;
    expect(error.diagnostic.code).toBe(code);
    return error;
  }

  it('resolves a selected store to its healthy OpenSpec root', async () => {
    const storeRoot = await registerStore('team-context');

    const root = await resolveOpenSpecRoot({ store: 'team-context', globalDataDir });

    expect(root.source).toBe('store');
    expect(root.storeId).toBe('team-context');
    expect(root.path).toBe(storeRoot);
    expect(root.changesDir).toBe(path.join(storeRoot, 'openspec', 'changes'));
    expect(root.specsDir).toBe(path.join(storeRoot, 'openspec', 'specs'));
    expect(root.archiveDir).toBe(path.join(storeRoot, 'openspec', 'changes', 'archive'));
    expect(root.defaultSchema).toBe('spec-driven');
  });

  it('rejects an unknown store id and lists registered ids', async () => {
    await registerStore('team-context');

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-contxt', globalDataDir }),
      'unknown_store'
    );
    expect(error.message).toContain("'team-contxt'");
    expect(error.message).toContain('team-context');
  });

  it('rejects --store when no stores are registered without suggesting --store-path', async () => {
    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-context', globalDataDir }),
      'no_registered_stores'
    );
    expect(error.message).not.toContain('--store-path');
    expect(error.diagnostic.fix).not.toContain('--store-path');
  });

  it('rejects an invalid store id format before registry lookup', async () => {
    // No registry exists at all; format validation must win.
    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'Bad/Id', globalDataDir }),
      'invalid_context_store_id'
    );
    expect(error.message).toContain('Context store id');
  });

  it('rejects an unhealthy store root without repairing it', async () => {
    const storeRoot = await registerStore('team-context', { healthyRoot: false });

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-context', globalDataDir }),
      'unhealthy_store_root'
    );
    expect(error.diagnostic.fix).toContain('context-store doctor');
    // No scaffolding or repair happened.
    expect(fs.existsSync(path.join(storeRoot, 'openspec'))).toBe(false);
  });

  it('rejects a store whose metadata id does not match the registry id', async () => {
    await registerStore('team-context', { metadataId: 'other-context' });

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-context', globalDataDir }),
      'store_identity_mismatch'
    );
    expect(error.message).toContain('other-context');
    expect(error.diagnostic.fix).toContain('context-store doctor');
  });

  it('rejects a store with missing identity metadata before root-health checks', async () => {
    // Root is also unhealthy; the identity failure must win.
    await registerStore('team-context', { healthyRoot: false, metadataId: null });

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-context', globalDataDir }),
      'store_identity_mismatch'
    );
    expect(error.diagnostic.fix).toContain('context-store doctor');
  });

  it('rejects --store-path deliberately with register guidance', async () => {
    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ storePath: '/somewhere', globalDataDir }),
      'store_path_not_supported'
    );
    expect(error.message).toContain('context-store register');
    expect(error.message).toContain('--store <id>');
  });

  it('resolves the nearest openspec root without --store', async () => {
    const repoRoot = mkdir('app-repo');
    createOpenSpecRoot(repoRoot);
    const nested = mkdir('app-repo/src/deep');

    const root = await resolveOpenSpecRoot({ startPath: nested, globalDataDir });

    expect(root.source).toBe('nearest');
    expect(root.path).toBe(repoRoot);
  });

  it('ignores leftover workspace view state when a nearest root exists', async () => {
    const workspaceDir = mkdir('workspace');
    fs.mkdirSync(path.join(workspaceDir, '.openspec-workspace'), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, '.openspec-workspace', 'view.yaml'),
      'version: 1\nname: platform\ncontext: null\nlinks: {}\n'
    );
    const repoRoot = mkdir('workspace/app-repo');
    createOpenSpecRoot(repoRoot);
    const nested = mkdir('workspace/app-repo/src');

    const root = await resolveOpenSpecRoot({ startPath: nested, globalDataDir });

    expect(root.source).toBe('nearest');
    expect(root.path).toBe(repoRoot);
    expect(root.changesDir).toBe(path.join(repoRoot, 'openspec', 'changes'));
    expect(root.defaultSchema).toBe('spec-driven');
  });

  it('treats workspace state alone as no root at all', async () => {
    const workspaceDir = mkdir('workspace-only');
    fs.mkdirSync(path.join(workspaceDir, '.openspec-workspace'), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, '.openspec-workspace', 'view.yaml'),
      'version: 1\nname: platform\ncontext: null\nlinks: {}\n'
    );

    const root = await resolveOpenSpecRoot({ startPath: workspaceDir, globalDataDir });

    expect(root.source).toBe('implicit');
    expect(root.path).toBe(workspaceDir);
  });

  it('fails with a store-selection hint when no root exists but stores are registered', async () => {
    await registerStore('team-context');
    const appRepo = mkdir('plain-app');

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ startPath: appRepo, globalDataDir }),
      'no_root_with_registered_stores'
    );
    expect(error.message).toContain('team-context');
    expect(error.message).toContain('--store <id>');
    expect(error.message).toContain('openspec init');
    // No scaffolding happened.
    expect(fs.existsSync(path.join(appRepo, 'openspec'))).toBe(false);
  });

  it('allows an implicit root only when requested', async () => {
    const appRepo = mkdir('implicit-app');

    const implicitRoot = await resolveOpenSpecRoot({ startPath: appRepo, globalDataDir });
    expect(implicitRoot.source).toBe('implicit');
    expect(implicitRoot.path).toBe(appRepo);

    await expectRootSelectionError(
      resolveOpenSpecRoot({ startPath: appRepo, globalDataDir, allowImplicitRoot: false }),
      'no_openspec_root'
    );
  });

  it('prefers the selected store over a nearby root and leftover workspace state', async () => {
    const storeRoot = await registerStore('team-context');
    const repoRoot = mkdir('local-repo');
    createOpenSpecRoot(repoRoot);
    fs.mkdirSync(path.join(repoRoot, '.openspec-workspace'), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, '.openspec-workspace', 'view.yaml'),
      'version: 1\nname: platform\ncontext: null\nlinks: {}\n'
    );

    const root = await resolveOpenSpecRoot({
      store: 'team-context',
      startPath: repoRoot,
      globalDataDir,
    });

    expect(root.source).toBe('store');
    expect(root.path).toBe(storeRoot);
  });
});
