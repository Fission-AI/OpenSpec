import { promises as fs } from 'fs';
import path from 'path';
import type { ValidationResult } from './change-utils.js';

const DOMAIN_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

export function splitChangeId(id: string): { domain: string[]; name: string } {
  const segments = id.split('/');
  return {
    domain: segments.slice(0, -1),
    name: segments[segments.length - 1] ?? '',
  };
}

export function validateDomainPath(domainPath: string): ValidationResult {
  if (domainPath === '') {
    return { valid: true };
  }

  if (domainPath.includes('\\')) {
    return { valid: false, error: 'Domain path must use forward slashes' };
  }

  for (const segment of domainPath.split('/')) {
    if (segment.length === 0) {
      return { valid: false, error: 'Domain path cannot contain empty segments' };
    }

    if (/\s/.test(segment)) {
      return { valid: false, error: 'Domain path cannot contain whitespace' };
    }

    if (segment === '.' || segment === '..') {
      return { valid: false, error: 'Domain path cannot contain "." or ".." segments' };
    }

    if (segment.startsWith('.')) {
      return { valid: false, error: 'Domain path segments cannot start with a dot' };
    }

    if (!DOMAIN_SEGMENT_PATTERN.test(segment)) {
      return {
        valid: false,
        error: 'Domain path can only contain letters, numbers, hyphens, underscores, and dots',
      };
    }
  }

  return { valid: true };
}

export function buildArchivePath(archiveDir: string, changeId: string, date: string): string {
  const { domain, name } = splitChangeId(changeId);
  return path.join(archiveDir, ...domain, `${date}-${name}`);
}

export async function findAllChangeIds(changesDir: string): Promise<string[]> {
  return findChangeIds(changesDir, true);
}

export async function findAllArchivedChangeIds(archiveDir: string): Promise<string[]> {
  return findChangeIds(archiveDir, false);
}

async function findChangeIds(rootDir: string, ignoreRootArchive: boolean): Promise<string[]> {
  const ids: string[] = [];

  async function walk(currentDir: string, segments: string[]): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasMarker = segments.length > 0 && entries.some(
      (entry) => entry.isFile() && (entry.name === '.openspec.yaml' || entry.name === 'proposal.md')
    );

    if (hasMarker) {
      ids.push(segments.join('/'));
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }

      if (ignoreRootArchive && segments.length === 0 && entry.name === 'archive') {
        continue;
      }

      await walk(path.join(currentDir, entry.name), [...segments, entry.name]);
    }
  }

  await walk(rootDir, []);
  return ids.sort();
}
