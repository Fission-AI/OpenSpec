import path from 'path';
import { findAllArchivedChangeIds, findAllChangeIds } from './change-path.js';

export async function getActiveChangeIds(root: string = process.cwd()): Promise<string[]> {
  return findAllChangeIds(path.join(root, 'openspec', 'changes'));
}

export async function getSpecIds(root: string = process.cwd()): Promise<string[]> {
  const { promises: fs } = await import('fs');
  const specsPath = path.join(root, 'openspec', 'specs');
  const result: string[] = [];

  async function walk(currentDir: string, segments: string[]): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    if (segments.length > 0 && entries.some(
      (entry) => entry.isFile() && entry.name === 'spec.md'
    )) {
      result.push(segments.join('/'));
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }
      await walk(path.join(currentDir, entry.name), [...segments, entry.name]);
    }
  }

  await walk(specsPath, []);
  return result.sort();
}

export async function getArchivedChangeIds(root: string = process.cwd()): Promise<string[]> {
  return findAllArchivedChangeIds(path.join(root, 'openspec', 'archive'));
}
