import { describe, expect, it } from 'vitest';

import { inspectRelationships } from '../../src/core/relationship-health.js';
import type { ResolvedOpenSpecRoot } from '../../src/core/root-selection.js';

const root = {
  path: '/team/store',
  source: 'store',
  storeId: 'team-context',
  changesDir: '/team/store/openspec/changes',
  specsDir: '/team/store/openspec/specs',
  archiveDir: '/team/store/openspec/changes/archive',
  defaultSchema: 'spec-driven',
} as ResolvedOpenSpecRoot;

function baseInput() {
  return {
    root,
    rootHealthy: true,
    referenceEntries: [],
    registryUnreadable: false,
  };
}

describe('relationship health composition (3.6)', () => {
  it('reports a clean relationship shape', () => {
    const health = inspectRelationships(baseInput());

    expect(health).toEqual({
      root: {
        path: '/team/store',
        source: 'store',
        store_id: 'team-context',
        healthy: true,
        status: [],
      },
      store: null,
      references: [],
      status: [],
    });
  });

  it('reports registry unreadable without inventing relationship entries', () => {
    const health = inspectRelationships({
      ...baseInput(),
      registryUnreadable: true,
    });

    expect(health.status[0]).toEqual(
      expect.objectContaining({ code: 'relationship_registry_unreadable' })
    );
  });

  it('surfaces both-shapes and inert-pointer wrong turns at top level', () => {
    const health = inspectRelationships({
      ...baseInput(),
      bothShapesPointer: { value: 'team-context', filePath: '/repo/openspec/config.yaml' },
      inertPointerDeclarations: {
        filePath: '/app/openspec/config.yaml',
        fields: ['references'],
      },
    });

    expect(health.status.map((entry) => entry.code)).toEqual([
      'root_pointer_ignored',
      'pointer_declarations_inert',
    ]);
    expect(health.status[1].message).toContain('references');
  });

  it('notes remote divergence as info in the store section', () => {
    const facts = {
      id: 'team-context',
      metadataPresent: true,
      metadataValid: true,
      canonicalRemote: 'https://192.0.2.1/canon.git',
      originUrl: 'https://192.0.2.2/fork.git',
    };
    const diverged = inspectRelationships({ ...baseInput(), storeFacts: facts });
    expect(diverged.store?.status[0]).toEqual(
      expect.objectContaining({ severity: 'info', code: 'store_remote_divergence' })
    );
    expect(diverged.store?.metadata.remote).toBe('https://192.0.2.1/canon.git');
    expect(diverged.store?.origin_url).toBe('https://192.0.2.2/fork.git');

    const matching = inspectRelationships({
      ...baseInput(),
      storeFacts: { ...facts, originUrl: facts.canonicalRemote },
    });
    expect(matching.store?.status).toEqual([]);

    const absent = inspectRelationships({
      ...baseInput(),
      storeFacts: { id: 'team-context', metadataPresent: true, metadataValid: true },
    });
    expect(absent.store?.status).toEqual([]);
    expect(absent.store?.metadata.remote).toBeUndefined();
  });

  it('passes reference entries through untouched', () => {
    const entries = [
      { store_id: 'up', root: '/up', status: [] },
      {
        store_id: 'ghost',
        status: [
          {
            severity: 'warning' as const,
            code: 'reference_unresolved',
            message: 'x',
            target: 'references',
            fix: 'y',
          },
        ],
      },
    ];
    const health = inspectRelationships({ ...baseInput(), referenceEntries: entries });
    expect(health.references).toBe(entries);
  });
});
