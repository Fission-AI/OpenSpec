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
  it('delegates the final move and collision checks to the CLI (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);
      expect(step, label).toContain('openspec archive "<name>" --skip-specs --yes --json');
      expect(step, label).toContain('archive lock and destination-collision checks');
      expect(step, label).not.toContain('mv "<changeRoot>"');
    }
  });

  it('records failures and continues only after checking the CLI result (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);
      expect(step, label).toContain('Require a zero exit status and an `archive` result');
      expect(step, label).toContain('record the diagnostics and continue');
      expect(step, label).toContain('remaining confirmed changes');
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

  // The CLI owns the final dated destination; preflight previews can become
  // stale across midnight, and a late collision must be reported as a failure.
  it('uses the CLI destination rather than promising to reuse the preview (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);
      expect(step, label).toContain('preflight target is advisory');
      expect(step, label).toContain('at invocation time');
      expect(step, label).toContain('Record the returned `archive.path`');
      expect(body, label).not.toContain('computed once in step 3d and reused at the move');
    }
  });

  it('preserves existing archives without a shell fallback (#1827)', () => {
    for (const [label, body] of bodies) {
      const step = archiveStep(body, label);
      expect(step, label).toContain('Do not fall back to a shell move or bypass');
      expect(step, label).toContain('an existing archive must remain intact');
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
