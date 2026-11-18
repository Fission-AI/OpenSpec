import { describe, expect, it } from 'vitest';

import {
  getArchiveChangeSkillTemplate,
  getOpsxArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

const bodies: Array<[string, string]> = [
  ['skill', getArchiveChangeSkillTemplate().instructions],
  ['command', getOpsxArchiveCommandTemplate().content],
];

function section(body: string, start: string, end: string): string {
  return body.slice(body.indexOf(start), body.indexOf(end));
}

describe('archive target check (#2276)', () => {
  it('finds an existing archive before any main spec is written', () => {
    for (const [label, body] of bodies) {
      const step = section(body, '4. **Assess delta spec sync state**', '5. **Perform the archive**');
      const check = step.indexOf('**Check the archive target first:**');
      const stop = step.indexOf('already exists, stop before writing any main spec');
      const firstSync = step.indexOf('"Sync now');
      const recheck = step.indexOf('Check the archive target again now.');
      const syncWrites = step.indexOf('Before a selected sync writes any main spec');

      expect(check, label).toBeGreaterThanOrEqual(0);
      expect(stop, label).toBeGreaterThan(check);
      expect(stop, label).toBeLessThan(firstSync);
      expect(recheck, label).toBeGreaterThan(firstSync);
      expect(recheck, label).toBeLessThan(syncWrites);
      expect(step, label).toContain('name any main specs this run already synced');
    }
  });

  it('checks the same target again immediately before the move', () => {
    for (const [label, body] of bodies) {
      const step = section(body, '5. **Perform the archive**', '6. **Display summary**');

      expect(step, label).toContain('Use the `<target-name>` recorded in step 4');
      expect(step, label).toContain('**Check again immediately before the move:**');
      expect(step, label).toContain('report any main specs step 4 synced');
      expect(step.indexOf('Use the `<target-name>` recorded in step 4'), label).toBeLessThan(
        step.indexOf('**Check again immediately before the move:**')
      );
      expect(step.indexOf('**Check again immediately before the move:**'), label).toBeLessThan(
        step.indexOf('mv "<changeRoot>"')
      );
    }
  });

  it('does not offer a different date as a way out', () => {
    for (const [label, body] of bodies) {
      expect(body, label).not.toContain('using different date');
      expect(body, label).not.toContain('Wait until a different date');
    }
  });
});
