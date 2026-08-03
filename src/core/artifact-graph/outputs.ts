import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { FileSystemUtils } from '../../utils/file-system.js';

/**
 * Checks if a path contains glob pattern characters.
 */
export function isGlobPattern(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?') || pattern.includes('[');
}

export function resolveArtifactOutputPath(changeDir: string, generates: string): string {
  const outputPath = path.join(changeDir, generates);
  FileSystemUtils.assertPathWithin(changeDir, outputPath);
  return outputPath;
}

/**
 * Resolves an artifact's output path(s) to concrete files that currently exist.
 * Returns absolute file paths. Glob matches are sorted for deterministic output.
 */
export function resolveArtifactOutputs(changeDir: string, generates: string): string[] {
  const outputPath = resolveArtifactOutputPath(changeDir, generates);

  if (!isGlobPattern(generates)) {
    try {
      return fs.statSync(outputPath).isFile()
        ? [FileSystemUtils.canonicalizeExistingPath(outputPath)]
        : [];
    } catch {
      return [];
    }
  }

  const normalizedPattern = FileSystemUtils.toPosixPath(generates);
  const matches = fg
    .sync(normalizedPattern, {
      cwd: changeDir,
      onlyFiles: true,
      absolute: true,
      followSymbolicLinks: false,
    })
    .map((match) => {
      const normalizedMatch = path.normalize(match);
      FileSystemUtils.assertPathWithin(changeDir, normalizedMatch);
      return FileSystemUtils.canonicalizeExistingPath(normalizedMatch);
    });

  return Array.from(new Set(matches)).sort();
}

/**
 * Checks if an artifact has at least one resolved output file.
 */
export function artifactOutputExists(changeDir: string, generates: string): boolean {
  return resolveArtifactOutputs(changeDir, generates).length > 0;
}
