// Glob artifact paths must stay inside changeRoot (#2099).
//
// update-change already bounds the agent's choice ("Choose a concrete path
// inside `changeRoot` ... Verify it remains inside `changeRoot` after
// resolving any symlinked parent directories"). propose, ff-change and
// continue-change pick concrete paths for glob outputs without that bound,
// so a capability path such as `../../x` (or a symlinked dir under specs/)
// would be written outside the change.

import { describe, expect, it } from 'vitest';

import {
  getContinueChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { resolveOptionalWorkflows } from '../../../src/core/templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';

const withAll = (body: string) =>
  resolveOptionalWorkflows(body, new Set<string>(ALL_WORKFLOWS));

const bodies: Array<[string, string]> = [
  ['propose skill', withAll(getOpsxProposeSkillTemplate().instructions)],
  ['propose command', withAll(getOpsxProposeCommandTemplate().content)],
  ['ff skill', withAll(getFfChangeSkillTemplate().instructions)],
  ['ff command', withAll(getOpsxFfCommandTemplate().content)],
  ['continue skill', withAll(getContinueChangeSkillTemplate().instructions)],
  ['continue command', withAll(getOpsxContinueCommandTemplate().content)],
];

describe('glob output paths stay inside changeRoot (#2099)', () => {
  it('bounds the concrete-path choice for glob outputs', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('remains inside `changeRoot`');
    }
  });

  it('calls out symlinked parents in the bound', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('symlink');
    }
  });
});
