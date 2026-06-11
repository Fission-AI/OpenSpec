import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { FileSystemUtils } from '../utils/file-system.js';

const fs = nodeFs.promises;

/**
 * Shared machine-local state-file mechanics (extracted from the store
 * registry in slice 7.1, its second consumer). The error surface stays
 * with each caller: the lock reports failures through an injected
 * factory so every state file keeps its own diagnostic codes and fix
 * strings.
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

const STALE_LOCK_THRESHOLD_MS = 30_000;
const LOCK_DEADLINE_MS = 5000;
const LOCK_POLL_MS = 25;

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
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
  await FileSystemUtils.createDirectory(path.dirname(lockPath));
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
      try {
        const lockStat = await fs.stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > STALE_LOCK_THRESHOLD_MS) {
          await fs.rm(lockPath, { force: true });
          continue;
        }
      } catch {
        continue; // The holder released between open and stat - retry.
      }

      if (Date.now() >= deadline) {
        throw errorFor('timeout', { lockPath });
      }

      await sleep(LOCK_POLL_MS);
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
