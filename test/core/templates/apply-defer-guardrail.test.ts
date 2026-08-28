import { describe, it, expect } from 'vitest';
import {
  getApplyInstructions,
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
} from '../../../src/core/templates/workflows/apply-change.js';

// #1529: agents were silently simplifying or deferring work mid-apply and
// marking tasks done anyway. The apply instructions must tell the agent to
// surface unexpected scope instead of absorbing it, on both surfaces.
describe('apply instructions surface deferred scope (#1529)', () => {
  const instructions = getApplyInstructions();

  it('tells the agent to surface added scope rather than defer or simplify', () => {
    expect(instructions).toContain('surface the added scope');
    expect(instructions).toContain('beyond what the spec describes');
    expect(instructions).toMatch(/never silently narrow, defer/);
  });

  it('requires pausing, not just reporting and continuing', () => {
    // The agent must hand control back, not surface the scope and press on.
    expect(instructions).toContain('surface the added scope and pause');
  });

  it('forbids marking a task complete when it is only partially done', () => {
    expect(instructions).toMatch(
      /Only mark a task .* when its specified behavior is fully implemented/
    );
  });

  it('carries the same guidance on both the skill and command surfaces', () => {
    const needle = 'surface the added scope';
    expect(getApplyChangeSkillTemplate().instructions).toContain(needle);
    expect(getOpsxApplyCommandTemplate().content).toContain(needle);
  });
});
