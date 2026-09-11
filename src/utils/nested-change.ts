import { promises as fs } from 'fs';
import path from 'path';
import { METADATA_FILENAME } from './change-metadata.js';

/**
 * Files that only ever sit at the root of a change directory. Their presence
 * inside a directory that is *not* directly under `changes/` is the signal
 * that someone laid a change out in a namespace folder
 * (`changes/<area>/<name>/`), which OpenSpec does not support: a change is a
 * directory directly under `changes/` and nothing else (#1846).
 *
 * The list is deliberately short and conservative. Every entry is written by
 * OpenSpec itself for the default schema - `.openspec.yaml` by
 * `openspec new change` for *every* schema - so a hit is close to proof. A
 * custom schema whose root artifacts are named differently can still be missed
 * when the directory was created by hand rather than by the CLI; that misses
 * the diagnostic and behaves exactly as it did before, which is the safe way
 * round. Delta specs are excluded on purpose: `changes/<name>/specs/spec.md`
 * is a legitimate root delta spec, so a bare `*.md` probe would report real
 * changes as namespace folders.
 */
const CHANGE_ROOT_MARKERS = [
  METADATA_FILENAME,
  'proposal.md',
  'tasks.md',
  'design.md',
];

/**
 * How far below a candidate directory to look for a nested change. One level
 * covers the layout the issue describes (`changes/mobile/refresh-token/`); the
 * extra levels cover a store namespaced by more than one axis
 * (`changes/mobile/ios/refresh-token/`) without turning this into an unbounded
 * walk of every change's spec tree.
 */
const MAX_NESTING_DEPTH = 3;

/** A namespace folder under `changes/` and the change directories buried in it. */
export interface NestedChangeFinding {
  /** The directory name directly under `changes/` that is not a change. */
  name: string;
  /**
   * Slash-separated paths of the nested change directories, relative to
   * `changes/`, sorted. Always at least one entry.
   */
  nested: string[];
}

async function hasChangeRootMarker(dir: string): Promise<boolean> {
  for (const marker of CHANGE_ROOT_MARKERS) {
    const stats = await fs.stat(path.join(dir, marker)).catch(() => undefined);
    if (stats?.isFile()) return true;
  }
  return false;
}

/**
 * Subdirectories of `dir`, or none when it cannot be read. This probe only ever
 * adds a diagnostic, so an unreadable directory falls back to the behaviour
 * that existed before it rather than failing the command around it.
 */
async function readSubdirectories(dir: string): Promise<string[]> {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => [] as never[]);
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
}

/**
 * Collects the nested change directories under `dir`, deepest search bounded by
 * `MAX_NESTING_DEPTH`. A directory that carries a marker is reported and not
 * descended into: its own `specs/` tree is part of that change, not a further
 * nesting level.
 */
async function collectNested(
  dir: string,
  prefix: string,
  depth: number,
  found: string[]
): Promise<void> {
  if (depth > MAX_NESTING_DEPTH) return;
  for (const child of await readSubdirectories(dir)) {
    const childPath = path.join(dir, child);
    const id = `${prefix}/${child}`;
    if (await hasChangeRootMarker(childPath)) {
      found.push(id);
      continue;
    }
    await collectNested(childPath, id, depth + 1, found);
  }
}

/**
 * Reports whether the directory `changes/<name>/` is a namespace folder holding
 * one or more nested change directories rather than a change of its own.
 *
 * Returns undefined for every ordinary change, including a scaffolded one with
 * no artifacts yet: only a *nested* change directory distinguishes the two.
 */
export async function findNestedChangesIn(
  changesDir: string,
  name: string
): Promise<NestedChangeFinding | undefined> {
  const dir = path.join(changesDir, name);
  if (await hasChangeRootMarker(dir)) return undefined;
  const nested: string[] = [];
  await collectNested(dir, name, 1, nested);
  if (nested.length === 0) return undefined;
  return { name, nested: nested.sort() };
}

/**
 * The same check across every candidate directory under `changes/`, for the
 * commands that enumerate rather than resolve a single name.
 */
export async function findNestedChanges(
  changesDir: string,
  names: string[]
): Promise<NestedChangeFinding[]> {
  const findings = await Promise.all(
    names.map((name) => findNestedChangesIn(changesDir, name))
  );
  return findings.filter((finding): finding is NestedChangeFinding => finding !== undefined);
}

/**
 * The stable phrase every nested-change diagnostic contains. Callers that have
 * only the rendered message - `validate`'s next-steps, which branches on the
 * exact issue it is advising about - recognise the case by this.
 */
export const NESTED_CHANGE_ISSUE_MARKER = 'is not a change: it is a folder wrapping';

/** Flattens a namespace path into the change name OpenSpec would accept. */
function flatten(nestedId: string): string {
  return nestedId.split('/').join('-');
}

/**
 * The one explanation every surface prints, so the constraint and the way out
 * read identically wherever a user meets them.
 */
export function describeNestedChange(finding: NestedChangeFinding): string {
  const list = finding.nested.map((id) => `openspec/changes/${id}/`).join(', ');
  const example = flatten(finding.nested[0]);
  return (
    `"${finding.name}" ${NESTED_CHANGE_ISSUE_MARKER} ${list}. ` +
    'A change must be a directory directly under openspec/changes/, so those ' +
    'nested directories are invisible to OpenSpec while the folder around them ' +
    'is reported as a change. Nested paths are supported under openspec/specs/ ' +
    `only. Rename each nested change to a flat name (for example "${example}").`
  );
}
