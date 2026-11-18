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
      const firstSync = step.indexOf('"Sync now');

      expect(check, label).toBeGreaterThanOrEqual(0);
      expect(check, label).toBeLessThan(firstSync);
      expect(step, label).toContain('stop before writing any main spec');
    }
  });

  it('checks the same target again immediately before the move', () => {
    for (const [label, body] of bodies) {
      const step = section(body, '5. **Perform the archive**', '6. **Display summary**');

      expect(step, label).toContain('Use the `<target-name>` recorded in step 4');
      expect(step, label).toContain('**Check again immediately before the move:**');
      expect(step, label).toContain('report any main specs step 4 synced');
    }
  });

  it('does not offer a different date as a way out', () => {
    for (const [label, body] of bodies) {
      expect(body, label).not.toContain('using different date');
      expect(body, label).not.toContain('Wait until a different date');
    }
  });
});
