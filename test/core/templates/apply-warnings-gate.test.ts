import { describe, it, expect } from 'vitest';
import {
  getApplyInstructions,
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
} from '../../../src/core/templates/workflows/apply-change.js';

// #2166: `instructions apply --json` returns `state: "ready"` alongside
// `warnings` (e.g. no delta specs, so `validate` fails), but the apply
// instructions gated only on `state` and never mentioned `warnings`, so the
// agent implemented a change the CLI had already flagged.
describe('apply instructions gate on CLI warnings (#2166)', () => {
  const instructions = getApplyInstructions();

  it('lists `warnings` among the fields the apply JSON returns', () => {
    expect(instructions).toMatch(/- `warnings` \(when present\)/);
  });

  it('pauses on warnings before falling through to implementation', () => {
    const gate = instructions.indexOf('If `warnings` is non-empty');
    const proceed = instructions.indexOf('Otherwise: proceed to implementation');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(proceed);
    expect(instructions).toMatch(/pause before implementing, even when `state` is `"ready"`/);
  });

  it('carries the same gate on both the skill and command surfaces', () => {
    const needle = 'If `warnings` is non-empty';
    expect(getApplyChangeSkillTemplate().instructions).toContain(needle);
    expect(getOpsxApplyCommandTemplate().content).toContain(needle);
  });
});

describe('apply instructions recheck warnings during the task loop (#2166)', () => {
  it('pauses on a new warning from the rerun apply instructions', () => {
    const instructions = getApplyInstructions();
    const loop = instructions.indexOf('6. **Implement tasks');
    const newWarning = instructions.indexOf('return a warning not already shown');
    expect(newWarning).toBeGreaterThan(loop);
  });
});
