import { readFileSync } from 'node:fs';

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
  // The committed skills.sh mirror is what `npx skills add` installs.
  [
    'committed skill file',
    readFileSync(new URL('../../../skills/openspec-verify-change/SKILL.md', import.meta.url), 'utf8'),
  ],
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

    // RENAMED entries carry no "### Requirement:" heading, so a rename-only
    // delta must not read as empty.
    expect(coverage, label).toContain('or listed as `FROM:`/`TO:` pairs under `## RENAMED Requirements`');
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
    const removed = section(coverage, '- For each REMOVED requirement', '- For each RENAMED entry', label);

    expect(removed, label).toContain('Finding no implementation is the expected result, but only once the baseline behavior was the thing you searched for.');
    expect(removed, label).toContain('Never report a REMOVED requirement as "Requirement not found"');
    expect(removed, label).toContain('Add CRITICAL issue: "Removed requirement still implemented: <requirement name>"');
    expect(removed, label).not.toContain('Recommendation: "Implement');
  });

  it.each(bodies)('%s: does not report the old name of a RENAMED requirement as missing', (label, body) => {
    const renamed = section(body, '- For each RENAMED entry', '6. **Verify Correctness**', label);

    expect(renamed, label).toContain('Do not report the FROM name as missing');
    expect(renamed, label).toContain('do not require code symbols, identifiers, or file names to be renamed');
  });

  // A rename keeps behavior, so a rename-only change must still prove the
  // behavior exists before verify can call it ready. Its evidence is the
  // baseline requirement in the main spec, not the RENAMED entry itself.
  it.each(bodies)('%s: verifies the unchanged behavior of a RENAMED requirement against its baseline', (label, body) => {
    const renamed = section(body, '- For each RENAMED entry', '6. **Verify Correctness**', label);

    expect(renamed, label).toContain('check the TO requirement for that unchanged behavior');
    expect(renamed, label).toContain('`<planningHome.root>/openspec/specs/<capability-path>/spec.md`');
    expect(renamed, label).toContain('the requirement under the FROM name, or under the TO name only when the FROM name is absent because the main spec is already synced.');
    expect(renamed, label).toContain('Its body and scenarios are the evidence for the behavior the TO requirement keeps.');
    expect(renamed, label).toContain('Search codebase for that behavior and assess if it is still implemented.');
    expect(renamed, label).toContain('Add CRITICAL issue: "Renamed requirement not found: <TO name>"');
    expect(body, label).toContain('- Renamed requirements whose behavior is no longer implemented');
    expect(renamed, label).toContain('If the TO name also appears under MODIFIED, its behavior is checked there');
  });

  it.each(bodies)('%s: never counts an unchecked rename as passing', (label, body) => {
    const renamed = section(body, '- For each RENAMED entry', '6. **Verify Correctness**', label);

    expect(renamed, label).toContain('If the baseline requirement cannot be found or read, mark **Spec Coverage** as not verified for that entry');
    expect(renamed, label).toContain('Never count an unchecked rename as passing.');
    expect(body, label).toContain('each REMOVED and RENAMED entry with a usable baseline is checked there against its baseline behavior');
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
    const removed = section(body, '- For each REMOVED requirement', '- For each RENAMED entry', label);

    expect(removed, label).toContain('Matches in `openspec/` artifacts or docs, or in code that serves only the Migration note or an ADDED requirement, are not evidence by themselves.');
    expect(removed, label).toContain('Report any code path that still delivers the removed behavior, including one shared with an ADDED requirement.');
  });

  // #2067: the REMOVED branch said only "search codebase for the removed
  // behavior". A REMOVED block carries just the requirement name plus Reason
  // and Migration notes, so the search started from the heading alone - and
  // because an absent match is the passing result here, an implementation
  // written in different vocabulary read as a clean removal. The RENAMED
  // branch beside it already loaded the baseline from the main spec first.
  it.each(bodies)('%s: reads the removed requirement baseline before searching', (label, body) => {
    const removed = section(body, '- For each REMOVED requirement', '- For each RENAMED entry', label);

    expect(removed, label).toContain('A REMOVED block carries only the requirement name and any `**Reason**`/`**Migration**` notes');
    expect(removed, label).toContain('`<planningHome.root>/openspec/specs/<capability-path>/spec.md`');
    expect(removed, label).toContain('Its body and scenarios are the evidence for the behavior that must be gone');
    expect(removed, label).toContain('never search from the requirement name alone');
    // A literal title lookup misses a differently-worded baseline and gets
    // misread as "the sync already removed it".
    expect(removed, label).toContain('Match it by normalized name');
  });

  // The baseline read, the history fallback and the search have to stay in
  // that order. Each index is checked present first: an unguarded indexOf
  // returns -1, and -1 is less than everything, so a reworded sentence would
  // satisfy a bare ordering comparison and silently retire this guard.
  it.each(bodies)('%s: orders the baseline read, then the fallback, then the search', (label, body) => {
    const removed = section(body, '- For each REMOVED requirement', '- For each RENAMED entry', label);

    const baselineAt = removed.indexOf('Before searching, read the baseline requirement');
    const fallbackAt = removed.indexOf("recover the baseline from the same file's history");
    const bailOutAt = removed.indexOf('mark **Spec Coverage** as not verified for that entry');
    const searchAt = removed.indexOf('Search codebase for that behavior.');

    expect(baselineAt, `${label}: baseline-read sentence missing`).toBeGreaterThanOrEqual(0);
    expect(fallbackAt, `${label}: history fallback missing`).toBeGreaterThanOrEqual(0);
    expect(bailOutAt, `${label}: not-verified bail-out missing`).toBeGreaterThanOrEqual(0);
    expect(searchAt, `${label}: search step missing`).toBeGreaterThanOrEqual(0);

    // The main spec is the primary source; history is only its fallback.
    expect(baselineAt, `${label}: fallback must follow the primary read`).toBeLessThan(fallbackAt);
    // Bailing out must be reachable before the search, not two bullets after
    // the rule that says finding nothing is expected.
    expect(bailOutAt, `${label}: bail-out must precede the search`).toBeLessThan(searchAt);
  });

  // The git example is the one piece of the fallback an agent runs verbatim.
  // `git log` treats an unmatched pathspec as success and prints nothing, so a
  // path missing the `openspec/specs/` prefix reads as "no baseline in
  // history" and sends every post-sync removal to the not-verified branch.
  it.each(bodies)('%s: gives a runnable, store-aware history command', (label, body) => {
    const removed = section(body, '- For each REMOVED requirement', '- For each RENAMED entry', label);

    expect(removed, label).toContain('git -C "<planningHome.root>" log -p -- openspec/specs/<capability-path>/spec.md');
    // `rev:path` resolves from the repository root, not from `-C`; the `./`
    // keeps it relative to a planning root that is a subdirectory (monorepo).
    expect(removed, label).toContain('git -C "<planningHome.root>" show <commit>^:./openspec/specs/<capability-path>/spec.md');
    expect(removed, label).not.toMatch(/show <commit>\^:openspec\//);
    // An unquoted planning root splits on spaces and runs git in the wrong place.
    expect(removed, label).not.toMatch(/git -C <planningHome\.root>/);
    expect(removed, label).toContain('Empty output means the pathspec matched nothing');
    // A bare `<capability-path>/spec.md` pathspec matches nothing: the
    // placeholder is defined relative to `specs/`.
    expect(removed, label).not.toMatch(/git[^`\n]*log[^`\n]*--\s+<capability-path>/);
    // History must be read from the planning home, which may be a store repo
    // rather than the current checkout (#1702).
    expect(removed, label).not.toMatch(/\bgit log -p -- openspec/);
  });

  it.each(bodies)('%s: never counts an unsearched removal as passing', (label, body) => {
    const removed = section(body, '- For each REMOVED requirement', '- For each RENAMED entry', label);

    expect(removed, label).toContain('mark **Spec Coverage** as not verified for that entry with the reason and stop there');
    expect(removed, label).toContain('do not search, and never count an unsearched removal as passing');
    // A baseline that only restates its title gives no more vocabulary than
    // the heading did, which is the #2067 failure mode in miniature.
    expect(removed, label).toContain('A baseline that adds nothing to its own title');
    expect(removed, label).toContain('is unusable evidence, the same as a missing one');
    // Reworded re-introductions must fail too, not just the exact old
    // sentence: the bug was searching from the name, however it is phrased.
    expect(removed, label).not.toMatch(/Search\b[^.\n]*\bfor the removed behavior/i);
    expect(removed, label).not.toMatch(/Finding no implementation is the expected result[.;]/);
  });

  // Step 6 asserts that Spec Coverage carries the evidence for a removal-only
  // change. That claim has to leave room for the entry the branch above marks
  // not verified, or it reads as licence to drop the mark.
  it.each(bodies)('%s: does not claim a baseline check that may not have happened', (label, body) => {
    expect(body, label).toContain('each REMOVED and RENAMED entry with a usable baseline is checked there against its baseline behavior');
    expect(body, label).toContain('an entry already marked not verified there stays not verified');
    // The scorecard must model the not-verified wording, not only the
    // confirming kind.
    expect(body, label).toContain('"1 removal not verified (baseline unavailable)"');
  });

  it.each(bodies)('%s: counts removals separately from covered requirements', (label, body) => {
    expect(body, label).toContain('Count only ADDED and MODIFIED requirements in N, and report REMOVED and RENAMED requirements separately');
    expect(body, label).toContain('the Correctness cell reads `Not applicable (no ADDED or MODIFIED requirements)`');
  });
});
