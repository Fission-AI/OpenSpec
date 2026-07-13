/**
 * Upstream links (stores beta).
 *
 * A change can serve work that lives one level up — usually a change in a
 * shared store where a team drafts requirements before code moves. The link
 * is one metadata line in the change's `.openspec.yaml`:
 * `serves: <change>` (a change in the same root) or
 * `serves: <store-id>/<change>` (a change in that registered store).
 *
 * There is no manifest — rollup discovers serving changes by scanning for
 * that line, so teams tag their own work and nothing central needs
 * maintaining. When the upstream change archives, its requirements live on
 * in the store's specs; the link keeps resolving to the archived copy.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

import { getTaskProgressForChange } from '../utils/task-progress.js';
import { resolveSchemaForChange } from '../utils/change-metadata.js';
import { ArtifactGraph } from './artifact-graph/graph.js';
import { detectCompleted } from './artifact-graph/state.js';
import { resolveSchema } from './artifact-graph/resolver.js';
import { writeFileAtomically } from './file-state.js';
import {
  getStoresDir,
  listStoreRegistryEntries,
  readStoreRegistryState,
  type StorePathOptions,
} from './store/foundation.js';
import { getStoreRootForBackend } from './store/registry.js';

export interface ServingChangeStatus {
  id: string;
  /** Registered store the serving change lives in; absent = the rolled-up root. */
  store?: string;
  /** Linked (non-store) repo the serving change lives in, by directory name. */
  repo?: string;
  completedTasks: number;
  totalTasks: number;
  /** Artifact-graph progress; absent when the change's schema is unreadable. */
  completedArtifacts?: number;
  totalArtifacts?: number;
  state: 'complete' | 'in-progress' | 'no-tasks';
}

/**
 * Artifact-graph progress for one serving change, so the rollup's "done"
 * means the whole change — a checked-off tasks.md with no approved
 * proposal must not read as complete. Tolerant: an unreadable schema
 * yields null and the rollup falls back to task counts alone.
 */
function readArtifactProgress(
  changeDir: string,
  scanRoot: string
): { completed: number; total: number } | null {
  try {
    const schemaName = resolveSchemaForChange(changeDir, undefined, scanRoot);
    const schema = resolveSchema(schemaName, scanRoot);
    const graph = ArtifactGraph.fromSchema(schema);
    const completed = detectCompleted(graph, changeDir);
    return { completed: completed.size, total: schema.artifacts.length };
  } catch {
    return null;
  }
}

export interface UpstreamChangeInfo {
  id: string;
  /** False when serving changes reference this id but no change exists on disk. */
  exists: boolean;
  /** True when the upstream change has been archived (requirements synced to specs). */
  archived: boolean;
  changes: ServingChangeStatus[];
  changesComplete: number;
  changesTotal: number;
  tasksComplete: number;
  tasksTotal: number;
}

export interface DownstreamRollup {
  path: string;
  upstream: UpstreamChangeInfo[];
}

function changesDirOf(root: string): string {
  return path.join(root, 'openspec', 'changes');
}

/**
 * Reads the `serves:` line from a change's `.openspec.yaml`. Tolerant: any
 * unreadable or unlinked metadata simply means "serves nothing upstream".
 */
export async function readServesRef(changeDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(changeDir, '.openspec.yaml'), 'utf-8');
    const parsed = parseYaml(raw) as { serves?: unknown } | null;
    return typeof parsed?.serves === 'string' && parsed.serves.length > 0
      ? parsed.serves
      : null;
  } catch {
    return null;
  }
}

/**
 * A root's active change ids: every non-archive directory under
 * openspec/changes/, regardless of which schema's artifacts it holds.
 * (Unlike proposal-based discovery, this stays correct for custom
 * schemas whose first artifact is not proposal.md.)
 */
export async function listActiveChangeIds(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(changesDirOf(root), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'archive'
    )
    .map((entry) => entry.name)
    .sort();
}

// ---------------------------------------------------------------------------
// Linked roots
//
// Rollup can only scan checkouts it knows about. Store roots come from the
// store registry; plain code repos become known the moment they link a change
// to a store's change (`new change --serves <store>/<change>` records the
// repo's path here). Linking IS the registration — no extra command, and
// nothing is written into the repo itself.
// ---------------------------------------------------------------------------

const LINKED_ROOTS_FILE_NAME = 'linked-roots.yaml';

