import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { FileSystemUtils } from '../../utils/file-system.js';
import type { Artifact } from './types.js';
import { resolveArtifactBaseDir } from './paths.js';

/**
 * Checks if a path contains glob pattern characters.
 */
export function isGlobPattern(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?') || pattern.includes('[');
}

/**
 * Resolves an artifact's output path(s) to concrete files that currently exist.
 * Returns absolute file paths. Glob matches are sorted for deterministic output.
 *
 * Honors `artifact.folder`: when set, the base directory is the project-root-relative
 * folder rather than `changeDir`.
 */
export function resolveArtifactOutputs(
  artifact: Pick<Artifact, 'folder' | 'generates'>,
  changeDir: string
): string[] {
  const baseDir = resolveArtifactBaseDir(artifact, changeDir);
  const generates = artifact.generates;

  if (!isGlobPattern(generates)) {
    const fullPath = path.join(baseDir, generates);
    try {
      return fs.statSync(fullPath).isFile()
        ? [FileSystemUtils.canonicalizeExistingPath(fullPath)]
        : [];
    } catch {
      return [];
    }
  }

  const normalizedPattern = FileSystemUtils.toPosixPath(generates);
  let matches: string[];
  try {
    matches = fg
      .sync(normalizedPattern, { cwd: baseDir, onlyFiles: true, absolute: true })
      .map((match) => FileSystemUtils.canonicalizeExistingPath(path.normalize(match)));
  } catch {
    return [];
  }

  return Array.from(new Set(matches)).sort();
}

/**
 * Checks if an artifact has at least one resolved output file.
 */
export function artifactOutputExists(
  artifact: Pick<Artifact, 'folder' | 'generates'>,
  changeDir: string
): boolean {
  return resolveArtifactOutputs(artifact, changeDir).length > 0;
}
