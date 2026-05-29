import { describe, expect, it } from 'vitest';

import {
  INITIATIVE_COLLECTION_ID,
  INITIATIVE_FILE_NAME,
  INITIATIVE_FILE_NAMES,
  INITIATIVE_MARKDOWN_FILE_NAMES,
  INITIATIVE_STATUSES,
  isValidInitiativeId,
  parseInitiativeState,
  serializeInitiativeState,
  validateInitiativeId,
  type InitiativeState,
} from '../../../../src/core/collections/initiatives/index.js';

describe('initiative schema', () => {
  const state: InitiativeState = {
    version: 1,
    id: 'launch-billing-flow',
    title: 'Launch Billing Flow',
    summary: 'Coordinate billing launch across product, API, and client surfaces.',
    status: 'exploring',
    created: '2026-05-21',
    owners: ['platform-team'],
    metadata: {
      priority: 'high',
      nested: {
        score: 3,
        blocked: false,
        notes: null,
      },
    },
  };

  it('defines the initiative MVP file contract without links.yaml', () => {
    expect(INITIATIVE_COLLECTION_ID).toBe('initiatives');
    expect(INITIATIVE_FILE_NAME).toBe('initiative.yaml');
    expect(INITIATIVE_STATUSES).toEqual(['exploring', 'active', 'complete', 'archived']);
    expect(INITIATIVE_MARKDOWN_FILE_NAMES).toEqual([
      'requirements.md',
      'design.md',
      'decisions.md',
      'questions.md',
      'tasks.md',
    ]);
    expect(INITIATIVE_FILE_NAMES).toEqual([
      'initiative.yaml',
      'requirements.md',
      'design.md',
      'decisions.md',
      'questions.md',
      'tasks.md',
    ]);
    expect(INITIATIVE_FILE_NAMES).not.toContain('links.yaml');
  });

  it('validates portable initiative ids', () => {
    for (const id of ['launch-billing-flow', 'initiative2', 'api-v2-contracts']) {
      expect(validateInitiativeId(id)).toBe(id);
      expect(isValidInitiativeId(id)).toBe(true);
    }
  });

  it('rejects unsafe initiative ids', () => {
    for (const id of [
      '',
      '.',
      '..',
      'bad/name',
      'bad\\name',
      'Launch',
      'launch_flow',
      'launch.flow',
      'launch flow',
      '-launch',
      'launch-',
      'launch--flow',
      'a\0b',
    ]) {
      expect(() => validateInitiativeId(id)).toThrow();
      expect(isValidInitiativeId(id)).toBe(false);
    }
  });

  it('parses initiative.yaml and defaults optional collection metadata', () => {
    expect(
      parseInitiativeState(`
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: active
created: "2026-05-21"
`)
    ).toEqual({
      version: 1,
      id: 'launch-billing-flow',
      title: 'Launch Billing Flow',
      summary: 'Coordinate billing launch.',
      status: 'active',
      created: '2026-05-21',
      owners: [],
      metadata: {},
    });
  });

  it('serializes initiative.yaml with deterministic fields', () => {
    const serialized = serializeInitiativeState(state);

    expect(parseInitiativeState(serialized)).toEqual(state);
    expect(serialized).toContain('version: 1');
    expect(serialized).toContain('id: launch-billing-flow');
    expect(serialized).toContain('created: 2026-05-21');
  });

  it('rejects invalid initiative.yaml input', () => {
    const invalidCases = [
      'not-an-object',
      `
version: 2
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: exploring
created: "2026-05-21"
`,
      `
version: 1
id: Launch
title: Launch Billing Flow
summary: Coordinate billing launch.
status: exploring
created: "2026-05-21"
`,
      `
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: paused
created: "2026-05-21"
`,
      `
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: exploring
`,
      `
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: exploring
created: "05/21/2026"
`,
      `
version: 1
id: launch-billing-flow
title: ""
summary: Coordinate billing launch.
status: exploring
created: "2026-05-21"
`,
      `
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: exploring
created: "2026-05-21"
owners: [""]
`,
      `
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: Coordinate billing launch.
status: exploring
created: "2026-05-21"
extra: nope
`,
    ];

    for (const content of invalidCases) {
      expect(() => parseInitiativeState(content)).toThrow();
    }
  });

  it('rejects non-json metadata values on serialize', () => {
    expect(() =>
      serializeInitiativeState({
        ...state,
        metadata: {
          notFinite: Number.NaN,
        },
      })
    ).toThrow(/metadata/u);
  });
});
