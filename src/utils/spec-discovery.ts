import { promises as fs } from 'fs';
import path from 'path';
import { FileSystemUtils } from './file-system.js';

export interface DiscoveredSpec {
  /** 相对于 specs 根的 spec id，在每个平台上使用正斜杠分隔（如 "web" 或 "platform/session-layout"）。 */
  id: string;
  /** spec.md 文件的路径（如果 specs 根是绝对路径，则为绝对路径）。 */
  specFile: string;
}

function assertDiscoveredSpecPath(specsRoot: string, capabilityDir: string, specFile: string): void {
  try {
    FileSystemUtils.assertPathWithin(specsRoot, specFile);
  } catch {
    // 直接的 capability 目录可能有意是外部 monorepo 链接。
    // 在这种情况下，将文件限制在 capability 本身内。
    FileSystemUtils.assertPathWithin(capabilityDir, specFile);
  }
}

/**
 * 递归发现 specs 根目录下的每个 `spec.md`，以便同时找到扁平的
 * `specs/<id>/spec.md` 布局和嵌套的 `specs/<area>/<id>/spec.md` 布局
 * (#1353)。直接位于根目录的 `spec.md` 会被忽略，
 * 这与历史要求一致，即 spec 必须位于 capability 文件夹中。
 * 点目录会被跳过，符号链接目录不会被跟踪。
 * capability 内通过符号链接的 `spec.md` 会被解析：`hasAnyFileUnder` 和
 * artifact 图的 glob 都将其视为内容，因此在此处丢弃它会静默丢失 archive 上的增量。
 * 位于其 capability 之外的链接会被拒绝，悬挂链接会被跳过。结果按 id 排序。
 *
 * 缺失的根目录（ENOENT）产生空列表，但任何其他读取失败
 * （EACCES、EIO 等）会被抛出而不是吞没：由于这会为
 * archive/apply 合并路径提供数据，静默丢弃不可读的 capability
 * 会重现 #1353 正在修复的确切数据丢失类别。
 */
export async function discoverSpecFiles(specsRoot: string): Promise<DiscoveredSpec[]> {
  const results: DiscoveredSpec[] = [];
  const walk = async (dir: string, segments: string[]): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err: any) {
      if (err?.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), [...segments, entry.name]);
      } else if (entry.name === 'spec.md' && segments.length > 0) {
        const specFile = path.join(dir, entry.name);
        if (entry.isFile()) {
          assertDiscoveredSpecPath(specsRoot, dir, specFile);
          results.push({ id: segments.join('/'), specFile });
        } else if (entry.isSymbolicLink()) {
          try {
            if ((await fs.stat(specFile)).isFile()) {
              assertDiscoveredSpecPath(specsRoot, dir, specFile);
              results.push({ id: segments.join('/'), specFile });
            }
          } catch (err: any) {
            // 悬挂链接不是内容；其他任何错误都会大声抛出。
            if (err?.code !== 'ENOENT') throw err;
          }
        }
      }
    }
  };
  await walk(specsRoot, []);
  // 纯码点比较，不是 localeCompare：后者遵循进程的 ICU locale，
  // 因此排序可能因 OS/CI 而异。码点排序保证文档字符串承诺的确定性输出。
  return results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * 当给定目录下存在任何常规非点文件时返回 true。
 * 被 validate/archive 用于检测 change 的 specs/ 下与已声明的
 * skip_specs 标志矛盾的内容 —— 包括 discoverSpecFiles 忽略的文件
 * （根 spec.md、游离的非 spec.md 笔记），因为那里的任何内容都会被
 * 静默丢弃或误读，而 change 声称没有任何内容。
 * 点条目（.DS_Store、.gitkeep、点目录）被跳过以匹配 discoverSpecFiles ——
 * 它们对每个其他代码路径都是不可见的，因此不得计入 spec 内容。
 * 符号链接会计入（不被跟踪）：artifact 图的 glob 会跟踪它们，
 * 因此符号链接的 spec 会被读取为现有内容，而 change 声称没有 ——
 * 这与任何常规文件一样与标志矛盾。
 * 缺失的目录返回 false；其他读取失败会被抛出供调用方决定。
 */
export async function hasAnyFileUnder(dirPath: string): Promise<boolean> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (entry.isFile() || entry.isSymbolicLink()) {
      return true;
    }
    if (entry.isDirectory() && (await hasAnyFileUnder(path.join(dirPath, entry.name)))) {
      return true;
    }
  }
  return false;
}
