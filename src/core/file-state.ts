import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileSystemUtils } from '../utils/file-system.js';
import { StoreError } from './store/errors.js';

const fs = nodeFs.promises;

/**
 * 共享的机器本地状态文件机制（从 slice 7.1 中的 store
 * 注册表提取，是其第二个使用者）。调用方拥有
 * 诊断数据（代码、目标、措辞）；工厂拥有
 * 共享机制 - 修复字符串描述锁本身的
 * 行为（过期-窃取、创建），因此它们的模板位于此处。
 */

export type FileLockErrorKind = 'create-failed' | 'timeout';

export interface FileLockErrorInfo {
  lockPath: string;
  /** 'create-failed' 的原始 errno 错误。 */
  cause?: unknown;
}

export interface FileLockOptions {
  lockPath: string;
  errorFor: (kind: FileLockErrorKind, info: FileLockErrorInfo) => Error;
}

export interface LockErrorData {
  /** create-failed 消息的名词短语，例如"注册表锁文件"。 */
  createSubject: string;
  /** 完整的超时消息，例如"Store 注册表正忙。" */
  busyMessage: string;
  code: string;
  target: string;
}

/** 锁诊断的一个模板；调用方提供数据。 */
export function makeLockErrorFactory(
  data: LockErrorData
): (kind: FileLockErrorKind, info: FileLockErrorInfo) => StoreError {
  return (kind, info) => {
    if (kind === 'create-failed') {
      // 权限或文件系统问题，不是竞争 - 说明原因。
      return new StoreError(
        `无法创建 ${data.createSubject} ${info.lockPath} (${(info.cause as NodeJS.ErrnoException)?.code ?? info.cause})。`,
        data.code,
        {
          target: data.target,
          fix: `检查 ${path.dirname(info.lockPath)} 上的权限。`,
        }
      );
    }

    return new StoreError(data.busyMessage, data.code, {
      target: data.target,
      fix: `稍后重试；如果持续存在，删除过期的锁文件 ${info.lockPath}。`,
    });
  };
}

const LOCK_DEADLINE_MS = 5000;
const LOCK_POLL_MS = 25;
const PRIVATE_FILE_MODE = 0o600;
const lockOwnership = new WeakMap<nodeFs.promises.FileHandle, string>();

function isUnsupportedSyncError(error: unknown): boolean {
  return (
    isNodeErrorCode(error, 'EINVAL') ||
    isNodeErrorCode(error, 'ENOTSUP') ||
    isNodeErrorCode(error, 'ENOSYS')
  );
}

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

// 故意不使用 FileSystemUtils.directoryExists：那个变体
// 会对非 ENOENT 失败进行调试日志记录，这在 prompt
// 验证器中是噪音，pathIsFile 没有 FileSystemUtils 等效方法 -
// 静默的对称对存在于此。
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
    await fs.writeFile(tempPath, content, {
      encoding: 'utf-8',
      mode: PRIVATE_FILE_MODE,
    });
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
      const lock = await fs.open(lockPath, 'wx', PRIVATE_FILE_MODE);
      const ownershipToken = `${process.pid}:${randomUUID()}`;
      try {
        await lock.writeFile(ownershipToken, 'utf-8');
        try {
          await lock.sync();
        } catch (error) {
          // 一些 FUSE 和网络文件系统支持排他锁文件，但
          // 明确不实现 fsync。该 token 对
          // 协作进程仍然可见，因此不要让这些项目变得不可用。
          if (!isUnsupportedSyncError(error)) {
            throw error;
          }
        }
      } catch (error) {
        await lock.close().catch(() => undefined);
        await fs.rm(lockPath, { force: true }).catch(() => undefined);
        throw error;
      }
      lockOwnership.set(lock, ownershipToken);
      return lock;
    } catch (error) {
      if (!isNodeErrorCode(error, 'EEXIST')) {
        // 权限或文件系统问题，不是竞争 - 说明原因。
        throw errorFor('create-failed', { lockPath, cause: error });
      }

      // 永远不要按年龄窃取：取消链接一个被认为过期的路径可能会与其替换项竞争
      // 并清除存活所有者的锁。超时诊断
      // 为真正孤立的锁提供了明确的恢复路径。
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
  const ownershipToken = lockOwnership.get(lock);
  lockOwnership.delete(lock);
  await lock.close().catch(() => undefined);

  if (ownershipToken === undefined) {
    return;
  }

  try {
    const currentToken = await fs.readFile(lockPath, 'utf-8');
    if (currentToken === ownershipToken) {
      await fs.rm(lockPath, { force: true });
    }
  } catch {
    // 锁已经被移除或替换为不可读的路径。
    // 在这两种情况下，此所有者都不得移除其他任何东西。
  }
}
