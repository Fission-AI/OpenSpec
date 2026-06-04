import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir } from '../../../src/core/global-config.js';
import {
  CONTEXT_STORE_METADATA_DIR_NAME,
  CONTEXT_STORE_METADATA_FILE_NAME,
  CONTEXT_STORE_REGISTRY_FILE_NAME,
  CONTEXT_STORES_DIR_NAME,
  getContextStoreMetadataDir,
  getContextStoreMetadataPath,
  getContextStoreRegistryPath,
  getContextStoresDir,
  getDefaultContextStoreRoot,
  isContextStoreRoot,
  isValidContextStoreId,
  listContextStoreRegistryEntries,
  parseContextStoreMetadataState,
  parseContextStoreRegistryState,
  readContextStoreMetadataState,
  readContextStoreRegistryState,
  readOptionalContextStoreMetadataState,
  resolveGitContextStoreBackendConfig,
  serializeContextStoreMetadataState,
  serializeContextStoreRegistryState,
  validateContextStoreId,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
} from '../../../src/core/context-store/index.js';

describe('context store foundation', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-context-store-foundation-'));
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
    it('exposes context store constants', () => {
      expect(CONTEXT_STORE_METADATA_DIR_NAME).toBe('.openspec-store');
      expect(CONTEXT_STORE_METADATA_FILE_NAME).toBe('store.yaml');
      expect(CONTEXT_STORES_DIR_NAME).toBe('context-stores');
      expect(CONTEXT_STORE_REGISTRY_FILE_NAME).toBe('registry.yaml');
    });

    it('returns registry and metadata paths', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const storeRoot = path.join(tempDir, 'acme-context');

      expect(getContextStoresDir()).toBe(path.join(tempDir, 'openspec', 'context-stores'));
      expect(getContextStoreRegistryPath()).toBe(
        path.join(tempDir, 'openspec', 'context-stores', 'registry.yaml')
      );
      expect(getDefaultContextStoreRoot('acme-context')).toBe(
        path.join(tempDir, 'openspec', 'context-stores', 'acme-context')
      );
      expect(getContextStoreMetadataDir(storeRoot)).toBe(
        path.join(storeRoot, '.openspec-store')
      );
      expect(getContextStoreMetadataPath(storeRoot)).toBe(
        path.join(storeRoot, '.openspec-store', 'store.yaml')
      );
    });

    it('uses global data dir options for registry locations', () => {
      const dataDir = getGlobalDataDir({
        env: {},
        platform: 'linux',
        homedir: '/home/tabish',
      });

      expect(getContextStoresDir({ globalDataDir: dataDir })).toBe(
        '/home/tabish/.local/share/openspec/context-stores'
      );
      expect(getContextStoreRegistryPath({ globalDataDir: dataDir })).toBe(
        '/home/tabish/.local/share/openspec/context-stores/registry.yaml'
      );
      expect(getDefaultContextStoreRoot('team-context', { globalDataDir: dataDir })).toBe(
        '/home/tabish/.local/share/openspec/context-stores/team-context'
      );
    });

    it('preserves Windows-style store root strings when building metadata paths', () => {
      expect(getContextStoreMetadataPath('D:\\repos\\acme-context')).toBe(
        'D:\\repos\\acme-context\\.openspec-store\\store.yaml'
      );
    });
  });

  describe('id validation', () => {
    it('accepts kebab-case context store ids', () => {
      expect(validateContextStoreId('acme')).toBe('acme');
      expect(isValidContextStoreId('acme-context')).toBe(true);
      expect(isValidContextStoreId('context2')).toBe(true);
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
        expect(isValidContextStoreId(invalidId)).toBe(false);
      }
    });
  });

  describe('registry parsing and serialization', () => {
    it('parses and serializes a strict Git/local context store registry', () => {
      const registry = parseContextStoreRegistryState(`version: 1
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
      expect(listContextStoreRegistryEntries(registry).map((entry) => entry.id)).toEqual([
        'acme-context',
        'zeta-context',
      ]);
      expect(parseContextStoreRegistryState(serializeContextStoreRegistryState(registry))).toEqual(
        registry
      );
    });

    it('rejects invalid registry structure and ids', () => {
      expect(() =>
        parseContextStoreRegistryState(`version: 2
stores: {}
`)
      ).toThrow(/Invalid context store registry state/u);

      expect(() =>
        parseContextStoreRegistryState(`version: 1
stores:
  Acme:
    backend:
      type: git
      local_path: /repos/acme
`)
      ).toThrow(/Invalid context store id/u);

      expect(() =>
        parseContextStoreRegistryState(`version: 1
stores:
  acme:
    backend:
      type: memory
      local_path: /repos/acme
`)
      ).toThrow(/Invalid context store registry state/u);

      expect(() =>
        parseContextStoreRegistryState(`version: 1
stores:
  acme:
    backend:
      type: git
      local_path: ""
`)
      ).toThrow(/Invalid context store registry state/u);
    });

    it('rejects unknown registry fields', () => {
      expect(() =>
        parseContextStoreRegistryState(`version: 1
stores: {}
extra: true
`)
      ).toThrow(/Invalid context store registry state/u);

      expect(() =>
        parseContextStoreRegistryState(`version: 1
stores:
  acme:
    backend:
      type: git
      local_path: /repos/acme
      depth: 1
`)
      ).toThrow(/Invalid context store registry state/u);
    });
  });

  describe('metadata parsing and serialization', () => {
    it('parses and serializes portable store metadata', () => {
      const metadata = parseContextStoreMetadataState(`version: 1
id: acme-context
`);

      expect(metadata).toEqual({
        version: 1,
        id: 'acme-context',
      });
      expect(parseContextStoreMetadataState(serializeContextStoreMetadataState(metadata))).toEqual(
        metadata
      );
    });

    it('rejects invalid metadata state', () => {
      expect(() =>
        parseContextStoreMetadataState(`version: 1
id: Acme
`)
      ).toThrow(/Context store id must be kebab-case/u);

      expect(() =>
        parseContextStoreMetadataState(`version: 1
id: acme
local_path: /repos/acme
`)
      ).toThrow(/Invalid context store metadata state/u);
    });
  });

  describe('registry IO', () => {
    it('returns null for a missing local registry', async () => {
      await expect(readContextStoreRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
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

      await writeContextStoreRegistryState(registry, { globalDataDir: tempDir });

      expect(fs.existsSync(getContextStoreRegistryPath({ globalDataDir: tempDir }))).toBe(true);
      await expect(readContextStoreRegistryState({ globalDataDir: tempDir })).resolves.toEqual(
        registry
      );
    });
  });

  describe('store metadata IO', () => {
    it('writes and reads portable metadata inside the store root', async () => {
      const storeRoot = path.join(tempDir, 'acme-context');

      await expect(isContextStoreRoot(storeRoot)).resolves.toBe(false);
      await writeContextStoreMetadataState(storeRoot, {
        version: 1,
        id: 'acme-context',
      });

      await expect(isContextStoreRoot(storeRoot)).resolves.toBe(true);
      await expect(readContextStoreMetadataState(storeRoot)).resolves.toEqual({
        version: 1,
        id: 'acme-context',
      });
      await expect(readOptionalContextStoreMetadataState(storeRoot)).resolves.toEqual({
        version: 1,
        id: 'acme-context',
      });
    });

    it('returns null only when optional metadata is missing', async () => {
      const storeRoot = path.join(tempDir, 'missing-store');

      await expect(readOptionalContextStoreMetadataState(storeRoot)).resolves.toBeNull();

      fs.mkdirSync(path.dirname(getContextStoreMetadataPath(storeRoot)), { recursive: true });
      fs.writeFileSync(getContextStoreMetadataPath(storeRoot), 'version: nope\n');

      await expect(readOptionalContextStoreMetadataState(storeRoot)).rejects.toThrow(
        /Invalid context store metadata state/u
      );
    });
  });

  describe('Git/local backend config', () => {
    it('resolves an existing local checkout path without creating or managing it', async () => {
      const storesDir = path.join(tempDir, 'stores');
      const localPath = path.join(storesDir, 'acme-context');
      fs.mkdirSync(localPath, { recursive: true });

      const backend = await resolveGitContextStoreBackendConfig(
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
        resolveGitContextStoreBackendConfig({ localPath: '' }, tempDir)
      ).rejects.toThrow(/must not be empty/u);

      await expect(
        resolveGitContextStoreBackendConfig({ localPath: 'missing' }, tempDir)
      ).rejects.toThrow(/does not exist/u);

      const localPath = path.join(tempDir, 'acme-context');
      fs.mkdirSync(localPath, { recursive: true });

      await expect(
        resolveGitContextStoreBackendConfig({ localPath, remote: '' }, tempDir)
      ).rejects.toThrow(/remote must not be empty/u);

      await expect(
        resolveGitContextStoreBackendConfig({ localPath, branch: '' }, tempDir)
      ).rejects.toThrow(/branch must not be empty/u);
    });
  });
});
