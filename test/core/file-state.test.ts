import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  acquireFileLock,
  releaseFileLock,
  writeFileAtomically,
} from '../../src/core/file-state.js';
import { updateStoreRegistryState } from '../../src/core/store/index.js';

describe('file-state', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-file-state-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function errorFor(
    kind: 'create-failed' | 'timeout',
    info: { lockPath: string; cause?: unknown }
  ): Error {
    return new Error(`${kind}:${info.lockPath}`);
  }

  // posix-only: these induce a lock-create failure via chmod(0o555), which
  // win32 ignores for directories, so the lock would succeed instead of
  // rejecting. The production error shapes are platform-agnostic.
  const itPosix = it.skipIf(process.platform === 'win32');

  describe('writeFileAtomically', () => {
    it('writes content and creates parent directories', async () => {
      const target = path.join(tempDir, 'nested', 'state.yaml');

      await writeFileAtomically(target, 'version: 1\n');

      expect(fs.readFileSync(target, 'utf-8')).toBe('version: 1\n');
    });

    it('leaves no temp file behind after a write', async () => {
      const target = path.join(tempDir, 'state.yaml');

      await writeFileAtomically(target, 'a\n');
      await writeFileAtomically(target, 'b\n');

      expect(fs.readFileSync(target, 'utf-8')).toBe('b\n');
      expect(fs.readdirSync(tempDir)).toEqual(['state.yaml']);
    });

    itPosix('creates private state files and tightens replaced file permissions', async () => {
      const target = path.join(tempDir, 'state.yaml');
      fs.writeFileSync(target, 'old\n', { mode: 0o666 });
      fs.chmodSync(target, 0o666);

      await writeFileAtomically(target, 'new\n');

      expect(fs.statSync(target).mode & 0o777).toBe(0o600);
    });
  });

  describe('acquireFileLock', () => {
    it('acquires and releases the lock file', async () => {
      const lockPath = path.join(tempDir, 'state.yaml.lock');

      const lock = await acquireFileLock({ lockPath, errorFor });
      expect(fs.existsSync(lockPath)).toBe(true);

      await releaseFileLock(lock, lockPath);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('does not let an old owner remove a replacement lock', async () => {
      const lockPath = path.join(tempDir, 'state.yaml.lock');
      const oldLock = await acquireFileLock({ lockPath, errorFor });

      // Model a stale owner whose lock was removed and replaced before its
      // delayed cleanup finally runs.
      await oldLock.close();
      fs.rmSync(lockPath);
      const replacementLock = await acquireFileLock({ lockPath, errorFor });
      const replacementToken = fs.readFileSync(lockPath, 'utf-8');

      await releaseFileLock(oldLock, lockPath);

      expect(fs.readFileSync(lockPath, 'utf-8')).toBe(replacementToken);
      await releaseFileLock(replacementLock, lockPath);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    itPosix('creates lock files with private permissions', async () => {
      const lockPath = path.join(tempDir, 'state.yaml.lock');

      const lock = await acquireFileLock({ lockPath, errorFor });

      expect(fs.statSync(lockPath).mode & 0o777).toBe(0o600);
      await releaseFileLock(lock, lockPath);
    });

    it('acquires a lock when the filesystem does not support fsync', async () => {
      const lockPath = path.join(tempDir, 'state.yaml.lock');
      const originalOpen = fs.promises.open.bind(fs.promises);
      const openSpy = vi.spyOn(fs.promises, 'open').mockImplementationOnce(async (...args) => {
        const handle = await originalOpen(...args);
        vi.spyOn(handle, 'sync').mockRejectedValueOnce(
          Object.assign(new Error('sync unsupported'), { code: 'ENOTSUP' })
        );
        return handle;
      });

      try {
        const lock = await acquireFileLock({ lockPath, errorFor });
        await releaseFileLock(lock, lockPath);
      } finally {
        openSpy.mockRestore();
      }

      expect(fs.existsSync(lockPath)).toBe(false);
    });

    itPosix('reports lock-create failures through the injected factory', async () => {
      // A directory at the lock path makes open(wx) fail with a
      // non-EEXIST-style conflict on every platform... except that a
      // directory yields EEXIST too; use an unwritable parent instead.
      const parent = path.join(tempDir, 'no-write');
      fs.mkdirSync(parent);
      fs.chmodSync(parent, 0o555);
      const lockPath = path.join(parent, 'state.yaml.lock');

      try {
        await expect(
          acquireFileLock({ lockPath, errorFor })
        ).rejects.toThrowError(`create-failed:${lockPath}`);
      } finally {
        fs.chmodSync(parent, 0o755);
      }
    });
  });

  describe('store registry delegation (byte-identical error shapes)', () => {
    it('reports an aged contended lock as busy instead of racing to steal it', async () => {
      const globalDataDir = path.join(tempDir, 'data');
      const registryPath = path.join(
        globalDataDir,
        'stores',
        'registry.yaml'
      );
      const lockPath = `${registryPath}.lock`;
      fs.mkdirSync(path.dirname(registryPath), { recursive: true });
      fs.writeFileSync(lockPath, '');
      const staleTime = new Date(Date.now() - 60_000);
      fs.utimesSync(lockPath, staleTime, staleTime);

      const started = Date.now();
      try {
        await expect(
          updateStoreRegistryState((state) => state ?? { version: 1, stores: {} }, {
            globalDataDir,
          })
        ).rejects.toMatchObject({
          message: 'Store registry is busy.',
          diagnostic: {
            severity: 'error',
            code: 'store_registry_busy',
            message: 'Store registry is busy.',
            target: 'store.registry',
            fix: `Retry shortly; if this persists, delete the stale lock file ${lockPath}.`,
          },
        });
        expect(Date.now() - started).toBeGreaterThanOrEqual(4900);
      } finally {
        fs.rmSync(lockPath, { force: true });
      }
    }, 15_000);

    itPosix('reports lock-create failure with the permissions fix', async () => {
      const globalDataDir = path.join(tempDir, 'data');
      const storesDir = path.join(globalDataDir, 'stores');
      const registryPath = path.join(storesDir, 'registry.yaml');
      const lockPath = `${registryPath}.lock`;
      fs.mkdirSync(storesDir, { recursive: true });
      fs.chmodSync(storesDir, 0o555);

      try {
        await expect(
          updateStoreRegistryState((state) => state ?? { version: 1, stores: {} }, {
            globalDataDir,
          })
        ).rejects.toMatchObject({
          message: `Cannot create the registry lock file ${lockPath} (EACCES).`,
          diagnostic: {
            code: 'store_registry_busy',
            target: 'store.registry',
            fix: `Check permissions on ${path.dirname(lockPath)}.`,
          },
        });
      } finally {
        fs.chmodSync(storesDir, 0o755);
      }
    });
  });
});
