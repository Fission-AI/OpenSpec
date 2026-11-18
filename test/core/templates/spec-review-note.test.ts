import { describe, expect, it } from 'vitest';
import {
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxSyncCommandTemplate,
  getSyncSpecsSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { getRouterSkillTemplate } from '../../../src/core/templates/workflows/router.js';

const DIFF_COMMAND = 'openspec show "<name>" --type change --json --diff';

describe('spec review note', () => {
  const merging = [
    ['sync skill', getSyncSpecsSkillTemplate().instructions],
    ['sync command', getOpsxSyncCommandTemplate().content],
    ['archive skill', getArchiveChangeSkillTemplate().instructions],
    ['archive command', getOpsxArchiveCommandTemplate().content],
  ] as const;

  it.each(merging)('%s tells the user what they can skip', (_name, text) => {
    expect(text).toContain(DIFF_COMMAND);
    expect(text).toContain('**Matches the approved delta:** MODIFIED requirements whose `diff` is empty.');
    expect(text).toContain('**Agent-checked:** ADDED, REMOVED and RENAMED requirements.');
    expect(text).toContain('Never decide on your own that a difference is fine.');
  });

  it.each([
    ['archive skill', getArchiveChangeSkillTemplate().instructions],
    ['archive command', getOpsxArchiveCommandTemplate().content],
  ])('%s does not move a change that has something to read', (_name, text) => {
    expect(text).toContain('If **Read this** has any entry, do not move `changeRoot`');
  });

  it.each([
    ['sync skill', getSyncSpecsSkillTemplate().instructions],
    ['archive skill', getArchiveChangeSkillTemplate().instructions],
    ['bulk archive skill', getBulkArchiveChangeSkillTemplate().instructions],
  ])('%s reads the diff before it merges and never drops newer text', (_name, text) => {
    expect(text).toContain(`Before you merge, run \`${DIFF_COMMAND}\``);
    expect(text).toContain('Never drop it on your own judgment');
  });
});

describe('router', () => {
  it('suggests context lines from a finished change and edits only after approval', () => {
    const { instructions } = getRouterSkillTemplate();
    expect(instructions).toContain('read it in `openspec/changes/archive/`');
    expect(instructions).toContain('`context` lines for `openspec/config.yaml`');
    expect(instructions).toContain('Edit the file only after they approve.');
  });
});

describe('propose judgment calls', () => {
  it.each([
    ['skill', getOpsxProposeSkillTemplate().instructions],
    ['command', getOpsxProposeCommandTemplate().content],
  ])('%s decides open questions itself and lists them', (_name, text) => {
    expect(text).toContain('**Make the judgment calls yourself.**');
    expect(text).toContain('Do not stop to ask, unless a wrong guess would be costly to undo');
    expect(text).toContain('list every decision you made as one numbered line');
    expect(text.indexOf('**Make the judgment calls yourself.**')).toBeLessThan(text.indexOf('openspec new change "<name>"'));
  });

  it.each([
    ['skill', getOpsxProposeSkillTemplate().instructions],
    ['command', getOpsxProposeCommandTemplate().content],
  ])('%s retires a scenario the way the CLI accepts and validates before showing', (_name, text) => {
    expect(text).toContain('REMOVED under the old name, ADDED under a new name');
    expect(text).toContain('Run `openspec validate "<name>" --strict` before you show the plan');
  });
});
