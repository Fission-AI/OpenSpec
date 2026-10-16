// Every workflow that turns a glob output into a concrete write path must keep
// that path inside `changeRoot` (#2099). update-change always did; propose,
// ff-change and continue-change chose a path with no containment rule, so a
// capability path such as `../../x`, or a symlinked directory under `specs/`,
// would be written outside the change.

import { describe, expect, it } from 'vitest';

import {
  getContinueChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getOpsxContinueCommandTemplate,
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
];

describe('glob output paths stay inside changeRoot (#2099)', () => {
  it.each(SURFACES)('%s bounds every concrete-path choice', (label, body) => {
    const choices = body.split('\n').filter((line) => PATH_CHOICE.test(line));

    expect(choices, `${label}: no concrete-path line found`).toHaveLength(1);
    expect(choices[0], label).toContain(BOUND);
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
  });
});
