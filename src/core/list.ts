import { promises as fs } from 'fs';
import path from 'path';
import { getTaskProgressForChange, formatTaskStatus } from '../utils/task-progress.js';
import { readFileSync, type Dirent } from 'fs';
import { MarkdownParser } from './parsers/markdown-parser.js';
import type { RootOutput } from './root-selection.js';
import { discoverSpecFiles } from '../utils/spec-discovery.js';

interface ChangeInfo {
  name: string;
  completedTasks: number;
  totalTasks: number;
  lastModified: Date;
}

interface ListOptions {
  sort?: 'recent' | 'name';
  json?: boolean;
  root?: RootOutput;
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

async function readChangeDirectoryEntries(changesDir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(changesDir, { withFileTypes: true });
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
}

/**
 * 获取目录中任何文件的最近修改时间（递归）。
 * 如果没有找到文件，则回退到目录自身的 mtime。
 */
async function getLastModified(dirPath: string): Promise<Date> {
  let latest: Date | null = null;

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        if (latest === null || stat.mtime > latest) {
          latest = stat.mtime;
        }
      }
    }
  }

  await walk(dirPath);

  // If no files found, use the directory's own modification time
  if (latest === null) {
    const dirStat = await fs.stat(dirPath);
    return dirStat.mtime;
  }

  return latest;
}

/**
 * 将日期格式化为相对时间（例如"2 小时前"、"3 天前"）
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays}天前`;
  } else if (diffHours > 0) {
    return `${diffHours}小时前`;
  } else if (diffMins > 0) {
    return `${diffMins}分钟前`;
  } else {
    return '刚刚';
  }
}

export class ListCommand {
  async execute(targetPath: string = '.', mode: 'changes' | 'specs' = 'changes', options: ListOptions = {}): Promise<void> {
    const { sort = 'recent', json = false, root } = options;

    if (mode === 'changes') {
      const changesDir = path.join(targetPath, 'openspec', 'changes');

      // 获取 changes 中的所有目录（排除 archive）
      const entries = await readChangeDirectoryEntries(changesDir);
      const changeDirs = entries
        .filter(entry => entry.isDirectory() && entry.name !== 'archive')
        .map(entry => entry.name);

      if (changeDirs.length === 0) {
        if (json) {
          console.log(JSON.stringify({ changes: [], ...(root ? { root } : {}) }, null, 2));
        } else {
          console.log('未找到活动变更。');
        }
        return;
      }

      // 收集每个变更的信息
      const changes: ChangeInfo[] = [];

      for (const changeDir of changeDirs) {
        const progress = await getTaskProgressForChange(changesDir, changeDir, targetPath);
        const changePath = path.join(changesDir, changeDir);
        const lastModified = await getLastModified(changePath);
        changes.push({
          name: changeDir,
          completedTasks: progress.completed,
          totalTasks: progress.total,
          lastModified
        });
      }

      // 按偏好排序（默认：最近优先）
      if (sort === 'recent') {
        changes.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      } else {
        changes.sort((a, b) => a.name.localeCompare(b.name));
      }

      // 用于编程使用的 JSON 输出
      if (json) {
        const jsonOutput = changes.map(c => ({
          name: c.name,
          completedTasks: c.completedTasks,
          totalTasks: c.totalTasks,
          lastModified: c.lastModified.toISOString(),
          status: c.totalTasks === 0 ? 'no-tasks' : c.completedTasks === c.totalTasks ? 'complete' : 'in-progress'
        }));
        console.log(JSON.stringify({ changes: jsonOutput, ...(root ? { root } : {}) }, null, 2));
        return;
      }

      // 显示结果
      console.log('变更：');
      const padding = '  ';
      const nameWidth = Math.max(...changes.map(c => c.name.length));
      for (const change of changes) {
        const paddedName = change.name.padEnd(nameWidth);
        const status = formatTaskStatus({ total: change.totalTasks, completed: change.completedTasks });
        const timeAgo = formatRelativeTime(change.lastModified);
        console.log(`${padding}${paddedName}     ${status.padEnd(12)}  ${timeAgo}`);
      }
      return;
    }

    // specs 模式
    const specsDir = path.join(targetPath, 'openspec', 'specs');
    try {
      await fs.access(specsDir);
    } catch {
      if (json) {
        console.log(JSON.stringify({ specs: [], ...(root ? { root } : {}) }, null, 2));
      } else {
        console.log('未找到规范。');
      }
      return;
    }

    const discovered = await discoverSpecFiles(specsDir);
    if (discovered.length === 0) {
      if (json) {
        console.log(JSON.stringify({ specs: [], ...(root ? { root } : {}) }, null, 2));
      } else {
        console.log('未找到规范。');
      }
      return;
    }

    type SpecInfo = { id: string; requirementCount: number };
    const specs: SpecInfo[] = [];
    for (const { id, specFile } of discovered) {
      try {
        const content = readFileSync(specFile, 'utf-8');
        const parser = new MarkdownParser(content);
        const spec = parser.parseSpec(id);
        specs.push({ id, requirementCount: spec.requirements.length });
      } catch {
        // 如果规范无法读取或解析，则以 0 计数包含
        specs.push({ id, requirementCount: 0 });
      }
    }

    specs.sort((a, b) => a.id.localeCompare(b.id));

    if (json) {
      console.log(JSON.stringify({ specs, ...(root ? { root } : {}) }, null, 2));
      return;
    }

    console.log('规范：');
    const padding = '  ';
    const nameWidth = Math.max(...specs.map(s => s.id.length));
    for (const spec of specs) {
      const padded = spec.id.padEnd(nameWidth);
      console.log(`${padding}${padded}     需求 ${spec.requirementCount}`);
    }
  }
}
