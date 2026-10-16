// Every workflow that turns a glob output into a concrete write path must keep
// that path inside `changeRoot` (#2099). update-change always did; propose,
// ff-change and continue-change chose a path with no containment rule, so a
// capability path such as `../../x`, or a symlinked directory under `specs/`,
// would be written outside the change.

import { describe, expect, it } from 'vitest';

import {
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFfChangeSkillTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxUpdateCommandTemplate,
  getUpdateChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { resolveOptionalWorkflows } from '../../../src/core/templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';

const withAllWorkflows = (body: string) =>
  resolveOptionalWorkflows(body, new Set<string>(ALL_WORKFLOWS));

/** Lines that tell the agent to pick a concrete path for a glob output. */
const PATH_CHOICE = /choose a concrete path/i;

/** The containment rule update-change has always carried. */
const BOUND =
  'remains inside `changeRoot` after resolving any symlinked parent directories';

/** Every surface that writes glob artifacts, skill and slash-command alike. */
const SURFACES: Array<[label: string, body: string]> = [
  ['propose skill', withAllWorkflows(getOpsxProposeSkillTemplate().instructions)],
  ['propose command', withAllWorkflows(getOpsxProposeCommandTemplate().content)],
  ['ff-change skill', withAllWorkflows(getFfChangeSkillTemplate().instructions)],
  ['ff-change command', withAllWorkflows(getOpsxFfCommandTemplate().content)],
  ['continue-change skill', withAllWorkflows(getContinueChangeSkillTemplate().instructions)],
  ['continue-change command', withAllWorkflows(getOpsxContinueCommandTemplate().content)],
  ['update-change skill', withAllWorkflows(getUpdateChangeSkillTemplate().instructions)],
  ['update-change command', withAllWorkflows(getOpsxUpdateCommandTemplate().content)],
  ['explore skill', withAllWorkflows(getExploreSkillTemplate().instructions)],
  ['explore command', withAllWorkflows(getOpsxExploreCommandTemplate().content)],
];

/** Where a line tells the agent to write. The bound must come before it. */
const WRITE = /\b(?:write|Write)\b(?! anything)(?! an expected path)(?! only the missing)/;

/**
 * The bound has to be checked before the write, or an escaping path is already
 * written by the time it is verified. A line with no write (update-change
 * writes in a later step) only needs the bound.
 */
function expectBoundBeforeWrite(label: string, line: string): void {
  const boundAt = line.indexOf(BOUND);
  expect(boundAt, label).toBeGreaterThanOrEqual(0);
  const writeAt = line.search(WRITE);
  if (writeAt !== -1) {
    expect(writeAt, `${label}: writes before checking the bound`).toBeGreaterThan(boundAt);
    expect(line, `${label}: no instruction to refuse an escaping path`).toContain(
      'stop and tell the user'
    );
  }
}

/** Every place a body hands artifact creation to another skill or command. */
const DELEGATION = /delegates creation/g;

/**
 * A delegated writer is a write too. It may run only after the path it writes
 * to has been chosen and checked, and only if it can write exactly there.
 * Returns each delegation as [offset, the sentence that states it].
 */
function delegations(body: string): Array<[number, string]> {
  return [...body.matchAll(DELEGATION)].map((match) => {
    const start = match.index ?? 0;
    const end = body.slice(start).search(/[.\n]/);
    return [start, body.slice(start, end === -1 ? undefined : start + end)];
  });
}

describe('glob output paths stay inside changeRoot (#2099)', () => {
  it.each(SURFACES)('%s bounds every concrete-path choice', (label, body) => {
    const choices = body.split('\n').filter((line) => PATH_CHOICE.test(line));

    expect(choices, `${label}: no concrete-path line found`).toHaveLength(1);
    expectBoundBeforeWrite(label, choices[0]);
  });

  it.each(SURFACES)('%s chooses and checks the path before any delegated writer runs', (label, body) => {
    const choiceAt = body.search(PATH_CHOICE);
    const found = delegations(body);
    expect(found.length, `${label}: no delegated-creation rule found`).toBeGreaterThan(0);

    for (const [at, sentence] of found) {
      // Bound to one path, and refuses rather than letting it write elsewhere.
      expect(sentence, label).toMatch(/only if it can/);
      expect(sentence, label).toMatch(/stop/);
      // The creation step's delegation comes after the choice it depends on.
      // The only one allowed earlier is continue-change's backfill, which
      // names the path its own preceding bullet checked.
      if (at < choiceAt) {
        expect(sentence, `${label}: delegates before choosing the path`).toContain(
          'its checked path'
        );
      }
    }
    expect(
      found.some(([at]) => at > choiceAt),
      `${label}: the creation step does not bound its delegated writer`
    ).toBe(true);
  });

  it.each(SURFACES)('%s never targets the glob itself', (label, body) => {
    // A glob is a pattern, not a file: nothing may be written to, or verified
    // at, `resolvedOutputPath` unless it is a concrete path.
    expect(body, label).not.toContain('exists at `resolvedOutputPath`');
    expect(body, label).not.toContain('write it to `resolvedOutputPath`');
  });

  it.each(SURFACES)('%s restates delegation only with the same bound', (label, body) => {
    // The artifact-creation guidelines repeat the delegation rule where agents
    // skim; a bare "invoke it instead" there would undo the ordering above.
    for (const line of body
      .split('\n')
      .filter((candidate) => candidate.includes('directs you to use a specific skill or command'))) {
      expect(line, label).toContain('only once you have chosen and checked the output path');
    }
  });

  // continue-change alone backfills a half-written glob artifact: it compares
  // expected paths against what exists instead of choosing a new one, so the
  // bound has to sit on that bullet too.
  it.each([
    ['continue-change skill', withAllWorkflows(getContinueChangeSkillTemplate().instructions)],
    ['continue-change command', withAllWorkflows(getOpsxContinueCommandTemplate().content)],
  ])('%s bounds the partly-written-artifact check', (label, body) => {
    const bullets = body
      .split('\n')
      .filter((line) => line.includes('resolve each expected path against `changeRoot`'));

    expect(bullets, `${label}: partial-artifact bullet missing`).toHaveLength(1);
    expect(bullets[0], label).toContain(BOUND);
    // The write is the next bullet, so the refusal has to sit there.
    const lines = body.split('\n');
    const next = lines[lines.indexOf(bullets[0]) + 1];
    expect(next, label).toContain('Never write an expected path that fails that check');
    expect(next.indexOf('Never write'), label).toBeLessThan(next.indexOf('write only the missing'));
    // A delegated writer filling the gap is held to the same checked paths.
    expect(next, label).toContain('invoke it only if it can write each file to its checked path');
  });
});
