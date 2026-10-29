import * as fs from 'node:fs';
import * as path from 'node:path';
import { expand } from 'brace-expansion';
import picomatch from 'picomatch';
import * as globby from 'tinyglobby';
import { FileSystemUtils } from '../../utils/file-system.js';

const EXTGLOB_RE = /[!*+?@]\([^(]*\)/u;
const BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./u;
const DUPLICATE_SLASH_RE = /(?!^)\/{2,}/gu;
// Deeply nested braces can overflow a recursive expander. Reject nesting no real
// artifact pattern needs before brace-expansion or tinyglobby see the pattern.
const MAX_BRACE_NESTING = 16;
// Nesting depth alone does not bound the work: `{a,b}` repeated 20 times is
// only one level deep and expands to 1,048,576 patterns, which exhausts the
// heap. fast-glob never expanded that far because micromatch compiled the
// braces to a regex. No real artifact pattern needs more than a few hundred.
const MAX_BRACE_EXPANSIONS = 1024;

const ARTIFACT_GLOB_OPTIONS = {
  absolute: true,
  // Braces are expanded first so `{draft}` left behind stays a literal name.
  braceExpansion: false,
  // fast-glob migration: directory patterns must not grow a trailing `/**`.
  expandDirectories: false,
  followSymbolicLinks: true,
  onlyFiles: true,
} as const;

function assertBraceNesting(pattern: string): void {
  // Mirror the braces parser: `[...]` and quoted runs are literal, `(` nests like
  // `{`, and a closer only closes the innermost group of its own kind.
  const open: string[] = [];
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '[') {
      for (let brackets = 1; brackets > 0 && index + 1 < pattern.length; ) {
        index += 1;
        if (pattern[index] === '[') brackets += 1;
        else if (pattern[index] === ']') brackets -= 1;
      }
    } else if (char === '"' || char === "'" || char === '`') {
      const end = pattern.indexOf(char, index + 1);
      index = end === -1 ? pattern.length : end;
    } else if (char === '{' || char === '(') {
      open.push(char);
      if (open.length > MAX_BRACE_NESTING) {
        // A pattern this deep can run to thousands of characters; quote only its start.
        const shown = pattern.length > 80 ? `${pattern.slice(0, 80)}...` : pattern;
        throw new Error(
          `Artifact output pattern nests braces more than ${MAX_BRACE_NESTING} levels deep: ${shown}`
        );
      }
    } else if ((char === '}' && open.at(-1) === '{') || (char === ')' && open.at(-1) === '(')) {
      open.pop();
    }
  }
}

function isDynamicSegment(segment: string): boolean {
  return segment.includes('*') || segment.includes('?') || segment.includes('[')
    || EXTGLOB_RE.test(segment);
}

/**
 * Static directory prefix of an expanded pattern, equivalent to the `base`
 * fast-glob's generateTasks used to reject `../` before walking.
 */
function globBase(pattern: string): string {
  const segments = pattern.split('/');
  if (segments.length <= 1) return '.';
  const base: string[] = [];
  for (const segment of segments.slice(0, -1)) {
    if (segment === '') continue;
    if (isDynamicSegment(segment)) break;
    base.push(segment);
  }
  // An absolute pattern must stay absolute, or `path.resolve(changeDir, base)`
  // rebases `/etc/*` inside the change directory and the containment check
  // passes for a pattern that globs the filesystem root.
  if (pattern.startsWith('/')) return `/${base.join('/')}`;
  return base.length > 0 ? base.join('/') : '.';
}

// brace-expansion 5 leaves the rest of a pattern literal when a non-expanding
// group such as `{draft}` comes before a range. Expand one real group at a time.
// NUL-prefixed so no `generates` value can forge them: `resolveArtifactOutputPath`
// runs `path.join` first, which rejects a NUL byte. A single-character sentinel
// such as U+0001 is a legal filename character, and a pattern containing one
// would come back out of the expander as a brace.
const LITERAL_BRACE_OPEN = '\u0000<';
const LITERAL_BRACE_CLOSE = '\u0000>';

function hasTopLevelExpansion(body: string): boolean {
  let depth = 0;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      if (char === ',') return true;
      if (char === '.' && body[index + 1] === '.') return true;
    }
  }
  return false;
}

function findTopLevelExpansion(pattern: string): { pre: string; body: string; post: string } | null {
  const stack: number[] = [];
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '{') {
      stack.push(index);
    } else if (char === '}' && stack.length > 0) {
      const open = stack.pop();
      if (open === undefined) continue;
      // Only the outermost group that actually expands. brace-expansion expands
      // its nested groups in one linear pass. Peeling the innermost `{a,b}` first
      // turns `{a,{a,{a,b}}}` into a binary tree, so a 16-deep pattern does not
      // finish before the test timeout.
      if (stack.length > 0) continue;
      const body = pattern.slice(open + 1, index);
      if (!hasTopLevelExpansion(body)) {
        // `{prefix{a,b}}` has no separator of its own, so the outer braces stay
        // literal. Keep scanning inside them; a nested group may still expand.
        const nested = findTopLevelExpansion(body);
        if (!nested) continue;
        return {
          pre: `${pattern.slice(0, open + 1)}${nested.pre}`,
          body: nested.body,
          post: `${nested.post}${pattern.slice(index)}`,
        };
      }
      return { pre: pattern.slice(0, open), body, post: pattern.slice(index + 1) };
    }
  }
  return null;
}

