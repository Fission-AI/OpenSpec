import { describe, expect, it } from 'vitest';

import {
  assembleWorkingSet,
  buildCodeWorkspaceJson,
  isAvailableMember,
} from '../../src/core/working-set.js';
import type { ResolvedOpenSpecRoot } from '../../src/core/root-selection.js';
import type { StoreDiagnostic } from '../../src/core/store/errors.js';

const root = {
  path: '/team/store',
  source: 'store',
  storeId: 'team-context',
  changesDir: '/team/store/openspec/changes',
  specsDir: '/team/store/openspec/specs',
  archiveDir: '/team/store/openspec/changes/archive',
  defaultSchema: 'spec-driven',
} as ResolvedOpenSpecRoot;

const warn = (code: string): StoreDiagnostic => ({
  severity: 'warning',
  code,
  message: 'x',
  target: 'relationships',
  fix: 'y',
});

describe('working-set assembly (4.1)', () => {
  it('maps referenced stores into available and unavailable members', () => {
    const workingSet = assembleWorkingSet({
      root,
      referenceEntries: [
        { store_id: 'up', root: '/up', status: [] },
        { store_id: 'ghost', status: [warn('reference_unresolved')] },
      ],
      topLevelStatus: [warn('relationship_registry_unreadable')],
    });

    expect(workingSet.root).toEqual({
      path: '/team/store',
      source: 'store',
      store_id: 'team-context',
      role: 'openspec_root',
    });
    expect(workingSet.members.map((member) => member.id)).toEqual(['up', 'ghost']);
    // Fetch recipe only on available references.
    expect(workingSet.members[0].fetch).toBe(
      'openspec show <spec-id> --type spec --store up'
    );
    expect('fetch' in workingSet.members[1]).toBe(false);
    // Availability rule: path AND empty status.
    expect(workingSet.members.filter(isAvailableMember).map((m) => m.id)).toEqual(['up']);
    // Registry degradation selected by code, never position.
    expect(workingSet.status.map((entry) => entry.code)).toEqual([
      'relationship_registry_unreadable',
    ]);
  });

  it('selects the registry diagnostic by code among other status entries', () => {
    const workingSet = assembleWorkingSet({
      root,
      referenceEntries: [],
      topLevelStatus: [warn('root_pointer_ignored'), warn('relationship_registry_unreadable')],
    });
    expect(workingSet.status.map((entry) => entry.code)).toEqual([
      'relationship_registry_unreadable',
    ]);
  });

  it('builds the code-workspace view from available members only, in order', () => {
    const workingSet = assembleWorkingSet({
      root,
      referenceEntries: [
        { store_id: 'up', root: '/up', status: [] },
        { store_id: 'ghost', status: [warn('reference_unresolved')] },
      ],
    });

    const file = JSON.parse(buildCodeWorkspaceJson(workingSet, 'team-context'));
    expect(file).toEqual({
      folders: [
        { name: 'team-context', path: '/team/store' },
        { name: 'ref:up', path: '/up' },
      ],
    });
    expect(buildCodeWorkspaceJson(workingSet, 'team-context').endsWith('\n')).toBe(true);
  });
});
