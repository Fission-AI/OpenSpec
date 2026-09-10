import { describe, expect, it } from 'vitest';

import {
  getBulkArchiveChangeSkillTemplate,
  getOpsxBulkArchiveCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

const skill = getBulkArchiveChangeSkillTemplate();
const command = getOpsxBulkArchiveCommandTemplate();

// Both delivery surfaces must carry the same contract; every behavioral
// assertion below runs against each body.
const bodies: Array<[string, string]> = [
  ['skill', skill.instructions],
  ['command', command.content],
];

function archiveStep(body: string, label: string): string {
  const start = body.indexOf('   c. **Perform the archive**:');
  const end = body.indexOf('   d. **Track outcome** for each change:');

  expect(start, label).toBeGreaterThanOrEqual(0);
  expect(end, label).toBeGreaterThan(start);

  return body.slice(start, end);
}

describe('bulk archive existing-target handling', () => {
  // Regression for #1827: step 8c ran `mv` with no existence check. POSIX
  // `mv` moves changeRoot *inside* an existing target directory and exits 0,
  // so a same-day name collision produced
  // archive/<target>/<target>/ and was recorded as a successful archive.
  it('checks the archive target before moving changeRoot (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);

      expect(step, label).toContain('**Check if target already exists:**');
      expect(step, label).toContain('Archive directory already exists');
      expect(step, label).toContain('leave `changeRoot` where it is');
      expect(step, label).toContain('continue with the remaining changes');
    }
  });

  it('orders the existence check between the target name and the move (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);
      const targetName = step.indexOf('Target name: use the change name as-is');
      const existenceCheck = step.indexOf('**Check if target already exists:**');
      const move = step.indexOf('mv "<changeRoot>"');

      expect(targetName, label).toBeGreaterThanOrEqual(0);
      expect(existenceCheck, label).toBeGreaterThan(targetName);
      expect(move, label).toBeGreaterThan(existenceCheck);
    }
  });

  // The guardrail and both failure output templates already promised this
  // outcome while the steps never produced it; keep them in agreement.
  it('keeps the guardrail and failure output consistent with the step (#1827)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'If archive target exists, fail that change but continue with others'
      );
      expect(body, label).toContain('Archive directory already exists');
    }
  });
});
