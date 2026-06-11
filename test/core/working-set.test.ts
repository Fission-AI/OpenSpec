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
  it('maps members per the table: available, unmapped, stale, invalid, bare', () => {
    const workingSet = assembleWorkingSet({
      root,
      referenceEntries: [
        { store_id: 'up', root: '/up', status: [] },
        { store_id: 'ghost', status: [warn('reference_unresolved')] },
      ],
      targets: [
        { id: 'api-server', path: '/src/api', status: [] },
        { id: 'web-app', status: [warn('target_unmapped')] },
        { id: 'stale-repo', path: '/gone', status: [warn('target_path_missing')] },
        { id: 'Bad Id', status: [warn('target_invalid_id')] },
        { id: 'bare-under-unreadable', status: [] },
      ],
      topLevelStatus: [warn('relationship_registry_unreadable')],
    });

    expect(workingSet.root).toEqual({
      path: '/team/store',
      source: 'store',
      store_id: 'team-context',
      role: 'openspec_root',
    });
    // References before targets, declaration order, synthesized appended.
    expect(workingSet.members.map((member) => member.id)).toEqual([
      'up',
      'ghost',
      'api-server',
      'web-app',
      'stale-repo',
      'Bad Id',
      'bare-under-unreadable',
    ]);
    // Fetch recipe only on available references.
    expect(workingSet.members[0].fetch).toBe(
      'openspec show <spec-id> --type spec --store up'
    );
    expect('fetch' in workingSet.members[1]).toBe(false);
    // Availability rule: path AND empty status.
    expect(workingSet.members.filter(isAvailableMember).map((m) => m.id)).toEqual([
      'up',
      'api-server',
    ]);
    // A bare member with no path and no status is NOT available.
    expect(isAvailableMember(workingSet.members[6])).toBe(false);
    // Registry degradation selected by code, never position.
    expect(workingSet.status.map((entry) => entry.code)).toEqual([
      'relationship_registry_unreadable',
    ]);
  });

  it('selects the registry diagnostic by code among other status entries', () => {
    const workingSet = assembleWorkingSet({
      root,
      referenceEntries: [],
      targets: [],
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
      targets: [{ id: 'api-server', path: '/src/api', status: [] }],
    });

    const file = JSON.parse(buildCodeWorkspaceJson(workingSet, 'team-context'));
    expect(file).toEqual({
      folders: [
        { name: 'team-context', path: '/team/store' },
        { name: 'ref:up', path: '/up' },
        { name: 'repo:api-server', path: '/src/api' },
      ],
    });
    expect(buildCodeWorkspaceJson(workingSet, 'team-context').endsWith('\n')).toBe(true);
  });
});