function assertExpansionBudget(pattern: string, count: number): void {
  if (count <= MAX_BRACE_EXPANSIONS) return;
  // A pattern this wide can run to thousands of characters; quote only its start.
  const shown = pattern.length > 80 ? `${pattern.slice(0, 80)}...` : pattern;
  throw new Error(
    `Artifact output pattern expands to more than ${MAX_BRACE_EXPANSIONS} patterns: ${shown}`
  );
}

function expandArtifactBraces(pattern: string): string[] {
  if (pattern.includes('\u0000')) {
    throw new Error('Artifact output pattern contains a NUL byte');
  }
  const pending = [pattern];
  const finished: string[] = [];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    const group = findTopLevelExpansion(current);
    if (!group) {
      finished.push(current.replaceAll(LITERAL_BRACE_OPEN, '{').replaceAll(LITERAL_BRACE_CLOSE, '}'));
      continue;
    }
    const wrapped = `{${group.body}}`;
    // `max` makes this budget the binding one. Without it `{1..1000000000}`
    // allocates brace-expansion's own 100,000-result default before the check
    // below rejects it. `max` truncates silently, so ask for one result more
    // than the budget allows: a result that long means the pattern is over
    // budget rather than fully expanded. A truncated group never looks literal,
    // because its first alternative is not the group itself.
    const remaining = Math.max(MAX_BRACE_EXPANSIONS - (pending.length + finished.length), 0);
    const alternatives = expand(wrapped, { max: remaining + 1 });
    if (alternatives.length === 1 && alternatives[0] === wrapped) {
      pending.push(`${group.pre}${LITERAL_BRACE_OPEN}${group.body}${LITERAL_BRACE_CLOSE}${group.post}`);
      continue;
    }
    // Checked before the push so the budget bounds memory, not just the result.
    assertExpansionBudget(pattern, pending.length + finished.length + alternatives.length);
    for (const alternative of alternatives) {
      pending.push(`${group.pre}${alternative}${group.post}`);
    }
  }
  const normalized = finished
    .map((value) => value.replace(DUPLICATE_SLASH_RE, '/'))
    .filter((value) => value.length > 0);
  return normalized.length > 0 ? normalized : [pattern];
}

/**
 * One directory level. picomatch matches the segment; readdir keeps symlink
 * entries tinyglobby would drop when followSymbolicLinks is false.
 */
function listDirectoryMatches(directory: string, segment: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const isMatch = picomatch(segment, {
    dot: false,
    nobrace: true,
    noglobstar: true,
    posix: true,
  });
  const names: string[] = [];
  for (const entry of entries) {
    if (isMatch(entry.name)) names.push(entry.name);
  }
  return names;
}

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

    // `.` and `..` are not directory entries. Resolve them directly so a
    // `**/../` pattern is confined before any glob runs.
    if (segment === '' || segment === '.' || segment === '..') {
      const candidate = path.resolve(canonicalDir, segment === '' ? '.' : segment);
      const canonicalCandidate = FileSystemUtils.canonicalizeExistingPath(candidate);
      FileSystemUtils.assertPathWithin(canonicalChangeDir, canonicalCandidate);
      assertGlobDirectoryTraversal(
        changeDir,
        canonicalCandidate,
        directorySegments,
        segmentIndex + 1,
        visited,
        canonicalChangeDir,
        ancestors
      );
      return;
    }

    const matches = listDirectoryMatches(canonicalDir, segment === '**' ? '*' : segment);
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
  const isGlob = isGlobPattern(generates);
  if (isGlob) assertBraceNesting(FileSystemUtils.toPosixPath(generates));
  const outputPath = resolveArtifactOutputPath(changeDir, generates);

  if (!isGlob) {
    try {
      return fs.statSync(outputPath).isFile()
        ? [FileSystemUtils.canonicalizeExistingPath(outputPath)]
        : [];
    } catch {
      return [];
    }
  }

  const normalizedPattern = FileSystemUtils.toPosixPath(generates).replace(DUPLICATE_SLASH_RE, '/');
  // Expand braces before any filesystem access. tinyglobby has no generateTasks,
  // and a `../` alternative is invisible until the braces are expanded.
  const patterns = expandArtifactBraces(normalizedPattern);
  for (const pattern of patterns) {
    FileSystemUtils.assertPathWithin(changeDir, path.resolve(changeDir, globBase(pattern)));
  }
  for (const pattern of patterns) {
    assertGlobDirectoryTraversal(
      changeDir,
      changeDir,
      pattern.split('/').slice(0, -1)
    );
  }
  const matches = globby
    .globSync(patterns, {
      cwd: changeDir,
      ...ARTIFACT_GLOB_OPTIONS,
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
