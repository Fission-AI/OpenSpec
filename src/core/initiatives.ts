/**
 * Initiatives (stores beta).
 *
 * An initiative is the home for a big effort: a brief, the artifacts the team
 * works from, and the changes that carry it out. It is a plain folder under
 * `openspec/initiatives/<id>/` with an `initiative.yaml` manifest that names
 * the changes it groups.
 *
 * This module lists initiatives, rolls up the live status of the changes each
 * one groups (reusing the same task-progress source as `openspec list`), and
 * detects when a local initiative shadows a canonical one in a referenced
 * store. Precedence rule: the store initiative is canonical; a same-id local
 * one is a shadow that is reported but never blocked — mirroring how OpenSpec
 * reports schema shadowing.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

import { getTaskProgressForChange } from '../utils/task-progress.js';
import { readProjectConfig } from './project-config.js';
import {
  listStoreRegistryEntries,
  readStoreRegistryState,
} from './store/foundation.js';
import { getStoreRootForBackend } from './store/registry.js';

export const INITIATIVES_DIRNAME = 'initiatives';
const INITIATIVE_MANIFEST = 'initiative.yaml';

export interface InitiativeInfo {
  id: string;
  title: string;
  /** Change ids this initiative groups. */
  changes: string[];
  /** Rolled-up status of the grouped changes. */
  changesComplete: number;
  changesTotal: number;
  tasksComplete: number;
  tasksTotal: number;
  /** Set when a same-id canonical initiative exists in a referenced store. */
  shadowsStore?: string;
}

interface InitiativeManifest {
  title?: string;
  changes?: string[];
}

function initiativesDir(root: string): string {
  return path.join(root, 'openspec', INITIATIVES_DIRNAME);
}

/**
 * Reads an initiative's manifest. Returns null when the folder has no
 * `initiative.yaml` (a plain folder that is not yet a tracked initiative).
 */
async function readManifest(
  dir: string
): Promise<InitiativeManifest | null> {
  const manifestPath = path.join(dir, INITIATIVE_MANIFEST);
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    return null;
  }
  try {
    const parsed = parseYaml(raw) as InitiativeManifest | null;
    return parsed ?? {};
  } catch {
    return {};
  }
}

/** Lists initiative folder ids under a root's `openspec/initiatives/`. */
async function listInitiativeIds(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(initiativesDir(root), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Resolves the on-disk roots of the stores this root references and that are
 * registered on this machine. Read-only; unregistered/invalid references are
 * skipped (they surface through `openspec doctor`, not here).
 */
async function referencedStoreRoots(
  root: string,
  globalDataDir?: string
): Promise<Array<{ id: string; root: string }>> {
  const config = readProjectConfig(root);
  const references = config?.references ?? [];
  if (references.length === 0) {
    return [];
  }

  const registry = await readStoreRegistryState(
    globalDataDir ? { globalDataDir } : {}
  );
  const entries = registry ? listStoreRegistryEntries(registry) : [];

  const roots: Array<{ id: string; root: string }> = [];
  for (const reference of references) {
    const entry = entries.find((candidate) => candidate.id === reference.id);
    if (!entry) continue;
    try {
      roots.push({ id: reference.id, root: getStoreRootForBackend(entry.backend) });
    } catch {
      // Unusable backend — skipped; doctor reports it.
    }
  }
  return roots;
}

/**
 * Builds the shadow lookup: for each referenced store, the set of initiative
 * ids it defines. A local initiative whose id appears here shadows the store's
 * canonical one.
 */
async function buildShadowLookup(
  root: string,
  globalDataDir?: string
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  const stores = await referencedStoreRoots(root, globalDataDir);
  for (const store of stores) {
    for (const id of await listInitiativeIds(store.root)) {
      // First referenced store to define an id is named as canonical.
      if (!lookup.has(id)) {
        lookup.set(id, store.id);
      }
    }
  }
  return lookup;
}

/**
 * Lightweight id + title for each initiative at a root — no change rollup and
 * no shadow detection. Used to index a referenced store's initiatives without
 * the cost of resolving that store's own references.
 */
export async function listInitiativeSummaries(
  root: string
): Promise<Array<{ id: string; title: string }>> {
  const ids = await listInitiativeIds(root);
  const summaries: Array<{ id: string; title: string }> = [];
  for (const id of ids) {
    const manifest = await readManifest(path.join(initiativesDir(root), id));
    if (manifest === null) continue;
    summaries.push({ id, title: manifest.title ?? id });
  }
  summaries.sort((a, b) => a.id.localeCompare(b.id));
  return summaries;
}

/**
 * Lists the initiatives at a root, with rolled-up change status and shadow
 * detection against referenced stores.
 */
export async function listInitiatives(
  root: string,
  options: { globalDataDir?: string } = {}
): Promise<InitiativeInfo[]> {
  const ids = await listInitiativeIds(root);
  if (ids.length === 0) {
    return [];
  }

  const changesDir = path.join(root, 'openspec', 'changes');
  const shadows = await buildShadowLookup(root, options.globalDataDir);
  const initiatives: InitiativeInfo[] = [];

  for (const id of ids) {
    const manifest = await readManifest(path.join(initiativesDir(root), id));
    if (manifest === null) {
      // A plain folder without a manifest is not a tracked initiative.
      continue;
    }

    const changes = manifest.changes ?? [];
    let changesComplete = 0;
    let tasksComplete = 0;
    let tasksTotal = 0;

    for (const changeId of changes) {
      const progress = await getTaskProgressForChange(changesDir, changeId);
      tasksComplete += progress.completed;
      tasksTotal += progress.total;
      if (progress.total > 0 && progress.completed === progress.total) {
        changesComplete += 1;
      }
    }

    initiatives.push({
      id,
      title: manifest.title ?? id,
      changes,
      changesComplete,
      changesTotal: changes.length,
      tasksComplete,
      tasksTotal,
      ...(shadows.has(id) ? { shadowsStore: shadows.get(id) } : {}),
    });
  }

  initiatives.sort((a, b) => a.id.localeCompare(b.id));
  return initiatives;
}
