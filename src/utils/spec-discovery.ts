import { promises as fs } from 'fs';
import path from 'path';

export interface DiscoveredSpec {
  /** Spec id relative to the specs root, forward-slash separated on every platform (e.g. "web" or "platform/session-layout"). */
  id: string;
  /** Path to the spec.md file (absolute if the specs root is absolute). */
  specFile: string;
}

/**
 * Recursively discover every `spec.md` under a specs root, so both the flat
 * `specs/<id>/spec.md` layout and nested `specs/<area>/<id>/spec.md` layouts
 * are found (#1353). A `spec.md` sitting directly in the root is ignored,
 * matching the historical requirement that specs live in a capability folder.
 * Dot-directories are skipped and symlinks are not followed. Results are
 * sorted by id for deterministic output.
 *
 * A missing root (ENOENT) yields an empty list, but any other read failure
 * (EACCES, EIO, ...) is thrown rather than swallowed: since this feeds the
 * archive/apply merge path, silently dropping an unreadable capability would
 * recreate the exact data-loss class #1353 is closing.
 */
export async function discoverSpecFiles(specsRoot: string): Promise<DiscoveredSpec[]> {
  const results: DiscoveredSpec[] = [];
  const walk = async (dir: string, segments: string[]): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err: any) {
      if (err?.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), [...segments, entry.name]);
      } else if (entry.isFile() && entry.name === 'spec.md' && segments.length > 0) {
        results.push({ id: segments.join('/'), specFile: path.join(dir, entry.name) });
      }
    }
  };
  await walk(specsRoot, []);
  // Plain code-point comparison, not localeCompare: the latter follows the
  // process's ICU locale, so ordering could vary by OS/CI. Code-point ordering
  // guarantees the deterministic output the docstring promises.
  return results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * True when any regular non-dot file exists anywhere under the given
 * directory. Used by validate/archive to detect content under a change's
 * specs/ that contradicts a declared skip_specs marker - including files that
 * discoverSpecFiles ignores (a root spec.md, stray non-spec.md notes), since
 * anything there would be silently dropped or misread while the change claims
 * to have nothing. Dot entries (.DS_Store, .gitkeep, dot-directories) are
 * skipped to match discoverSpecFiles - they are invisible to every other
 * code path, so they must not count as spec content. Symlinks DO count
 * (without being followed): the artifact graph's globs follow them, so a
 * symlinked spec would read as existing content while the change claims to
 * have none - it contradicts the marker like any regular file. A missing
 * directory returns false; other read failures are thrown for the caller to
 * decide.
 */
export async function hasAnyFileUnder(dirPath: string): Promise<boolean> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (entry.isFile() || entry.isSymbolicLink()) {
      return true;
    }
    if (entry.isDirectory() && (await hasAnyFileUnder(path.join(dirPath, entry.name)))) {
      return true;
    }
  }
  return false;
}
