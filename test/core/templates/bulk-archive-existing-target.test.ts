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
      const targetName = step.indexOf('Target name: use the `<target-name>` recorded');
      const existenceCheck = step.indexOf('**Check if target already exists:**');
      const move = step.indexOf('mv "<changeRoot>"');

      expect(targetName, label).toBeGreaterThanOrEqual(0);
      expect(existenceCheck, label).toBeGreaterThan(targetName);
      expect(move, label).toBeGreaterThan(existenceCheck);
    }
  });

  // `openspec archive` settles the destination before touching any spec. A
  // collision found only at the move would leave main specs rewritten for a
  // change that stays active, so the batch must check every target first.
  it('checks every archive target before the first main-spec write (#1827)', () => {
    for (const [label, body] of bodies) {
      const preflight = body.indexOf('   d. **Archive target**');
      const conflicts = body.indexOf('4. **Detect spec conflicts**');
      const firstSync = body.indexOf('   a. **Sync included delta specs**');

      expect(preflight, label).toBeGreaterThanOrEqual(0);
      expect(conflicts, label).toBeGreaterThan(preflight);
      expect(firstSync, label).toBeGreaterThan(preflight);

      const step = body.slice(preflight, conflicts);
      expect(step, label).toContain('another selected change resolves to the same target name');
      expect(step, label).toContain('A blocked change is never synced or moved');
      expect(body, label).toContain(
        'The archive-everything option — proceed with every selected change that is not `Blocked`'
      );
      expect(body, label).toContain(
        'Check every archive target in step 3, before the first main-spec write'
      );
    }
  });

  // The dated name must be computed once. Recomputing it at the move lets a
  // batch that crosses midnight check yesterday's target in step 3, sync main
  // specs, then collide at today's target with the change still active.
  it('reuses the target name recorded in step 3 for the move (#1827)', () => {
    for (const [label, body] of bodies) {
      const preflight = body.slice(
        body.indexOf('   d. **Archive target**'),
        body.indexOf('4. **Detect spec conflicts**')
      );
      const step = archiveStep(body, label);

      expect(preflight, label).toContain("record it as that change's `<target-name>`");
      expect(preflight, label).toContain('prepend the current date');
      expect(step, label).toContain(
        'Target name: use the `<target-name>` recorded for this change in step 3d, unchanged'
      );
      expect(step, label).not.toContain('prepend the current date');
      expect(body, label).toContain('computed once in step 3d and reused at the move');
    }
  });

  // The last check and the `mv` are separate steps, so a target created in
  // between still nests the change with exit 0. The workflow must detect the
  // nesting after the move and undo it instead of reporting success.
  it('detects and undoes a move that nested inside a late target (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);
      const move = step.indexOf('mv "<changeRoot>"');
      const confirm = step.indexOf('**Confirm the move did not nest:**');

      expect(move, label).toBeGreaterThanOrEqual(0);
      expect(confirm, label).toBeGreaterThan(move);
      expect(step.slice(confirm), label).toContain(
        'move that directory back to `changeRoot` and record this change as Failed'
      );
    }
  });

  // A collision is a failure in every confirmation path, including ready-only,
  // which otherwise records everything not Ready as Skipped.
  it('keeps blocked changes Failed under the ready-only option (#1827)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'except `Blocked` changes, which stay Failed with `Archive directory already exists`'
      );
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
