import { describe, it, expect } from 'vitest';
import {
  getContinueChangeSkillTemplate,
  getOpsxContinueCommandTemplate,
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
  getVerifyChangeSkillTemplate,
  getOpsxVerifyCommandTemplate,
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

/**
 * The generic continue/apply/verify/archive bodies are composed from shared
 * parameterized builders that the ATD façades reuse. These snapshots lock the
 * generic output byte-for-byte so façade work can never drift it.
 */
describe('generic workflow bodies remain byte-stable under builder composition', () => {
  const surfaces = [
    ['continue skill', getContinueChangeSkillTemplate().instructions],
    ['continue command', getOpsxContinueCommandTemplate().content],
    ['apply skill', getApplyChangeSkillTemplate().instructions],
    ['apply command', getOpsxApplyCommandTemplate().content],
    ['verify skill', getVerifyChangeSkillTemplate().instructions],
    ['verify command', getOpsxVerifyCommandTemplate().content],
    ['archive skill', getArchiveChangeSkillTemplate().instructions],
    ['archive command', getOpsxArchiveCommandTemplate().content],
  ] as const;

  it.each(surfaces)('%s matches its locked snapshot', (_name, body) => {
    expect(body).toMatchSnapshot();
  });
});
