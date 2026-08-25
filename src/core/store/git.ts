import { execFile } from 'node:child_process';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { StoreError } from './errors.js';

const fs = nodeFs.promises;
const execFileAsync = promisify(execFile);

/**
 * Store 的 Git 机制：仓库检测、初始化时的 init 和
 * 提交，以及 doctor 报告的只读事实。这里不包含克隆、拉取、
 * 推送或同步 — 初始化时的 `git init` 加上一个初始提交就是
 * 全部写入操作。
 */

function isSpawnNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

export async function isGitRepositoryAtRoot(storeRoot: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(storeRoot, '.git'));
    return stat.isDirectory() || stat.isFile();
  } catch {
    return false;
  }
}

export async function initGitRepository(storeRoot: string): Promise<boolean> {
  if (await isGitRepositoryAtRoot(storeRoot)) {
    return false;
  }

  try {
    await execFileAsync('git', ['init'], { cwd: storeRoot });
  } catch (error) {
    throw new StoreError(
      `初始化 Git 仓库失败：${error instanceof Error ? error.message : String(error)}`,
      'store_git_init_failed',
      {
        target: 'store.git',
        fix: '安装 Git 或使用 --no-init-git 重新运行初始化。',
      }
    );
  }

  return true;
}

/**
 * `git var` 解析身份信息的方式与 `git commit` 完全一致（配置、环境变量、
 * 自动检测），因此当初始提交会失败时这里也会失败。
 */
export async function assertGitCommitIdentity(probeCwd: string): Promise<void> {
  for (const identVar of ['GIT_COMMITTER_IDENT', 'GIT_AUTHOR_IDENT']) {
    try {
      await execFileAsync('git', ['var', identVar], { cwd: probeCwd });
    } catch (error) {
      if (isSpawnNotFoundError(error)) {
        throw new StoreError(
          'Git 不可用，因此初始化无法创建初始 store 提交。',
          'store_git_init_failed',
          {
            target: 'store.git',
            fix: '安装 Git 或使用 --no-init-git 重新运行初始化。',
          }
        );
      }

      throw new StoreError(
        '未配置可用的 Git 提交身份信息，因此初始化无法创建初始 store 提交。',
        'store_git_identity_missing',
        {
          target: 'store.git',
          fix: '运行 git config --global user.name "您的姓名" 和 git config --global user.email "you@example.com"，或使用 --no-init-git 重新运行初始化。',
        }
      );
    }
  }
}

/**
 * 保留索引的初始提交：`git commit` 的 pathspec 保持了用户
 * 已暂存的文件不被初始化提交影响，保持暂存状态。
 * Pathspec 可以是文件或目录。
 */
export async function commitStoreFiles(
  storeRoot: string,
  id: string,
  pathspecs: string[]
): Promise<boolean> {
  if (pathspecs.length === 0) {
    return false;
  }

  try {
    await execFileAsync('git', ['add', '--', ...pathspecs], { cwd: storeRoot });
    await execFileAsync(
      'git',
      ['commit', '-m', `Initialize OpenSpec store ${id}`, '--', ...pathspecs],
      { cwd: storeRoot }
    );
  } catch (error) {
    // 尽力取消暂存，使失败的提交（gpg 签名、钩子）不会
    // 在回滚删除文件后将初始化创建的文件留在用户索引中。
    await execFileAsync('git', ['rm', '--cached', '-r', '-f', '-q', '--', ...pathspecs], {
      cwd: storeRoot,
    }).catch(() => undefined);

    throw new StoreError(
      `创建初始 store 提交失败：${error instanceof Error ? error.message : String(error)}`,
      'store_git_commit_failed',
      {
        target: 'store.git',
        fix: '手动提交创建的文件，或使用 --no-init-git 重新运行初始化。',
      }
    );
  }

  return true;
}

async function gitProbe(storeRoot: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', storeRoot, ...args]);
    return stdout;
  } catch {
    return null;
  }
}

export async function gitHasCommits(storeRoot: string): Promise<boolean | null> {
  try {
    await execFileAsync('git', ['-C', storeRoot, 'rev-parse', '--verify', '--quiet', 'HEAD']);
    return true;
  } catch (error) {
    if (isSpawnNotFoundError(error)) return null;
    // Exit 1 = repo exists but HEAD has no commits. Anything else (exit 128:
    // corrupt or fake .git) is unknown, not "commitless".
    const exitCode = (error as { code?: number | string }).code;
    return exitCode === 1 ? false : null;
  }
}

export async function gitHasUncommittedChanges(storeRoot: string): Promise<boolean | null> {
  const stdout = await gitProbe(storeRoot, ['status', '--porcelain']);
  return stdout === null ? null : stdout.trim().length > 0;
}

export async function gitHasRemote(storeRoot: string): Promise<boolean | null> {
  const stdout = await gitProbe(storeRoot, ['remote']);
  return stdout === null ? null : stdout.trim().length > 0;
}

/**
 * 配置的 origin URL，仅从本地 Git 配置读取 — 永不触发网络请求。
 * 当没有仓库或没有 origin 时返回 null。
 */
export async function gitOriginUrl(storeRoot: string): Promise<string | null> {
  const stdout = await gitProbe(storeRoot, ['remote', 'get-url', 'origin']);
  const url = stdout?.trim();
  return url ? url : null;
}

export interface GitTrackingDrift {
  ahead: number;
  behind: number;
}

/**
 * HEAD 与其配置的上游跟踪引用之间的超前/滞后计数，
 * 仅从本地引用读取 — 不进行 fetch，不触发网络。
 * 因此比较针对的是当前本地上游引用（通常由 fetch 更新，
 * 但也可能是本地分支），而非远程实时状态。
 * 当没有仓库、没有上游、HEAD 分离或 Git 不可用时返回 null：
 * 没有比较不代表漂移。
 */
export async function gitTrackingDrift(storeRoot: string): Promise<GitTrackingDrift | null> {
  const stdout = await gitProbe(storeRoot, [
    'rev-list',
    '--left-right',
    '--count',
    '@{upstream}...HEAD',
  ]);
  if (stdout === null) return null;
  const match = stdout.trim().match(/^(\d+)\s+(\d+)$/);
  if (!match) return null;
  // `--left-right` 按 `...` 的两侧排序计数：左侧是 @{upstream}
  // （我们缺少的提交 = 滞后），右侧是 HEAD（上游缺少的提交 = 超前）。
  return { behind: Number(match[1]), ahead: Number(match[2]) };
}

export async function gitDirectoryHasTrackedFiles(
  storeRoot: string,
  relativeDir: string
): Promise<boolean | null> {
  const stdout = await gitProbe(storeRoot, ['ls-files', '--', relativeDir]);
  return stdout === null ? null : stdout.trim().length > 0;
}
