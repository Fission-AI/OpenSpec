import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir } from '../../../src/core/global-config.js';
import {
  STORE_METADATA_DIR_NAME,
  STORE_METADATA_FILE_NAME,
  STORE_REGISTRY_FILE_NAME,
  STORES_DIR_NAME,
  getStoreMetadataDir,
  getStoreMetadataPath,
  getStoreRegistryPath,
  getStoresDir,
  isStoreRoot,
  isValidStoreId,
  listStoreRegistryEntries,
  parseStoreMetadataState,
  parseStoreRegistryState,
  readStoreMetadataState,
  readStoreRegistryState,
  readOptionalStoreMetadataState,
  resolveGitStoreBackendConfig,
  serializeStoreMetadataState,
  serializeStoreRegistryState,
  validateStoreId,
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../../src/core/store/index.js';

describe('store foundation', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-foundation-'));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function expectedExistingPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function expectSameExistingPath(actualPath: string, expectedPath: string): void {
    expect(fs.realpathSync.native(actualPath)).toBe(expectedExistingPath(expectedPath));
  }

  describe('path helpers', () => {
    it('exposes store constants', () => {
      expect(STORE_METADATA_DIR_NAME).toBe('.openspec-store');
      expect(STORE_METADATA_FILE_NAME).toBe('store.yaml');
      expect(STORES_DIR_NAME).toBe('stores');
      expect(STORE_REGISTRY_FILE_NAME).toBe('registry.yaml');
    });

    it('returns registry and metadata paths', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const storeRoot = path.join(tempDir, 'acme-context');

      expect(getStoresDir()).toBe(path.join(tempDir, 'openspec', 'stores'));
      expect(getStoreRegistryPath()).toBe(
        path.join(tempDir, 'openspec', 'stores', 'registry.yaml')
      );
      expect(getStoreMetadataDir(storeRoot)).toBe(
        path.join(storeRoot, '.openspec-store')
      );
      expect(getStoreMetadataPath(storeRoot)).toBe(
        path.join(storeRoot, '.openspec-store', 'store.yaml')
      );
    });

    it('uses global data dir options for registry locations', () => {
      const dataDir = getGlobalDataDir({
        env: {},
        platform: 'linux',
        homedir: '/home/tabish',
      });

      expect(getStoresDir({ globalDataDir: dataDir })).toBe(
        '/home/tabish/.local/share/openspec/stores'
      );
      expect(getStoreRegistryPath({ globalDataDir: dataDir })).toBe(
        '/home/tabish/.local/share/openspec/stores/registry.yaml'
      );
    });

    it('preserves Windows-style store root strings when building metadata paths', () => {
      expect(getStoreMetadataPath('D:\\repos\\acme-context')).toBe(
        'D:\\repos\\acme-context\\.openspec-store\\store.yaml'
      );
    });
  });

  describe('id validation', () => {
    it('accepts kebab-case store ids', () => {
      expect(validateStoreId('acme')).toBe('acme');
      expect(isValidStoreId('acme-context')).toBe(true);
      expect(isValidStoreId('context2')).toBe(true);
    });

    it('rejects ids that are not safe kebab-case folder names', () => {
      for (const invalidId of [
        '',
        '.',
        '..',
        'bad/name',
        'bad\\name',
        'Acme',
        'acme_context',
        'acme.context',
        'acme context',
        '-acme',
        'acme-',
        'acme--context',
      ]) {
        expect(isValidStoreId(invalidId)).toBe(false);
      }
    });
  });

  describe('registry parsing and serialization', () => {
    it('parses and serializes a strict Git/local store registry', () => {
      const registry = parseStoreRegistryState(`version: 1
stores:
  zeta-context:
    backend:
      type: git
      local_path: /repos/zeta-context
  acme-context:
    backend:
      type: git
      local_path: /repos/acme-context
      remote: git@github.com:acme/context.git
      branch: main
`);

      expect(registry.stores['acme-context'].backend).toEqual({
        type: 'git',
        local_path: '/repos/acme-context',
        remote: 'git@github.com:acme/context.git',
        branch: 'main',
      });
      expect(listStoreRegistryEntries(registry).map((entry) => entry.id)).toEqual([
        'acme-context',
        'zeta-context',
      ]);
      expect(parseStoreRegistryState(serializeStoreRegistryState(registry))).toEqual(
        registry
      );
    });

    it('rejects invalid registry structure and ids', () => {
      expect(() =>
        parseStoreRegistryState(`version: 2
stores: {}
`)
      ).toThrow(/Invalid store registry state/u);

      expect(() =>
        parseStoreRegistryState(`version: 1
stores:
  Acme:
    backend:
      type: git
      local_path: /repos/acme
`)
      ).toThrow(/Invalid store id/u);

      expect(() =>
        parseStoreRegistryState(`version: 1
stores:
  acme:
    backend:
      type: memory
      local_path: /repos/acme
`)
      ).toThrow(/Invalid store registry state/u);

      expect(() =>
        parseStoreRegistryState(`version: 1
stores:
  acme:
    backend:
      type: git
      local_path: ""
`)
      ).toThrow(/Invalid store registry state/u);
    });

    it('rejects unknown registry fields', () => {
      expect(() =>
        parseStoreRegistryState(`version: 1
stores: {}
extra: true
`)
      ).toThrow(/Invalid store registry state/u);

      expect(() =>
        parseStoreRegistryState(`version: 1
stores:
  acme:
    backend:
      type: git
      local_path: /repos/acme
      depth: 1
`)
      ).toThrow(/Invalid store registry state/u);
    });
  });

  describe('metadata parsing and serialization', () => {
    it('parses and serializes portable store metadata', () => {
      const metadata = parseStoreMetadataState(`version: 1
id: acme-context
`);

      expect(metadata).toEqual({
        version: 1,
        id: 'acme-context',
      });
      expect(parseStoreMetadataState(serializeStoreMetadataState(metadata))).toEqual(
        metadata
      );
    });

    it('rejects invalid metadata state', () => {
      expect(() =>
        parseStoreMetadataState(`version: 1
id: Acme
`)
      ).toThrow(/Store id must be kebab-case/u);

      expect(() =>
        parseStoreMetadataState(`version: 1
id: acme
local_path: /repos/acme
`)
      ).toThrow(/Invalid store metadata state/u);
    });
  });

  describe('registry IO', () => {
    it('returns null for a missing local registry', async () => {
      await expect(readStoreRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
    });

    it('writes and reads the machine-local registry', async () => {
      const registry = {
        version: 1 as const,
        stores: {
          'acme-context': {
            backend: {
              type: 'git' as const,
              local_path: path.join(tempDir, 'acme-context'),
              remote: 'git@github.com:acme/context.git',
            },
          },
        },
      };

      await writeStoreRegistryState(registry, { globalDataDir: tempDir });

      expect(fs.existsSync(getStoreRegistryPath({ globalDataDir: tempDir }))).toBe(true);
      await expect(readStoreRegistryState({ globalDataDir: tempDir })).resolves.toEqual(
        registry
      );
    });
  });

  describe('store metadata IO', () => {
    it('writes and reads portable metadata inside the store root', async () => {
      const storeRoot = path.join(tempDir, 'acme-context');

      await expect(isStoreRoot(storeRoot)).resolves.toBe(false);
      await writeStoreMetadataState(storeRoot, {
        version: 1,
        id: 'acme-context',
      });

      await expect(isStoreRoot(storeRoot)).resolves.toBe(true);
      await expect(readStoreMetadataState(storeRoot)).resolves.toEqual({
        version: 1,
        id: 'acme-context',
      });
      await expect(readOptionalStoreMetadataState(storeRoot)).resolves.toEqual({
        version: 1,
        id: 'acme-context',
      });
    });

    it('returns null only when optional metadata is missing', async () => {
      const storeRoot = path.join(tempDir, 'missing-store');

      await expect(readOptionalStoreMetadataState(storeRoot)).resolves.toBeNull();

      fs.mkdirSync(path.dirname(getStoreMetadataPath(storeRoot)), { recursive: true });
      fs.writeFileSync(getStoreMetadataPath(storeRoot), 'version: nope\n');

      await expect(readOptionalStoreMetadataState(storeRoot)).rejects.toThrow(
        /Invalid store metadata state/u
      );
    });
  });

  describe('Git/local backend config', () => {
    it('resolves an existing local checkout path without creating or managing it', async () => {
      const storesDir = path.join(tempDir, 'stores');
      const localPath = path.join(storesDir, 'acme-context');
      fs.mkdirSync(localPath, { recursive: true });

      const backend = await resolveGitStoreBackendConfig(
        {
          localPath: 'acme-context',
          remote: 'git@github.com:acme/context.git',
          branch: 'main',
        },
        storesDir
      );

      expect(backend).toEqual({
        type: 'git',
        local_path: expect.any(String),
        remote: 'git@github.com:acme/context.git',
        branch: 'main',
      });
      expectSameExistingPath(backend.local_path, localPath);
      expect(fs.readdirSync(localPath)).toEqual([]);
    });

    it('rejects missing paths and empty optional Git config values', async () => {
      await expect(
        resolveGitStoreBackendConfig({ localPath: '' }, tempDir)
      ).rejects.toThrow(/must not be empty/u);

      await expect(
        resolveGitStoreBackendConfig({ localPath: 'missing' }, tempDir)
      ).rejects.toThrow(/does not exist/u);

      const localPath = path.join(tempDir, 'acme-context');
      fs.mkdirSync(localPath, { recursive: true });

      await expect(
        resolveGitStoreBackendConfig({ localPath, remote: '' }, tempDir)
      ).rejects.toThrow(/remote must not be empty/u);

      await expect(
        resolveGitStoreBackendConfig({ localPath, branch: '' }, tempDir)
      ).rejects.toThrow(/branch must not be empty/u);
    });
  });
});
