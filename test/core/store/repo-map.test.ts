import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  parseStoreRegistryState,
  serializeStoreRegistryState,
  readStoreRegistryState,
} from '../../../src/core/store/foundation.js';
import {
  listRepoEntries,
  registerRepo,
  registerStore,
  unregisterRepo,
  unregisterStoreRegistration,
} from '../../../src/core/store/registry.js';
import { StoreError } from '../../../src/core/store/errors.js';
import { createOpenSpecRoot } from '../../helpers/openspec-fixtures.js';

describe('repo map (3.5)', () => {
  let tempDir: string;
  let globalDataDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-repo-map-'))
    );
    globalDataDir = path.join(tempDir, 'data');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async function makeStore(id: string): Promise<string> {
    const root = mkdir(`stores/${id}`);
    createOpenSpecRoot(root);
    await registerStore({ id, localPath: root, globalDataDir });
    return root;
  }

  describe('foundation round-trip', () => {
    it('parses and serializes registries with and without the repos section', () => {
      const without = 'version: 1\nstores: {}\n';
      const parsedWithout = parseStoreRegistryState(without);
      expect(parsedWithout.repos).toBeUndefined();
      // Repos-less serialization is byte-identical to the pre-3.5 form.
      expect(serializeStoreRegistryState(parsedWithout)).toBe(without);

      const withRepos =
        'version: 1\nstores: {}\nrepos:\n  api-server:\n    local_path: /src/api\n';
      const parsed = parseStoreRegistryState(withRepos);
      expect(parsed.repos).toEqual({ 'api-server': { local_path: '/src/api' } });
      expect(serializeStoreRegistryState(parsed)).toBe(withRepos);
    });

    it('rejects a hand-edited registry with one id in both sections', () => {
      expect(() =>
        parseStoreRegistryState(
          'version: 1\nstores:\n  api:\n    backend:\n      type: git\n      local_path: /a\nrepos:\n  api:\n    local_path: /b\n'
        )
      ).toThrow(/both sections/);
    });

    it('rejects unknown keys and invalid repo ids', () => {
      expect(() => parseStoreRegistryState('version: 1\nstores: {}\nextra: true\n')).toThrow();
      expect(() =>
        parseStoreRegistryState('version: 1\nstores: {}\nrepos:\n  "BAD ID":\n    local_path: /x\n')
      ).toThrow(/repo id/);
      expect(() =>
        parseStoreRegistryState('version: 1\nstores: {}\nrepos:\n  api:\n    local_path: /x\n    extra: 1\n')
      ).toThrow();
    });
  });

  describe('preservation matrix', () => {
    it('store writes preserve the repos section byte-identically', async () => {
      const repoDir = mkdir('src/api-server');
      await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });
      const before = (await readStoreRegistryState({ globalDataDir }))?.repos;

      // store register
      await makeStore('team-context');
      expect((await readStoreRegistryState({ globalDataDir }))?.repos).toEqual(before);

      // store unregister
      await unregisterStoreRegistration({ id: 'team-context', globalDataDir });
      expect((await readStoreRegistryState({ globalDataDir }))?.repos).toEqual(before);
    });

    it('repo writes preserve the stores section', async () => {
      await makeStore('team-context');
      const before = (await readStoreRegistryState({ globalDataDir }))?.stores;

      const repoDir = mkdir('src/api-server');
      await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });
      expect((await readStoreRegistryState({ globalDataDir }))?.stores).toEqual(before);

      await unregisterRepo('api-server', { globalDataDir });
      expect((await readStoreRegistryState({ globalDataDir }))?.stores).toEqual(before);
      // Empty repos section is omitted again after the last unregister.
      expect((await readStoreRegistryState({ globalDataDir }))?.repos).toBeUndefined();
    });
  });

  describe('conflicts', () => {
    it('rejects cross-section id and path claims in both directions', async () => {
      const storeRoot = await makeStore('team-context');
      const repoDir = mkdir('src/api-server');
      await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });

      // repo write, id held by store
      await expect(
        registerRepo({ id: 'team-context', path: mkdir('src/other'), globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'repo_id_claimed_by_store' } });

      // repo write, path held by store
      await expect(
        registerRepo({ id: 'fresh-id', path: storeRoot, globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'repo_path_claimed_by_store' } });

      // store write, id held by repo
      const claimedRoot = mkdir('stores/api-server');
      createOpenSpecRoot(claimedRoot);
      await expect(
        registerStore({ id: 'api-server', localPath: claimedRoot, globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'store_id_claimed_by_repo' } });

      // store write, path held by repo
      createOpenSpecRoot(repoDir);
      await expect(
        registerStore({ id: 'fresh-store', localPath: repoDir, globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'store_path_claimed_by_repo' } });
    });

    it('rejects in-section repo conflicts and accepts the rerun no-op', async () => {
      const repoDir = mkdir('src/api-server');
      const first = await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });
      expect(first.alreadyRegistered).toBe(false);

      const rerun = await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });
      expect(rerun.alreadyRegistered).toBe(true);

      await expect(
        registerRepo({ id: 'api-server', path: mkdir('src/elsewhere'), globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'repo_id_conflict' } });

      await expect(
        registerRepo({ id: 'second-id', path: repoDir, globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'repo_path_conflict' } });
    });

    it('the library API enforces its own invariants (typed input errors)', async () => {
      await expect(
        registerRepo({ id: 'Bad_Id', path: tempDir, globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'invalid_repo_id' } });
      await expect(
        registerRepo({ id: 'fine-id', path: path.join(tempDir, 'nope'), globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'repo_path_missing' } });
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'x');
      await expect(
        registerRepo({ id: 'fine-id', path: filePath, globalDataDir })
      ).rejects.toMatchObject({ diagnostic: { code: 'repo_path_not_directory' } });
      await expect(unregisterRepo('Bad_Id', { globalDataDir })).rejects.toMatchObject({
        diagnostic: { code: 'invalid_repo_id' },
      });
    });

    it('no-op reruns never rewrite the registry file', async () => {
      const repoDir = mkdir('src/api-server');
      await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });
      const registryPath = path.join(globalDataDir, 'stores', 'registry.yaml');
      const before = fs.statSync(registryPath).mtimeMs;
      const content = fs.readFileSync(registryPath, 'utf-8');

      await new Promise((resolve) => setTimeout(resolve, 10));
      const rerun = await registerRepo({ id: 'api-server', path: repoDir, globalDataDir });
      expect(rerun.alreadyRegistered).toBe(true);
      expect(fs.statSync(registryPath).mtimeMs).toBe(before);
      expect(fs.readFileSync(registryPath, 'utf-8')).toBe(content);
    });

    it('unregister of an unknown repo fails repo_not_found', async () => {
      await expect(unregisterRepo('ghost', { globalDataDir })).rejects.toMatchObject({
        diagnostic: { code: 'repo_not_found' },
      });
      await expect(unregisterRepo('ghost', { globalDataDir })).rejects.toBeInstanceOf(StoreError);
    });
  });

  describe('lookups', () => {

    it('listRepoEntries sorts by id', async () => {
      await registerRepo({ id: 'web-app', path: mkdir('src/web'), globalDataDir });
      await registerRepo({ id: 'api-server', path: mkdir('src/api'), globalDataDir });
      const registry = await readStoreRegistryState({ globalDataDir });
      expect(listRepoEntries(registry).map((entry) => entry.id)).toEqual([
        'api-server',
        'web-app',
      ]);
    });
  });
});
