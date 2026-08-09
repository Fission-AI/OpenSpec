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

function occurrences(body: string, fragment: string): number {
  return body.split(fragment).length - 1;
}

describe('schema selection guidance', () => {
  it('defines the complete fail-closed selection and confirmation contract', () => {
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('openspec schemas --json');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('openspec context --json');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      'openspec context --json --store "<store-id>"'
    );
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('returned `root.path`');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('local `store:` pointer');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('global `defaultStore`');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('`schemas` does not accept `--store`');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('no_openspec_root');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain(
      'Do not use this fallback for invalid or unavailable stores'
    );
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
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('rejects a recommendation');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('cannot be parsed');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('returns no schemas');
    expect(SCHEMA_SELECTION_GUIDANCE).toContain('Do not fall back to the default');
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
