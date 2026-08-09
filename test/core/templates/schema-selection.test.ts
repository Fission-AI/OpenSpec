import { describe, expect, it } from 'vitest';

import {
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { SCHEMA_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/schema-selection.js';

const creationBodies: Array<[string, string]> = [
  ['new skill', getNewChangeSkillTemplate().instructions],
  ['new command', getOpsxNewCommandTemplate().content],
  ['propose skill', getOpsxProposeSkillTemplate().instructions],
  ['propose command', getOpsxProposeCommandTemplate().content],
  ['ff skill', getFfChangeSkillTemplate().instructions],
  ['ff command', getOpsxFfCommandTemplate().content],
];

const proposeBodies = creationBodies.filter(([label]) => label.startsWith('propose'));
const nonProposeBodies = creationBodies.filter(
  ([label]) => !label.startsWith('propose')
);

function occurrences(body: string, fragment: string): number {
  return body.split(fragment).length - 1;
}

describe('schema selection guidance', () => {
  it('defines the complete fail-closed selection and confirmation contract', () => {
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('openspec schemas --json');
    expect(SCHEMA_SELECTION_GUIDANCE).not.toContain('openspec context --json');
    expect(SCHEMA_SELECTION_GUIDANCE).not.toContain('root.path');
    expect(SCHEMA_SELECTION_GUIDANCE).not.toContain('defaultStore');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('`description` as the authority');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      '`name` and `artifacts` only to identify, display, and explain candidates'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('exactly one is a clear match');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('treat that choice as confirmed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('stop and wait for confirmation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      "user's current request or the selected schema's description"
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('clearly and unambiguously');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('explicitly asks for confirmation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Never silently use the default schema');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      'If no unique recommendation is possible, stop before creating the change'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      'list the relevant candidates with their descriptions'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('ask the user to choose');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      'If the user rejects a recommendation, stop and list the relevant candidates'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      'If `openspec schemas --json` fails'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('stop and report the problem');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('cannot be parsed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('returns no schemas');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Do not fall back to the default');
  });

  it('keeps authoritative-root discovery compatibility scoped to propose', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('**Schema-discovery root for this workflow:**');
      expect(body, label).toContain('openspec context --json');
      expect(body, label).toContain('root.path');
    }

    for (const [label, body] of nonProposeBodies) {
      expect(body, label).not.toContain('**Schema-discovery root for this workflow:**');
      expect(body, label).not.toContain('openspec context --json');
      expect(body, label).not.toContain('root.path');
    }
  });

  it('appears exactly once before creation in every skill and command body', () => {
    for (const [label, body] of creationBodies) {
      expect(occurrences(body, SCHEMA_SELECTION_GUIDANCE), label).toBe(1);
      expect(body.indexOf(SCHEMA_SELECTION_GUIDANCE), label).toBeLessThan(
        body.indexOf('openspec new change')
      );
    }
  });

  it('always creates with the selected schema explicitly', () => {
    for (const [label, body] of creationBodies) {
      expect(body, label).toContain(
        'openspec new change "<name>" --schema "<schema-name>"'
      );
    }
  });
});
