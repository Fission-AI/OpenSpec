import { describe, expect, it } from 'vitest';

import { getSkillTemplates } from '../../../src/core/shared/skill-generation.js';

const skill = (workflowId: string): string =>
  getSkillTemplates().find((entry) => entry.workflowId === workflowId)!.template.instructions;

const APPLY_CLI = 'openspec instructions apply --change "<name>" --json';

describe('every skill stop names the next step (#2271)', () => {
  it.each(['propose', 'ff'])('%s resumes a change that already exists', (workflowId) => {
    expect(skill(workflowId)).toContain(
      'If the user chose to continue an existing change, skip this step and use that change'
    );
  });

  it.each(['propose', 'ff', 'continue'])('%s gives the CLI step when apply is not installed', (workflowId) => {
    expect(skill(workflowId)).toContain(`If the \`/opsx:apply\` skill is not installed, also give \`${APPLY_CLI}\``);
  });

  it('continue only asks to keep going while planning is incomplete', () => {
    const body = skill('continue');
    expect(body).toContain('- If planning is still incomplete, prompt:');
    expect(body).not.toContain('- Otherwise, prompt:');
  });

  it('new names a way forward without the continue skill', () => {
    const body = skill('new');
    expect(body).toContain('If the `/opsx:continue` skill is not installed, give the CLI command for the next ready artifact');
    expect(body).toContain(
      'If a change with that name already exists, recommend the `/opsx:continue` skill if it is installed; otherwise give the CLI command for its next ready artifact'
    );
  });

  it('update points a finished plan to apply', () => {
    expect(skill('update')).toContain(
      `Planning complete and not implemented yet -> recommend the \`/opsx:apply\` skill if it is installed; otherwise give \`${APPLY_CLI}\``
    );
  });

  it('explore sends an existing change to apply instead of capturing it again', () => {
    expect(skill('explore')).toContain(
      `when a change already exists, recommend the \`/opsx:apply\` skill if it is installed; otherwise give \`${APPLY_CLI}\``
    );
  });

  it('explore names the change and artifacts in every new-change offer', () => {
    const body = skill('explore');
    expect(body).not.toContain('Want me to create a proposal?');
    expect(body).toContain('Want me to create `<name>` with <artifacts to create>?');
  });

  it('apply gives the CLI step when archive is not installed', () => {
    expect(skill('apply')).toContain('If the `/opsx:archive` skill is not installed, give `openspec archive "<name>"`');
  });

  it('archive stops cleanly when the user declines', () => {
    const body = skill('archive');
    expect(body.split('If the user declines, stop without archiving and name what is left to finish').length - 1).toBe(2);
    expect(body).toContain('"Sync now (recommended)", "Archive without syncing", "Cancel"');
  });

  it('keeps a left-out optional artifact reachable', () => {
    expect(skill('continue')).toContain('If an artifact reports `omitted: true`, name it as left out');
    expect(skill('update')).toContain('one reporting `omitted: true` can still be added in a separate step');
  });

  it('verify names the next skill for each outcome', () => {
    expect(skill('verify')).toContain(
      `End with the next step: for CRITICAL issues, say that each code fix needs its own unchecked task in the tasks file, because verify changes no files and apply only works on unchecked tasks; recommend the \`/opsx:update\` skill to add those tasks and make plan fixes, then the \`/opsx:apply\` skill for code fixes, if installed; otherwise name the tasks to add and the artifacts to revise, then give \`${APPLY_CLI}\` for code fixes;`
    );
    expect(skill('verify')).toContain(
      'when ready, recommend the `/opsx:archive` skill if it is installed; otherwise give `openspec archive "<name>"`'
    );
  });

  it('sync reports a capability it could not sync', () => {
    expect(skill('sync')).toContain('Any capability left unsynced because it is blocked, and why');
  });

  it('onboard handles a failed archive and a stop before any change exists', () => {
    const body = skill('onboard');
    expect(body).toContain('If the archive fails, show the error, fix the cause, and run it again before continuing');
    expect(body).toContain('If no change was created yet, say nothing was saved and skip the status command');
  });

  it.each(['apply', 'archive', 'continue', 'sync', 'update', 'verify'])(
    '%s says what to do when there is no active change',
    (workflowId) => {
      expect(skill(workflowId)).toContain('If no active change exists, say so, offer to start one, and stop');
    }
  );
});
