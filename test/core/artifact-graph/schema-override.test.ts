import { describe, expect, it } from 'vitest';
import {
  applySchemaOverride,
  parseSchemaOverride,
  SchemaOverrideValidationError,
} from '../../../src/core/artifact-graph/schema.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';

function baseSchema(): SchemaYaml {
  return {
    name: 'spec-driven',
    version: 1,
    description: 'Packaged description',
    artifacts: [
      {
        id: 'proposal',
        generates: 'proposal.md',
        description: 'Proposal',
        template: 'proposal.md',
        instruction: 'Packaged proposal instruction',
        requires: [],
      },
      {
        id: 'design',
        generates: 'design.md',
        description: 'Design',
        template: 'design.md',
        instruction: 'Packaged design instruction',
        requires: ['proposal'],
      },
      {
        id: 'tasks',
        generates: 'tasks.md',
        description: 'Tasks',
        template: 'tasks.md',
        instruction: 'Packaged tasks instruction',
        requires: ['proposal', 'design'],
      },
    ],
    apply: {
      requires: ['tasks'],
      tracks: 'tasks.md',
      instruction: 'Packaged apply instruction',
    },
  };
}

describe('schema override', () => {
  it('supports a no-op patch', () => {
    const effective = applySchemaOverride(
      baseSchema(),
      parseSchemaOverride('patchVersion: 1\n')
    );

    expect(effective).toEqual(baseSchema());
  });

  it('keeps package updates for fields the overlay does not replace', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    instruction:
      append: Personal rules
`);
    const updatedBase = baseSchema();
    updatedBase.artifacts[0].instruction = 'Updated packaged proposal instruction';
    updatedBase.artifacts[2].instruction = 'Updated packaged tasks instruction';

    const effective = applySchemaOverride(updatedBase, override);

    expect(effective.artifacts[0].instruction).toBe(
      'Updated packaged proposal instruction'
    );
    expect(effective.artifacts[2].instruction).toBe(
      'Updated packaged tasks instruction\n\nPersonal rules'
    );
  });

  it('prepends and appends instruction text with one blank line', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    instruction:
      prepend: Personal preface
      append: Personal rules
`);

    const effective = applySchemaOverride(baseSchema(), override);

    expect(effective.artifacts[2].instruction).toBe(
      'Personal preface\n\nPackaged tasks instruction\n\nPersonal rules'
    );
  });

  it('replaces instruction text without retaining the packaged value', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    instruction:
      replace: Personal replacement
`);

    expect(applySchemaOverride(baseSchema(), override).artifacts[2].instruction).toBe(
      'Personal replacement'
    );
  });

  it('replaces scalar fields and applies ordered dependency removal and addition', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
description: Effective description
artifacts:
  tasks:
    description: Effective tasks
    template: personal-tasks.md
    requires:
      remove: [design]
      add: [proposal]
`);

    expect(() => applySchemaOverride(baseSchema(), override)).toThrow(
      /cannot add duplicate value 'proposal'/u
    );

    expect(() => parseSchemaOverride(`
patchVersion: 1
description: Effective description
artifacts:
  tasks:
    description: Effective tasks
    template: personal-tasks.md
    requires:
      remove: [proposal]
      add: [proposal]
`)).toThrow(
      /both added and removed/u
    );

    const replaceOverride = parseSchemaOverride(`
patchVersion: 1
description: Effective description
artifacts:
  tasks:
    description: Effective tasks
    template: personal-tasks.md
    requires:
      replace: [design]
`);
    const effective = applySchemaOverride(baseSchema(), replaceOverride);
    expect(effective.description).toBe('Effective description');
    expect(effective.artifacts[2]).toMatchObject({
      description: 'Effective tasks',
      template: 'personal-tasks.md',
      requires: ['design'],
    });
  });

  it('applies additive dependency operations in deterministic order', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    requires:
      remove: [proposal]
      add: []
`);

    expect(applySchemaOverride(baseSchema(), override).artifacts[2].requires).toEqual([
      'design',
    ]);
  });

  it('rejects ambiguous and misspelled operations', () => {
    expect(() => parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    instruction:
      replace: replacement
      append: addition
`)).toThrow(/replace cannot be combined/u);

    expect(() => parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    instructions:
      append: typo
`)).toThrow(/Unrecognized key/u);

    expect(() => parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    requires:
      add: [proposal, proposal]
`)).toThrow(/duplicate entries/u);
  });

  it('rejects unknown artifacts and absent removals', () => {
    const unknown = parseSchemaOverride(`
patchVersion: 1
artifacts:
  review:
    description: Review
`);
    expect(() => applySchemaOverride(baseSchema(), unknown)).toThrow(
      /unknown artifact ID/u
    );

    const absentRemoval = parseSchemaOverride(`
patchVersion: 1
artifacts:
  tasks:
    requires:
      remove: [missing]
`);
    expect(() => applySchemaOverride(baseSchema(), absentRemoval)).toThrow(
      /not present in the base value/u
    );
  });

  it('rejects an effective schema with a cycle', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
artifacts:
  proposal:
    requires:
      add: [tasks]
`);

    expect(() => applySchemaOverride(baseSchema(), override)).toThrow(
      SchemaOverrideValidationError
    );
    expect(() => applySchemaOverride(baseSchema(), override)).toThrow(/Cyclic dependency/u);
  });

  it('supports apply instruction and collection operations', () => {
    const override = parseSchemaOverride(`
patchVersion: 1
apply:
  instruction:
    append: Personal apply rules
  requires:
    replace: [design]
  tracks: null
`);
    const effective = applySchemaOverride(baseSchema(), override);

    expect(effective.apply).toEqual({
      requires: ['design'],
      tracks: null,
      instruction: 'Packaged apply instruction\n\nPersonal apply rules',
    });
  });
});