function getLinkedRootsPath(options: StorePathOptions = {}): string {
  return path.join(getStoresDir(options), LINKED_ROOTS_FILE_NAME);
}

/** Known linked roots. Tolerant: unreadable state means "none". */
export async function readLinkedRoots(
  options: StorePathOptions = {}
): Promise<string[]> {
  try {
    const raw = await fs.readFile(getLinkedRootsPath(options), 'utf-8');
    const parsed = parseYaml(raw) as { roots?: unknown } | null;
    if (!Array.isArray(parsed?.roots)) return [];
    return parsed.roots.filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0
    );
  } catch {
    return [];
  }
}

/**
 * Records a repo root so rollups scan it. Idempotent; stale entries are
 * harmless (a missing directory scans as empty).
 */
export async function recordLinkedRoot(
  root: string,
  options: StorePathOptions = {}
): Promise<void> {
  const resolved = path.resolve(root);
  const existing = await readLinkedRoots(options);
  if (existing.includes(resolved)) return;
  const roots = [...existing, resolved].sort();
  await fs.mkdir(getStoresDir(options), { recursive: true });
  await writeFileAtomically(
    getLinkedRootsPath(options),
    `version: 1\nroots:\n${roots.map((entry) => `  - ${JSON.stringify(entry)}`).join('\n')}\n`
  );
}

/**
 * Locates an upstream change inside a root: active changes first, then the
 * archive (archived copies are named `YYYY-MM-DD-<id>`). Returns null when
 * the id matches neither.
 */
