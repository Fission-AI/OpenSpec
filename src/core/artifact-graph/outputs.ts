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

function assertGlobDirectoryTraversal(
  changeDir: string,
  currentDir: string,
  directorySegments: string[],
  segmentIndex = 0,
  visited = new Set<string>(),
  canonicalChangeDir = FileSystemUtils.canonicalizeExistingPath(changeDir),
  ancestors = new Set<string>()
): void {
  if (segmentIndex >= directorySegments.length) return;
  const canonicalDir = FileSystemUtils.canonicalizeExistingPath(currentDir);
  FileSystemUtils.assertPathWithin(canonicalChangeDir, canonicalDir);
  const visitKey = `${canonicalDir}\0${segmentIndex}`;
  if (ancestors.has(visitKey)) {
    throw new Error(`Cannot resolve artifact outputs through a linked directory cycle: ${currentDir}`);
  }
  if (visited.has(visitKey)) return;
  visited.add(visitKey);
  ancestors.add(visitKey);

  try {
    const segment = directorySegments[segmentIndex];
    if (segment === '**') {
      // `**` may consume no directory at all.
      assertGlobDirectoryTraversal(
        changeDir,
        canonicalDir,
        directorySegments,
        segmentIndex + 1,
        visited,
        canonicalChangeDir,
        ancestors
      );
    }

    const matches = fg.sync(segment === '**' ? '*' : segment, {
      cwd: canonicalDir,
      onlyFiles: false,
      followSymbolicLinks: false,
      deep: 1,
    });
    for (const match of matches) {
      const candidate = path.join(canonicalDir, match);
      try {
        if (!fs.statSync(candidate).isDirectory()) continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      const canonicalCandidate = FileSystemUtils.canonicalizeExistingPath(candidate);
      FileSystemUtils.assertPathWithin(canonicalChangeDir, canonicalCandidate);
      assertGlobDirectoryTraversal(
        changeDir,
        canonicalCandidate,
        directorySegments,
        segment === '**' ? segmentIndex : segmentIndex + 1,
        visited,
        canonicalChangeDir,
        ancestors
      );
    }
  } finally {
    ancestors.delete(visitKey);
  }
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
  assertGlobDirectoryTraversal(
    changeDir,
    changeDir,
    normalizedPattern.split('/').slice(0, -1)
  );
  const matches = fg
    .sync(normalizedPattern, {
      cwd: changeDir,
      onlyFiles: true,
      absolute: true,
      // Preserve existing support for linked artifact directories. Every
      // concrete match is canonically confined below before it is returned.
      followSymbolicLinks: true,
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

/**
 * Checks if all resolved artifact output files contain meaningful content.
 */
export function artifactOutputContentValid(changeDir: string, generates: string): boolean {
  const outputs = resolveArtifactOutputs(changeDir, generates);

  return outputs.length > 0 && outputs.every(isArtifactOutputFileContentValid);
}

/**
 * Checks if an artifact has resolved output files and each contains meaningful content.
 * Resolves outputs once and reuses the result for both checks.
 */
export function artifactOutputComplete(changeDir: string, generates: string): boolean {
  const outputs = resolveArtifactOutputs(changeDir, generates);

  return outputs.length > 0 && outputs.every(isArtifactOutputFileContentValid);
}

function isArtifactOutputFileContentValid(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const withoutHtmlComments = content.replace(/<!--[\s\S]*?(-->|$)/g, '');

    return withoutHtmlComments
      .split(/\r?\n/)
      .some((line) => line.trim().length > 0);
  } catch {
    return false;
  }
}
