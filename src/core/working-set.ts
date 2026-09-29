/**
 * Working-set assembly (slice 4.1): the full set a root's declarations
 * describe — the OpenSpec root and its referenced stores — as an
 * agent-consumable brief. A local convenience
 * computed from declared relationships, never a planning system; no
 * clone/sync/launch machinery. Unresolvable members are reported, not
 * guessed.
 */
import type { StoreDiagnostic } from './store/errors.js';
import {
  fetchRecipe,
  isLocalReferenceEntry,
  type ReferenceIndexEntry,
} from './references.js';
import { toRootOutput, type ResolvedOpenSpecRoot } from './root-selection.js';

export type WorkingSetRole = 'referenced_store' | 'local_root';

export interface WorkingSetMember {
  role: WorkingSetRole;
  id: string;
  path?: string;
  remote?: string;
  fetch?: string;
  status: StoreDiagnostic[];
}

export interface WorkingSet {
  root: {
    path: string;
    source: ResolvedOpenSpecRoot['source'];
    store_id?: string;
    role: 'openspec_root';
  };
  members: WorkingSetMember[];
  status: StoreDiagnostic[];
}

export interface AssembleWorkingSetInput {
  root: ResolvedOpenSpecRoot;
  referenceEntries: ReferenceIndexEntry[];
  /** The composition's top-level status; the working set keeps only
   * the registry-unreadable degradation (selected by code, never by
   * position). */
  topLevelStatus?: StoreDiagnostic[];
}

/** A truncated index still resolves to a usable member. */
export function isAvailableMember(member: WorkingSetMember): boolean {
  return member.path !== undefined && member.status.every(
    (diagnostic) => diagnostic.code === 'reference_index_truncated'
  );
}

export function assembleWorkingSet(input: AssembleWorkingSetInput): WorkingSet {
  const members: WorkingSetMember[] = [];

  for (const entry of input.referenceEntries) {
    if (isLocalReferenceEntry(entry)) {
      members.push({
        role: 'local_root',
        id: entry.local_path,
        ...(entry.root !== undefined ? { path: entry.root } : {}),
        status: entry.status,
      });
      continue;
    }
    const member: WorkingSetMember = {
      role: 'referenced_store',
      id: entry.store_id,
      ...(entry.root !== undefined ? { path: entry.root } : {}),
      status: entry.status,
    };
    if (isAvailableMember(member)) {
      member.fetch = fetchRecipe(entry.store_id);
    }
    members.push(member);
  }

  const status = (input.topLevelStatus ?? []).filter(
    (entry) => entry.code === 'relationship_registry_unreadable'
  );

  return {
    root: { ...toRootOutput(input.root), role: 'openspec_root' },
    members,
    status,
  };
}

/**
 * Pure builder for the `.code-workspace` editor view — one consumer of
 * assembly, not the feature. Available members only.
 */
export function buildCodeWorkspaceJson(workingSet: WorkingSet, rootName: string): string {
  const folders: Array<{ name: string; path: string }> = [
    { name: rootName, path: workingSet.root.path },
  ];

  for (const member of workingSet.members) {
    if (!isAvailableMember(member)) {
      continue;
    }
    folders.push({
      name: member.role === 'local_root' ? `local:${member.id}` : `ref:${member.id}`,
      path: member.path!,
    });
  }

  return JSON.stringify({ folders }, null, 2) + '\n';
}
