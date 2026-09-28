import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { FileSystemUtils } from '../../utils/file-system.js';

const EXTGLOB_RE = /[!*+?@]\([^(]*\)/u;
const BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./u;

function hasBraceExpansion(pattern: string): boolean {
  const openings: number[] = [];
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === '{') openings.push(index);
    if (pattern[index] !== '}') continue;
    const opening = openings.pop();
    if (opening !== undefined && BRACE_EXPANSION_SEPARATORS_RE.test(pattern.slice(opening, index))) {
      return true;
    }
  }
  return false;
}

/**
 * Recognizes artifact globs while preserving literal output filenames.
 */
export function isGlobPattern(pattern: string): boolean {
  // Keep the original wildcard rules and recognize brace expansions and extglobs.
  // Its full dynamic predicate also reinterprets literal !, parentheses, and backslashes.
  const normalized = FileSystemUtils.toPosixPath(pattern);
  return normalized.includes('*') || normalized.includes('?') || normalized.includes('[')
    || EXTGLOB_RE.test(normalized) || hasBraceExpansion(normalized);
}

/**
 * Returns whether an artifact generates files under the change's specs/ tree.
 */
export function isSpecsArtifactPath(generates: string): boolean {
  const normalized = path.posix.normalize(FileSystemUtils.toPosixPath(generates));
  return normalized.startsWith('specs/');
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
  const globOptions = {
    cwd: changeDir,
    onlyFiles: true,
    absolute: true,
    // Preserve linked artifact directories; confine traversal and concrete matches.
    followSymbolicLinks: true,
  };
  // Task generation expands braces without accessing the filesystem. Validate
  // every task base before globbing, including paths introduced by expansion.
  const tasks = fg.generateTasks(normalizedPattern, globOptions);
  for (const task of tasks) {
    FileSystemUtils.assertPathWithin(changeDir, path.resolve(changeDir, task.base));
  }
  for (const task of tasks) {
    for (const positivePattern of task.positive) {
      assertGlobDirectoryTraversal(
        changeDir,
        changeDir,
        positivePattern.split('/').slice(0, -1)
      );
    }
  }
  const matches = fg
    .sync(normalizedPattern, globOptions)
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
