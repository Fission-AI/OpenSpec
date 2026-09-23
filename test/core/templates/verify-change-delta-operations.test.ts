import { describe, expect, it } from 'vitest';

import {
  getVerifyChangeSkillTemplate,
  getOpsxVerifyCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

// #1959: verify treated every "### Requirement:" in a change's delta specs as
// behavior that must exist, whichever section it sat under. A REMOVED
// requirement that was removed correctly came back as CRITICAL "Requirement not
// found" with the recommendation to implement it, so an agent following the
// report restored what the change had just deleted.
const bodies: Array<[string, string]> = [
  ['skill', getVerifyChangeSkillTemplate().instructions],
  ['command', getOpsxVerifyCommandTemplate().content],
];

function section(body: string, start: string, end: string, label: string): string {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  expect(from, `${label}: "${start}" not found`).toBeGreaterThanOrEqual(0);
  expect(to, `${label}: "${end}" not found after "${start}"`).toBeGreaterThan(from);
  return body.slice(from, to);
}

describe('verify checks each requirement by its delta operation', () => {
  it.each(bodies)('%s: classifies requirements by delta section before checking them', (label, body) => {
    const coverage = section(body, '**Spec Coverage**', '6. **Verify Correctness**', label);

    for (const header of ['## ADDED', '## MODIFIED', '## REMOVED', '## RENAMED Requirements']) {
      expect(coverage, label).toContain(header);
    }
    // The unscoped loop is what produced the bug.
    expect(coverage, label).not.toMatch(/^\s*- For each requirement:$/m);
  });

  it.each(bodies)('%s: reports a missing requirement only for ADDED or MODIFIED', (label, body) => {
    const coverage = section(body, '**Spec Coverage**', '6. **Verify Correctness**', label);
    const addedOrModified = section(coverage, '- For each ADDED or MODIFIED requirement', '- For each REMOVED requirement', label);

    expect(addedOrModified, label).toContain('Add CRITICAL issue: "Requirement not found: <requirement name>"');
  });

  it.each(bodies)('%s: inverts the check for a REMOVED requirement', (label, body) => {
    const coverage = section(body, '**Spec Coverage**', '6. **Verify Correctness**', label);
    const removed = section(coverage, '- For each REMOVED requirement', '- A RENAMED entry', label);

    expect(removed, label).toContain('Finding no implementation is the expected result.');
    expect(removed, label).toContain('Never report a REMOVED requirement as "Requirement not found"');
    expect(removed, label).toContain('Add CRITICAL issue: "Removed requirement still implemented: <requirement name>"');
    expect(removed, label).not.toContain('Recommendation: "Implement');
  });

  it.each(bodies)('%s: does not report the old name of a RENAMED requirement as missing', (label, body) => {
    const coverage = section(body, '**Spec Coverage**', '6. **Verify Correctness**', label);

    expect(coverage, label).toContain('Do not report the FROM name as missing.');
  });

  it.each(bodies)('%s: maps implementation and scenarios only for ADDED or MODIFIED requirements', (label, body) => {
    const correctness = section(body, '6. **Verify Correctness**', '7. **Verify Coherence**', label);

    expect(correctness, label).toContain('- For each ADDED or MODIFIED requirement from delta specs');
    expect(correctness, label).toContain('- For each scenario under an ADDED or MODIFIED requirement in delta specs');
    expect(correctness, label).toContain('Skip scenarios under a REMOVED requirement');
    expect(correctness, label).not.toContain('- For each requirement from delta specs:');
    expect(correctness, label).not.toContain('- For each scenario in delta specs');
  });
});