async function locateChange(
  root: string,
  changeId: string
): Promise<{ path: string; archived: boolean } | null> {
  const active = path.join(changesDirOf(root), changeId);
  try {
    if ((await fs.stat(active)).isDirectory()) {
      return { path: active, archived: false };
    }
  } catch {
    // Not active — fall through to the archive.
  }
  const archiveDir = path.join(changesDirOf(root), 'archive');
  let entries;
  try {
    entries = await fs.readdir(archiveDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const suffix = `-${changeId}`;
  const match = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort()
    .pop();
  return match ? { path: path.join(archiveDir, match), archived: true } : null;
}

/**
 * Scans one root's changes and returns, per matching upstream change id, the
 * serving changes that point at it. `toId` maps a raw ref to the upstream
 * change id it addresses in the root being rolled up — or null when the ref
 * points elsewhere.
 */
async function collectServingChanges(
  root: string,
  toId: (ref: string) => string | null,
  label: { store?: string; repo?: string } | undefined
): Promise<Map<string, ServingChangeStatus[]>> {
  const changesDir = changesDirOf(root);
  const found = new Map<string, ServingChangeStatus[]>();
  let entries;
  try {
    entries = await fs.readdir(changesDir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const ref = await readServesRef(path.join(changesDir, entry.name));
    if (ref === null) continue;
    const id = toId(ref);
    if (id === null) continue;

    const progress = await getTaskProgressForChange(changesDir, entry.name, root);
    const artifacts = readArtifactProgress(path.join(changesDir, entry.name), root);
    const tasksDone = progress.total > 0 && progress.completed === progress.total;
    const artifactsDone = artifacts !== null && artifacts.completed === artifacts.total;
    // Done means the WHOLE change: tasks checked off AND (when the schema
    // is readable) every artifact present. Without tasks, artifacts alone
    // can carry it; without either signal, the state stays 'no-tasks'.
    const state: ServingChangeStatus['state'] =
      artifacts === null
        ? progress.total === 0
          ? 'no-tasks'
          : tasksDone
            ? 'complete'
            : 'in-progress'
        : (progress.total === 0 ? artifactsDone : tasksDone && artifactsDone)
          ? 'complete'
          : progress.total === 0 && artifacts.total === 0
            ? 'no-tasks'
            : 'in-progress';
    const status: ServingChangeStatus = {
      id: entry.name,
      ...(label?.store ? { store: label.store } : {}),
      ...(label?.repo ? { repo: label.repo } : {}),
      completedTasks: progress.completed,
      totalTasks: progress.total,
      ...(artifacts !== null
        ? { completedArtifacts: artifacts.completed, totalArtifacts: artifacts.total }
        : {}),
      state,
    };
    const bucket = found.get(id);
    if (bucket) {
      bucket.push(status);
    } else {
      found.set(id, [status]);
    }
  }
  return found;
}

function mergeChanges(
  target: Map<string, ServingChangeStatus[]>,
  source: Map<string, ServingChangeStatus[]>
): void {
  for (const [id, changes] of source) {
    const bucket = target.get(id);
    if (bucket) {
      bucket.push(...changes);
    } else {
      target.set(id, changes);
    }
  }
}

/**
 * Rolls up a root's downstream work: the root's upstream candidates, plus
 * every change on this machine that serves one of them. Local serving
 * changes match `serves: <id>` (or `<own-store-id>/<id>`); when the root is
 * a registered store, other registered roots and linked repos are scanned
 * for `<that id>/<id>`. A change that itself serves something is downstream
 * work — it only gets its own row when something serves IT, so rollups of
 * busy repos are not noise. Ids referenced by serving changes but missing
 * on disk are included with `exists: false` — a bad reference should be
 * visible, not silently dropped; archived upstream changes are included
 * with `archived: true`. Returns null when the root has no changes folder.
 */
export async function rollupDownstream(
  root: string,
  options: { globalDataDir?: string; extraRoots?: string[] } = {}
): Promise<DownstreamRollup | null> {
  const changesDir = changesDirOf(root);
  let ownEntries;
  try {
    ownEntries = await fs.readdir(changesDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const allOwnChanges = ownEntries
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .sort();
  const servingOwnChanges = new Set<string>();
  for (const id of allOwnChanges) {
    if ((await readServesRef(path.join(changesDir, id))) !== null) {
      servingOwnChanges.add(id);
    }
  }

  const registry = await readStoreRegistryState(
    options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
  ).catch(() => null);
  const registered = registry ? listStoreRegistryEntries(registry) : [];

  // Which registered store, if any, is this root?
  const resolvedRoot = path.resolve(root);
  let ownStoreId: string | undefined;
  const storeRoots: Array<{ id: string; root: string }> = [];
  for (const entry of registered) {
    try {
      const entryRoot = path.resolve(getStoreRootForBackend(entry.backend));
      storeRoots.push({ id: entry.id, root: entryRoot });
      if (entryRoot === resolvedRoot) {
        ownStoreId = entry.id;
      }
    } catch {
      // Unusable backend — skipped; doctor reports it.
    }
  }

  // A ref addresses this root as `<id>` from its own changes, or as
  // `<own-store-id>/<id>` from anywhere.
  const ownPrefix = ownStoreId !== undefined ? `${ownStoreId}/` : null;
  const byId = await collectServingChanges(
    root,
    (ref) => {
      if (!ref.includes('/')) return ref;
      if (ownPrefix !== null && ref.startsWith(ownPrefix)) {
        return ref.slice(ownPrefix.length);
      }
      return null;
    },
    undefined
  );

  if (ownStoreId !== undefined && ownPrefix !== null) {
    const toOwnId = (ref: string) =>
      ref.startsWith(ownPrefix) ? ref.slice(ownPrefix.length) : null;
    const scanned = new Set([resolvedRoot]);
    for (const store of storeRoots) {
      if (scanned.has(store.root)) continue;
      scanned.add(store.root);
      mergeChanges(
        byId,
        await collectServingChanges(store.root, toOwnId, { store: store.id })
      );
    }
    // Plain code repos that linked a change here (recorded at link time),
    // plus any roots handed in explicitly (--scan on a machine with no
    // per-machine state, like CI).
    const passedRoots = (options.extraRoots ?? []).map((entry) => path.resolve(entry));
    for (const linkedRoot of [
      ...(await readLinkedRoots(
        options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
      )),
      ...passedRoots,
    ]) {
      if (scanned.has(linkedRoot)) continue;
      scanned.add(linkedRoot);
      mergeChanges(
        byId,
        await collectServingChanges(linkedRoot, toOwnId, {
          repo: path.basename(linkedRoot),
        })
      );
    }
  }

  const upstream: UpstreamChangeInfo[] = [];
  const addUpstream = (id: string, exists: boolean, archived: boolean) => {
    const changes = (byId.get(id) ?? []).sort((a, b) => a.id.localeCompare(b.id));
    let changesComplete = 0;
    let tasksComplete = 0;
    let tasksTotal = 0;
    for (const change of changes) {
      tasksComplete += change.completedTasks;
      tasksTotal += change.totalTasks;
      if (change.state === 'complete') changesComplete += 1;
    }
    upstream.push({
      id,
      exists,
      archived,
      changes,
      changesComplete,
      changesTotal: changes.length,
      tasksComplete,
      tasksTotal,
    });
  };

  for (const id of allOwnChanges) {
    // Downstream work only earns an upstream row when something serves it.
    if (servingOwnChanges.has(id) && !byId.has(id)) continue;
    addUpstream(id, true, false);
  }
  const known = new Set(allOwnChanges);
  for (const id of [...byId.keys()].sort()) {
    if (known.has(id)) continue;
    const located = await locateChange(root, id);
    addUpstream(id, located !== null, located?.archived ?? false);
  }

  return { path: changesDir, upstream };
}

/**
 * The rollups of every registered store that has one. This is the
 * outside-a-root answer to "where does everything stand": shared planning
 * sits above repos, so asking it should not require standing in one.
 */
export async function rollupRegisteredStores(
  options: { globalDataDir?: string } = {}
): Promise<Array<{ store: string; rollup: DownstreamRollup }>> {
  const registry = await readStoreRegistryState(
    options.globalDataDir ? { globalDataDir: options.globalDataDir } : {}
  ).catch(() => null);
  const registered = registry ? listStoreRegistryEntries(registry) : [];

  const rollups: Array<{ store: string; rollup: DownstreamRollup }> = [];
  for (const entry of registered) {
    let root;
    try {
      root = getStoreRootForBackend(entry.backend);
    } catch {
      continue; // Unusable backend — skipped; doctor reports it.
    }
    const rollup = await rollupDownstream(root, options);
    if (rollup !== null && rollup.upstream.length > 0) {
      rollups.push({ store: entry.id, rollup });
    }
  }
  return rollups;
}

/**
 * Expands `--scan` arguments into candidate roots: the directory itself
 * when it is an OpenSpec root, plus every immediate subdirectory that is
 * one. Stateless by design — a CI checkout directory needs no
 * registration to be rolled up.
 */
export async function expandScanDirs(dirs: string[]): Promise<string[]> {
  const roots: string[] = [];
  for (const dir of dirs) {
    const resolved = path.resolve(dir);
    const isRoot = async (candidate: string): Promise<boolean> => {
      try {
        return (await fs.stat(path.join(candidate, 'openspec', 'changes'))).isDirectory();
      } catch {
        return false;
      }
    };
    if (await isRoot(resolved)) {
      roots.push(resolved);
    }
    let entries;
    try {
      entries = await fs.readdir(resolved, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const candidate = path.join(resolved, entry.name);
      if (await isRoot(candidate)) {
        roots.push(candidate);
      }
    }
  }
  return roots;
}

export interface ResolvedUpstreamLink {
  /** The reference as written: `<change>` or `<store-id>/<change>`. */
  ref: string;
  changeId: string;
  /** Present when the ref is store-qualified. */
  store?: string;
  /** Absolute path to the upstream change; null when not found on disk. */
  path: string | null;
  /** True when the upstream change has been archived. */
  archived: boolean;
}

/**
 * Resolves a change's `serves:` link to the upstream change it points at, so
 * instruction surfaces can hand the agent the actual upstream context. A ref
 * that resolves to no change still returns (with `path: null`) — a stale
 * link should be visible, not silently dropped.
 */
export async function resolveUpstreamLink(
  changeDir: string,
  root: string,
  options: StorePathOptions = {}
): Promise<ResolvedUpstreamLink | null> {
  const ref = await readServesRef(changeDir);
  if (ref === null) return null;

  const slash = ref.indexOf('/');
  const store = slash === -1 ? undefined : ref.slice(0, slash);
  const changeId = slash === -1 ? ref : ref.slice(slash + 1);

  let upstreamRoot: string | null = slash === -1 ? root : null;
  if (store !== undefined) {
    const registry = await readStoreRegistryState(options).catch(() => null);
    const entry = registry?.stores[store];
    if (entry) {
      try {
        upstreamRoot = getStoreRootForBackend(entry.backend);
      } catch {
        // Unusable backend — the link renders with path: null.
      }
    }
  }

  const located =
    upstreamRoot !== null ? await locateChange(upstreamRoot, changeId) : null;

  return {
    ref,
    changeId,
    ...(store !== undefined ? { store } : {}),
    path: located?.path ?? null,
    archived: located?.archived ?? false,
  };
}
