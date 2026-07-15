import path from 'path';
import { findAllArchivedChangeIds, findAllChangeIds } from './change-path.js';

export async function getActiveChangeIds(root: string = process.cwd()): Promise<string[]> {
  return findAllChangeIds(path.join(root, 'openspec', 'changes'));
}

export async function getSpecIds(root: string = process.cwd()): Promise<string[]> {
  const { promises: fs } = await import('fs');
  const specsPath = path.join(root, 'openspec', 'specs');
  const result: string[] = [];
  try {
    const entries = await fs.readdir(specsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const specFile = path.join(specsPath, entry.name, 'spec.md');
      try {
        await fs.access(specFile);
        result.push(entry.name);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return result.sort();
}

export async function getArchivedChangeIds(root: string = process.cwd()): Promise<string[]> {
  return findAllArchivedChangeIds(path.join(root, 'openspec', 'archive'));
}
