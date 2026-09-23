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
  // With #1732's "Not verified" rule, a change with nothing to add or modify
  // left both correctness checks empty, which read as unverified and withheld
  // readiness. That is the exact case #1959 reports.
  it.each(bodies)('%s: treats the correctness checks of a removal-only change as not applicable', (label, body) => {
    const correctness = section(body, '6. **Verify Correctness**', '**Requirement Implementation Mapping**:', label);

    expect(correctness, label).toContain('If the delta specs are readable and contain at least one REMOVED or RENAMED requirement but no ADDED or MODIFIED requirements');
    // An empty or unparseable delta must not pass as a removal-only change.
    expect(correctness, label).toContain('A delta spec with no parseable requirements at all is unusable evidence, not a removal-only change: mark these checks as not verified.');
    expect(correctness, label).toContain('report **Requirement Implementation Mapping** and **Scenario Coverage** as **Not applicable**');
    expect(correctness, label).toContain('do not mark these two checks as not verified');
    expect(body, label).toContain('The correctness checks of a change whose readable delta specs contain REMOVED or RENAMED requirements but no ADDED or MODIFIED requirements are also **Not applicable** (see step 6).');
  });

  it.each(bodies)('%s: does not treat artifacts or replacement code as the removed behavior', (label, body) => {
    const removed = section(body, '- For each REMOVED requirement', '- A RENAMED entry', label);

    expect(removed, label).toContain('Matches in `openspec/` artifacts or docs, or in code that serves only the Migration note or an ADDED requirement, are not evidence by themselves.');
    expect(removed, label).toContain('Report any code path that still delivers the removed behavior, including one shared with an ADDED requirement.');
  });

  it.each(bodies)('%s: counts removals separately from covered requirements', (label, body) => {
    expect(body, label).toContain('Count only ADDED and MODIFIED requirements in N, and report REMOVED requirements separately');
    expect(body, label).toContain('the Correctness cell reads `Not applicable (no ADDED or MODIFIED requirements)`');
  });
});
