import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { FileSystemUtils } from '../utils/file-system.js';
import { StoreError } from './store/errors.js';

const fs = nodeFs.promises;

/**
 * Shared machine-local state-file mechanics (extracted from the store
 * registry in slice 7.1, its second consumer). Callers own the
 * diagnostic data (code, target, wording); the factory owns the
 * shared mechanics - the fix strings describe the lock's own
 * behavior (stale-steal, creation), so their templates live here.
 */

export type FileLockErrorKind = 'create-failed' | 'timeout';

export interface FileLockErrorInfo {
  lockPath: string;
  /** The original errno error for 'create-failed'. */
  cause?: unknown;
}

export interface FileLockOptions {
  lockPath: string;
  errorFor: (kind: FileLockErrorKind, info: FileLockErrorInfo) => Error;
}

export interface LockErrorData {
  /** Noun phrase for the create-failed message, e.g. "the registry lock file". */
  createSubject: string;
  /** The full timeout message, e.g. "Store registry is busy." */
  busyMessage: string;
  code: string;
  target: string;
}

/** One template for lock diagnostics; callers supply the data. */
export function makeLockErrorFactory(
  data: LockErrorData
): (kind: FileLockErrorKind, info: FileLockErrorInfo) => StoreError {
  return (kind, info) => {
    if (kind === 'create-failed') {
      // A permission or filesystem problem, not contention - say so.
      return new StoreError(
        `Cannot create ${data.createSubject} ${info.lockPath} (${(info.cause as NodeJS.ErrnoException)?.code ?? info.cause}).`,
        data.code,
        {
          target: data.target,
          fix: `Check permissions on ${path.dirname(info.lockPath)}.`,
        }
      );
    }

    return new StoreError(data.busyMessage, data.code, {
      target: data.target,
      fix: `Retry shortly; if this persists, delete the stale lock file ${info.lockPath}.`,
    });
  };
}

const STALE_LOCK_THRESHOLD_MS = 30_000;
const LOCK_DEADLINE_MS = 5000;
const LOCK_POLL_MS = 25;

export function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

export async function pathIsFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

// Deliberately not FileSystemUtils.directoryExists: that variant
// debug-logs non-ENOENT failures, which is noise inside prompt
// validators, and pathIsFile has no FileSystemUtils equivalent - the
// silent symmetric pair lives here.
export async function pathIsDirectory(dirPath: string): Promise<boolean> {
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function writeFileAtomically(
  filePath: string,
  content: string
): Promise<void> {
  const dirPath = path.dirname(filePath);
  await FileSystemUtils.createDirectory(dirPath);
  const tempPath = path.join(
    dirPath,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function acquireFileLock(
  options: FileLockOptions
): Promise<nodeFs.promises.FileHandle> {
  const { lockPath, errorFor } = options;
  const lockDir = path.dirname(lockPath);
  await FileSystemUtils.createDirectory(lockDir);
  if (!(await FileSystemUtils.canWriteFile(lockDir))) {
    throw errorFor('create-failed', { lockPath, cause: 'EACCES' });
  }
  const deadline = Date.now() + LOCK_DEADLINE_MS;

  while (true) {
    try {
      return await fs.open(lockPath, 'wx');
    } catch (error) {
      if (!isNodeErrorCode(error, 'EEXIST')) {
        // A permission or filesystem problem, not contention - say so.
        throw errorFor('create-failed', { lockPath, cause: error });
      }

      // A crashed process leaves the lock behind forever; state-file
      // writes are sub-second, so an old lock is an orphan - steal it.
      let staleStolen = false;
      try {
        const lockStat = await fs.stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > STALE_LOCK_THRESHOLD_MS) {
          await fs.rm(lockPath, { force: true });
          staleStolen = true;
        }
      } catch {
        // The holder released between open and stat - retry, but stay
        // bounded: a persistently failing stat (EPERM, delete-pending)
        // must hit the deadline instead of spinning forever.
      }

      if (!staleStolen) {
        if (Date.now() >= deadline) {
          throw errorFor('timeout', { lockPath });
        }
        await sleep(LOCK_POLL_MS);
      }
    }
  }
}

export async function releaseFileLock(
  lock: nodeFs.promises.FileHandle,
  lockPath: string
): Promise<void> {
  await lock.close().catch(() => undefined);
  await fs.rm(lockPath, { force: true }).catch(() => undefined);
}
