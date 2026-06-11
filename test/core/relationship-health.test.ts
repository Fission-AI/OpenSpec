import { describe, expect, it } from 'vitest';

import { inspectRelationships } from '../../src/core/relationship-health.js';
import { assembleTargets } from '../../src/core/targets.js';
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
    effectiveTargets: null,
    registryUnreadable: false,
  };
}

describe('relationship health composition (3.6)', () => {
  it('reports a clean four-section shape with null targets normalized to empty', () => {
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
      targets: [],
      status: [],
    });
  });

  it('marks unmapped targets with the register fix', () => {
    const health = inspectRelationships({
      ...baseInput(),
      effectiveTargets: assembleTargets({
        storeTargets: [{ id: 'api-server' }, { id: 'web-app' }],
        repoPaths: new Map([['api-server', '/src/api']]),
      }),
    });

    expect(health.targets).toEqual([
      { id: 'api-server', path: '/src/api', status: [] },
      {
        id: 'web-app',
        status: [
          expect.objectContaining({
            severity: 'warning',
            code: 'target_unmapped',
            fix: 'Run: openspec repo register <path> --id web-app',
          }),
        ],
      },
    ]);
  });

  it('suppresses target_unmapped under an unreadable registry', () => {
    const health = inspectRelationships({
      ...baseInput(),
      registryUnreadable: true,
      effectiveTargets: assembleTargets({ storeTargets: [{ id: 'web-app' }] }),
    });

    expect(health.status[0]).toEqual(
      expect.objectContaining({ code: 'relationship_registry_unreadable' })
    );
    expect(health.targets).toEqual([{ id: 'web-app', status: [] }]);
  });

  it('synthesizes bare entries for grammar-invalid declared targets', () => {
    const health = inspectRelationships({
      ...baseInput(),
      storeTargets: [{ id: 'API Server' }, { id: 'web-app' }],
      effectiveTargets: assembleTargets({
        storeTargets: [{ id: 'API Server' }, { id: 'web-app' }],
      }),
    });

    const invalid = health.targets.find((entry) => entry.id === 'API Server');
    expect(invalid?.status[0]).toEqual(
      expect.objectContaining({ code: 'target_invalid_id' })
    );
  });

  it('surfaces both-shapes and inert-pointer wrong turns at top level', () => {
    const health = inspectRelationships({
      ...baseInput(),
      bothShapesPointer: { value: 'team-context', filePath: '/repo/openspec/config.yaml' },
      inertPointerDeclarations: {
        filePath: '/app/openspec/config.yaml',
        fields: ['targets', 'references'],
      },
    });

    expect(health.status.map((entry) => entry.code)).toEqual([
      'root_pointer_ignored',
      'pointer_declarations_inert',
    ]);
    expect(health.status[1].message).toContain('targets and references');
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
