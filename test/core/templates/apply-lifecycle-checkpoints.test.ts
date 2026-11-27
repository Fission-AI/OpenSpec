import { describe, it, expect } from 'vitest';
import {
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
} from '../../../src/core/templates/workflows/apply-change.js';
import {
  getOpsxVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/workflows/verify-change.js';

/** The text of one numbered step, up to the next numbered step. */
function step(body: string, n: number): string {
  const start = body.indexOf(`\n${n}. **`);
  expect(start, `step ${n} exists`).toBeGreaterThan(-1);
  const end = body.indexOf(`\n${n + 1}. **`, start);
  return body.slice(start, end === -1 ? body.indexOf('\n**Output During', start) : end);
}

const applyBodies: Array<[string, string]> = [
  ['apply skill', getApplyChangeSkillTemplate().instructions],
  ['apply command', getOpsxApplyCommandTemplate().content],
];

describe('apply lifecycle checkpoints', () => {
  it('reads lifecycle only from the Step 3 apply read, with no extra CLI call', () => {
    for (const [label, body] of applyBodies) {
      expect(body, label).not.toMatch(/```bash\n\s*openspec lifecycle actions/);
      expect(body, label).toContain('never from `openspec lifecycle actions`');
      const s3 = step(body, 3);
      expect(s3, label).toContain('`lifecycle` (`before`, `completed`, `handling`) or `lifecycleError`');
      expect(s3, label).toContain('Older CLIs omit both. When both are absent, skip every lifecycle step below.');
    }
  });

  it('skips both checkpoints when blocked', () => {
    for (const [label, body] of applyBodies) {
      expect(step(body, 3), label).toMatch(/state: "blocked"`: show the message and pause implementation\. Skip lifecycle actions\./);
      expect(body, label).toContain('never when blocked or paused');
    }
  });

  it('on an already complete change, skips before and reads contextFiles before completed', () => {
    for (const [label, body] of applyBodies) {
      const allDone = step(body, 3).split('\n').find((line) => line.includes('state: "all_done"'));
      expect(allDone, label).toBeDefined();
      expect(allDone, label).toContain('Skip `lifecycle.before`');
      expect(allDone, label).toContain(
        'If `lifecycle.completed` is present, read every `contextFiles` path first, then handle it following `lifecycle.handling`.'
      );
      expect(allDone, label).toContain('If `lifecycleError` is present, report it and finish.');
    }
  });

  it('handles before once after context files and before edits, and stops on lifecycleError', () => {
    for (const [label, body] of applyBodies) {
      const s4 = step(body, 4);
      const readContext = s4.indexOf('Read every file path listed under `contextFiles`');
      const before = s4.indexOf('When ready to implement, once per start or resume and before any edits:');
      expect(readContext, label).toBeGreaterThan(-1);
      expect(before, label).toBeGreaterThan(readContext);
      expect(s4, label).toContain(
        'If `lifecycleError` is present: report its `issues` and `fix`, and stop before editing anything.'
      );
      expect(s4, label).toContain('If `lifecycle.before` is present: handle it following `lifecycle.handling`.');
    }
  });

  it('ignores lifecycle on task-loop reruns', () => {
    for (const [label, body] of applyBodies) {
      expect(step(body, 6), label).toContain(
        'Ignore `lifecycle` and `lifecycleError` on these reruns. Lifecycle actions come only from the Step 3 read.'
      );
    }
  });

  it('handles completed when Apply finishes on tracked or untracked schemas, never on pause', () => {
    for (const [label, body] of applyBodies) {
      const s7 = step(body, 7);
      const allDone = s7.split('\n').find((line) => line.includes('If all done'));
      const paused = s7.split('\n').find((line) => line.includes('If paused:'));
      expect(allDone, label).toContain('`state: "all_done"` on tracked schemas');
      expect(allDone, label).toContain('schemas without task tracking');
      expect(allDone, label).toContain(
        'if `lifecycle.completed` from Step 3 is present, handle it once following `lifecycle.handling`'
      );
      expect(allDone, label).toContain('If `lifecycleError` is present, report it and finish.');
      expect(paused, label).toContain('Do not handle `lifecycle.completed`.');
    }
  });

  it('leaves action behavior to the action instructions', () => {
    for (const [label, body] of applyBodies) {
      expect(body, label).toContain('What an action does, including pausing for input, comes from its own `instructions`');
    }
  });
});

describe('verify ignores apply lifecycle fields', () => {
  it('tells both verify surfaces to ignore lifecycle and lifecycleError', () => {
    for (const [label, body] of [
      ['verify skill', getVerifyChangeSkillTemplate().instructions],
      ['verify command', getOpsxVerifyCommandTemplate().content],
    ] as const) {
      const s3 = step(body, 3);
      expect(s3, label).toContain('openspec instructions apply --change "<name>" --json');
      expect(s3, label).toContain(
        'Ignore `lifecycle` and `lifecycleError` in this response. Verify does not run Apply lifecycle actions.'
      );
    }
  });
});
