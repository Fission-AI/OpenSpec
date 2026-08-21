import { promises as fs } from 'fs';
import path from 'path';

export interface DiscoveredChange {
  /** The change's id — the folder name minus any `DD-` shard prefix. */
  id: string;
  /** Absolute path to the change directory. */
  dir: string;
}

const YEAR_DIR = /^\d{4}$/;
const MONTH_DIR = /^\d{2}$/;
const DAY_PREFIX = /^\d{2}-/;

/**
 * Enumerate change directories under openspec/changes/, supporting both the
 * flat layout (`changes/<name>/`) and the creation-date sharded layout used
 * by `lifecycle: status` projects (`changes/YYYY/MM/DD-<name>/`).
 *
 * The rule: `YYYY` and `MM` directories are shards to walk into; any other
 * directory is a change. Location encodes only the creation date — fixed at
 * birth — so nothing here ever needs to know a change's lifecycle state.
 * `archive/` is excluded at the top level, matching the flat layout's
 * long-standing behavior.
 */
export async function discoverChanges(changesDir: string): Promise<DiscoveredChange[]> {
  const found: DiscoveredChange[] = [];

  async function walkShard(dir: string, depth: number): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      // A directory that is simply absent means "no changes" — at the root
      // because the project has none yet, inside a shard because a concurrent
      // move removed it. Anything else (ENOTDIR, EACCES, EIO, ...) means the
      // walk cannot see what it is meant to enumerate, and reporting a clean
      // gate on a tree it could not read is worse than no gate. Depth does not
      // change that: an unreadable month shard hides shipped changes exactly
      // as effectively as an unreadable root.
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (depth === 0 && entry.name === 'archive') continue;
      if (depth === 0 && YEAR_DIR.test(entry.name)) {
        await walkShard(full, 1);
      } else if (depth === 1 && MONTH_DIR.test(entry.name)) {
        await walkShard(full, 2);
      } else {
        const id = depth === 2 ? entry.name.replace(DAY_PREFIX, '') : entry.name;
        found.push({ id, dir: full });
      }
    }
  }

  await walkShard(changesDir, 0);
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Ids discovery could never produce, and which therefore name no change:
 * separators and dot segments (which would escape changes/), hidden names,
 * and the two directory names the layout itself owns — `archive` and a bare
 * year shard. Creation shares this predicate with resolution, so a name that
 * could not be addressed later cannot be created now.
 */
export function isReservedChangeId(id: string): boolean {
  return (
    !id ||
    id === 'archive' ||
    YEAR_DIR.test(id) ||
    id.startsWith('.') ||
    id.includes('/') ||
    id.includes('\\') ||
    id.includes('\0')
  );
}

/**
 * Resolve a change id to its directory in either layout. Throws when the id is
 * ambiguous — two directories carrying the same id — because guessing would
 * silently act on the wrong change. Reserved ids resolve to null, so the
 * resolver and discovery agree on the addressable namespace.
 */
export async function resolveChangeDir(changesDir: string, id: string): Promise<string | null> {
  if (isReservedChangeId(id)) {
    return null;
  }
  // Enumerate before deciding. Returning a flat hit early would let
  // changes/<id>/ silently win over changes/YYYY/MM/DD-<id>/, so a command
  // would act on a different change than `openspec list` displays.
  const matches = (await discoverChanges(changesDir)).filter((c) => c.id === id);

  // The walk reads dirents, which do not follow symlinks, so a change
  // directory linked into changes/ is invisible to it. stat does follow, so
  // look the flat path up separately — merged into the match set rather than
  // returned early, so it still cannot mask a sharded twin.
  const flat = path.join(changesDir, id);
  if (!matches.some((match) => match.dir === flat)) {
    try {
      if ((await fs.stat(flat)).isDirectory()) {
        // Compare physical identity, not path strings: a compatibility symlink
        // left pointing at the sharded directory is the same change, and
        // calling that pair ambiguous would fail on a tree that is fine.
        const real = await fs.realpath(flat);
        const seen = await Promise.all(
          matches.map((match) => fs.realpath(match.dir).catch(() => match.dir))
        );
        if (!seen.includes(real)) {
          matches.push({ id, dir: flat });
        }
      }
    } catch {
      // no flat directory under this id
    }
  }

  if (matches.length > 1) {
    throw new Error(
      `Change '${id}' is ambiguous: ${matches.map((m) => path.relative(changesDir, m.dir)).join(', ')}`
    );
  }
  return matches[0]?.dir ?? null;
}

/**
 * Derive an item's name from a file path inside it: the segment after the
 * innermost `specs` or `changes` directory, minus the `DD-` prefix when the
 * path runs through a creation-date shard (`changes/YYYY/MM/DD-<name>/...`).
 * Falls back to the file name without extension.
 */
export function itemNameFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/);

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 'specs' || parts[i] === 'changes') {
      if (i < parts.length - 1) {
        if (
          parts[i] === 'changes' &&
          YEAR_DIR.test(parts[i + 1] ?? '') &&
          MONTH_DIR.test(parts[i + 2] ?? '') &&
          DAY_PREFIX.test(parts[i + 3] ?? '')
        ) {
          return parts[i + 3].replace(DAY_PREFIX, '');
        }
        return parts[i + 1];
      }
    }
  }

  const fileName = parts[parts.length - 1] ?? '';
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}
