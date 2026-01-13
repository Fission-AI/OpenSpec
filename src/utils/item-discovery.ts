import { promises as fs } from 'fs';
import path from 'path';
import { resolveOpenSpecDir } from '../core/path-resolver.js';

export async function getActiveChangeIds(root: string = process.cwd()): Promise<string[]> {
  const openspecPath = await resolveOpenSpecDir(root);
  const changesPath = path.join(openspecPath, 'changes');
  try {
    const entries = await fs.readdir(changesPath, { withFileTypes: true });
    const result: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'archive') continue;
      const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
      try {
        await fs.access(proposalPath);
        result.push(entry.name);
      } catch {
        // skip directories without proposal.md
      }
    }
    return result.sort();
  } catch {
    return [];
  }
}

export async function getSpecIds(root: string = process.cwd()): Promise<string[]> {
  const openspecPath = await resolveOpenSpecDir(root);
  const specsPath = path.join(openspecPath, 'specs');
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
  const openspecPath = await resolveOpenSpecDir(root);
  const archivePath = path.join(openspecPath, 'changes', 'archive');
  try {
    const entries = await fs.readdir(archivePath, { withFileTypes: true });
    const result: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const proposalPath = path.join(archivePath, entry.name, 'proposal.md');
      try {
        await fs.access(proposalPath);
        result.push(entry.name);
      } catch {
        // skip directories without proposal.md
      }
    }
    return result.sort();
  } catch {
    return [];
  }
}

