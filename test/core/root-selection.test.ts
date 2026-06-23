import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resolveOpenSpecRoot,
  RootSelectionError,
} from '../../src/core/root-selection.js';
import {
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';

describe('resolveOpenSpecRoot', () => {
  let tempDir: string;
  let globalDataDir: string;
  let savedXdgDataHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-root-selection-'))
    );
    globalDataDir = path.join(tempDir, 'global-data');
    // Backstop: store calls below thread `globalDataDir`, but if a future
    // edit forgets one, the path resolver falls back to XDG_DATA_HOME and
    // then to the real ~/.local/share/openspec. Pin XDG at the temp dir so
    // a missed arg can never pollute the developer's home registry.
    savedXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg');
  });

  afterEach(() => {
    if (savedXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = savedXdgDataHome;
    }
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
      await writeStoreMetadataState(storeRoot, {
        version: 1,
        id: options.metadataId ?? id,
      });
    }

    const existing = fs.existsSync(path.join(globalDataDir, 'stores', 'registry.yaml'));
    const registryStores = existing
      ? (await import('../../src/core/store/foundation.js').then((m) =>
          m.readStoreRegistryState({ globalDataDir })
        ))?.stores ?? {}
      : {};

    await writeStoreRegistryState(
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
      'invalid_store_id'
    );
    expect(error.message).toContain('Store id');
  });

  it('rejects an unhealthy store root without repairing it', async () => {
    const storeRoot = await registerStore('team-context', { healthyRoot: false });

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-context', globalDataDir }),
      'unhealthy_store_root'
    );
    expect(error.diagnostic.fix).toContain('store doctor');
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
    expect(error.diagnostic.fix).toContain('store doctor');
  });

  it('rejects a store with missing identity metadata before root-health checks', async () => {
    // Root is also unhealthy; the identity failure must win.
    await registerStore('team-context', { healthyRoot: false, metadataId: null });

    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ store: 'team-context', globalDataDir }),
      'store_identity_mismatch'
    );
    expect(error.diagnostic.fix).toContain('store doctor');
  });

  it('rejects --store-path deliberately with register guidance', async () => {
    const error = await expectRootSelectionError(
      resolveOpenSpecRoot({ storePath: '/somewhere', globalDataDir }),
      'store_path_not_supported'
    );
    expect(error.message).toContain('store register');
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

  describe('declared store fallback (3.2)', () => {
    function createPointerDir(relativePath: string, configBody: string): string {
      const dir = mkdir(relativePath);
      fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), configBody);
      return dir;
    }

    it('resolves a config-only pointer to the declared store', async () => {
      const storeRoot = await registerStore('team-context');
      const pointerDir = createPointerDir('app-repo', 'store: team-context\n');

      const root = await resolveOpenSpecRoot({ startPath: pointerDir, globalDataDir });

      expect(root.source).toBe('declared');
      expect(root.storeId).toBe('team-context');
      expect(root.path).toBe(storeRoot);
      // The pointer dir is untouched.
      expect(fs.existsSync(path.join(pointerDir, 'openspec', 'specs'))).toBe(false);
      expect(fs.existsSync(path.join(pointerDir, 'openspec', 'changes'))).toBe(false);
    });

    it('lets explicit --store beat the pointer with source store', async () => {
      await registerStore('team-context');
      const otherRoot = await registerStore('other-context');
      const pointerDir = createPointerDir('app-repo', 'store: team-context\n');

      const root = await resolveOpenSpecRoot({
        startPath: pointerDir,
        store: 'other-context',
        globalDataDir,
      });

      expect(root.source).toBe('store');
      expect(root.path).toBe(otherRoot);
    });

    it('never overrides a real root and warns once about the ignored pointer', async () => {
      await registerStore('team-context');
      const repo = mkdir('real-repo');
      createOpenSpecRoot(repo);
      fs.writeFileSync(
        path.join(repo, 'openspec', 'config.yaml'),
        'schema: spec-driven\nstore: team-context\n'
      );

      const warnings: string[] = [];
      const original = console.error;
      console.error = (message: string) => warnings.push(String(message));
      try {
        const root = await resolveOpenSpecRoot({ startPath: repo, globalDataDir });
        expect(root.source).toBe('nearest');
        expect(root.path).toBe(repo);
        expect(root.storeId).toBeUndefined();
      } finally {
        console.error = original;
      }

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("declares store 'team-context'");
      expect(warnings[0]).toContain('the declaration is ignored');
    });

    it('keeps config-only directories without a pointer as plain roots', async () => {
      await registerStore('team-context');
      const dir = createPointerDir('plain-config-only', 'schema: spec-driven\n');

      const warnings: string[] = [];
      const original = console.error;
      console.error = (message: string) => warnings.push(String(message));
      try {
        const root = await resolveOpenSpecRoot({ startPath: dir, globalDataDir });
        expect(root.source).toBe('nearest');
        expect(root.path).toBe(dir);
      } finally {
        console.error = original;
      }
      expect(warnings).toEqual([]);
    });

    it('errors on malformed pointers instead of falling through to local writes', async () => {
      const nonString = createPointerDir('bad-type', 'store: [a, b]\n');
      const error = await expectRootSelectionError(
        resolveOpenSpecRoot({ startPath: nonString, globalDataDir }),
        'invalid_store_pointer'
      );
      expect(error.message).toContain(path.join(nonString, 'openspec', 'config.yaml'));
      expect(error.message).toContain('the store key must be a single store id string');
      expect(fs.existsSync(path.join(nonString, 'openspec', 'changes'))).toBe(false);

      const unparseable = createPointerDir('bad-yaml', 'store: [unclosed');
      const yamlError = await expectRootSelectionError(
        resolveOpenSpecRoot({ startPath: unparseable, globalDataDir }),
        'invalid_store_pointer'
      );
      // The unparseable case names the real problem, not a phantom key.
      expect(yamlError.message).toContain('could not be read as YAML');
      expect(yamlError.diagnostic.fix).toContain('Fix the YAML syntax');

      // A config that parses to a non-mapping scalar has no pointer at
      // all: plain root, no error (readProjectConfig owns that warning).
      const scalar = createPointerDir('scalar-config', 'just a string');
      const scalarRoot = await resolveOpenSpecRoot({ startPath: scalar, globalDataDir });
      expect(scalarRoot.source).toBe('nearest');
    });

    it('treats empty and comments-only configs as plain roots, not malformed pointers', async () => {
      // The documented conversion path comments the line out; that must
      // not strand every command behind invalid_store_pointer.
      const empty = createPointerDir('empty-config', '');
      const emptyRoot = await resolveOpenSpecRoot({ startPath: empty, globalDataDir });
      expect(emptyRoot.source).toBe('nearest');
      expect(emptyRoot.path).toBe(empty);

      const commented = createPointerDir('commented-config', '# store: team-context\n');
      const commentedRoot = await resolveOpenSpecRoot({ startPath: commented, globalDataDir });
      expect(commentedRoot.source).toBe('nearest');
      expect(commentedRoot.path).toBe(commented);
    });

    it('prefixes every taxonomy error with the declaration origin, fix unprefixed', async () => {
      const cases: Array<[string, string, () => Promise<unknown>]> = [];

      const unknownDir = createPointerDir('unknown-pointer', 'store: ghost-context\n');
      await registerStore('team-context');
      cases.push([
        'unknown_store',
        path.join(unknownDir, 'openspec', 'config.yaml'),
        () => resolveOpenSpecRoot({ startPath: unknownDir, globalDataDir }),
      ]);

      const invalidDir = createPointerDir('invalid-pointer', 'store: "BAD ID"\n');
      cases.push([
        'invalid_store_id',
        path.join(invalidDir, 'openspec', 'config.yaml'),
        () => resolveOpenSpecRoot({ startPath: invalidDir, globalDataDir }),
      ]);

      await registerStore('hollow-context', { healthyRoot: false });
      const unhealthyDir = createPointerDir('unhealthy-pointer', 'store: hollow-context\n');
      cases.push([
        'unhealthy_store_root',
        path.join(unhealthyDir, 'openspec', 'config.yaml'),
        () => resolveOpenSpecRoot({ startPath: unhealthyDir, globalDataDir }),
      ]);

      await registerStore('mismatched-context', { metadataId: 'someone-else' });
      const mismatchDir = createPointerDir('mismatch-pointer', 'store: mismatched-context\n');
      cases.push([
        'store_identity_mismatch',
        path.join(mismatchDir, 'openspec', 'config.yaml'),
        () => resolveOpenSpecRoot({ startPath: mismatchDir, globalDataDir }),
      ]);

      for (const [code, origin, run] of cases) {
        const error = await expectRootSelectionError(run(), code);
        expect(error.message).toContain(`Declared in ${origin}: `);
        expect(error.diagnostic.fix).not.toContain('Declared in');
      }
    });

    it('prefixes no_registered_stores when nothing is registered', async () => {
      const pointerDir = createPointerDir('lonely-pointer', 'store: team-context\n');

      const error = await expectRootSelectionError(
        resolveOpenSpecRoot({ startPath: pointerDir, globalDataDir }),
        'no_registered_stores'
      );
      expect(error.message).toContain('Declared in ');
    });

    it('resolves one hop only - a store with its own pointer is the destination', async () => {
      const storeRoot = await registerStore('team-context');
      fs.writeFileSync(
        path.join(storeRoot, 'openspec', 'config.yaml'),
        'schema: spec-driven\nstore: somewhere-else\n'
      );
      const pointerDir = createPointerDir('app-repo', 'store: team-context\n');

      const warnings: string[] = [];
      const original = console.error;
      console.error = (message: string) => warnings.push(String(message));
      try {
        const root = await resolveOpenSpecRoot({ startPath: pointerDir, globalDataDir });
        expect(root.path).toBe(storeRoot);
        expect(root.storeId).toBe('team-context');
      } finally {
        console.error = original;
      }
    });

    it('names a .yml origin when that file was read', async () => {
      const dir = mkdir('yml-pointer');
      fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'openspec', 'config.yml'), 'store: ghost\n');

      const error = await expectRootSelectionError(
        resolveOpenSpecRoot({ startPath: dir, globalDataDir }),
        'no_registered_stores'
      );
      expect(error.message).toContain(path.join(dir, 'openspec', 'config.yml'));
    });
  });

  it('skips openspec/ directories that are neither planning-shaped nor configured (the ~/openspec layout)', async () => {
    // The recommended store layout: $HOME/openspec/<store>. $HOME must
    // NOT become a nearest root for everything under the home tree.
    await registerStore('team-context');
    const fakeHome = path.join(tempDir, 'fake-home');
    fs.mkdirSync(path.join(fakeHome, 'openspec', 'team-context'), { recursive: true });
    const scratch = path.join(fakeHome, 'projects', 'scratch');
    fs.mkdirSync(scratch, { recursive: true });

    // No qualifying root anywhere: the registered-store hint fires (the
    // exact guidance the phantom $HOME root used to shadow). The
    // isolated globalDataDir keeps this off the machine's real registry.
    await expect(
      resolveOpenSpecRoot({ startPath: scratch, globalDataDir })
    ).rejects.toMatchObject({
      diagnostic: expect.objectContaining({ code: 'no_root_with_registered_stores' }),
    });
  });

});
