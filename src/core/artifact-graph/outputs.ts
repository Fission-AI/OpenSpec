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

/**
 * Resolves an artifact's output path(s) to concrete files that currently exist.
 * Returns absolute file paths. Glob matches are sorted for deterministic output.
 */
export function resolveArtifactOutputs(changeDir: string, generates: string): string[] {
  if (!isGlobPattern(generates)) {
    const fullPath = path.join(changeDir, generates);
    try {
      return fs.statSync(fullPath).isFile()
        ? [FileSystemUtils.canonicalizeExistingPath(fullPath)]
        : [];
    } catch {
      return [];
    }
  }

  const normalizedPattern = FileSystemUtils.toPosixPath(generates);
  const matches = fg
    .sync(normalizedPattern, { cwd: changeDir, onlyFiles: true, absolute: true })
    .map((match) => FileSystemUtils.canonicalizeExistingPath(path.normalize(match)));

  return Array.from(new Set(matches)).sort();
}

/**
 * Checks if an artifact has at least one resolved output file.
 */
export function artifactOutputExists(changeDir: string, generates: string): boolean {
  return resolveArtifactOutputs(changeDir, generates).length > 0;
}

/**
 * Checks if all resolved artifact output files contain meaningful content.
 */
export function artifactOutputContentValid(changeDir: string, generates: string): boolean {
  const outputs = resolveArtifactOutputs(changeDir, generates);

  return outputs.length > 0 && outputs.every(isArtifactOutputFileContentValid);
}

/**
 * Checks if an artifact has resolved output files and each contains meaningful content.
 */
export function artifactOutputComplete(changeDir: string, generates: string): boolean {
  return artifactOutputExists(changeDir, generates)
    && artifactOutputContentValid(changeDir, generates);
}

function isArtifactOutputFileContentValid(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    return content
      .split(/\r?\n/)
      .some((line) => {
        const trimmed = line.trim();

        return trimmed.length > 0 && !trimmed.startsWith('<!--');
      });
  } catch {
    return false;
  }
}
