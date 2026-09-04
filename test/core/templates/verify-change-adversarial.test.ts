import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  getOpsxVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';

const variants: Array<[string, string]> = [
  ['verify skill', getVerifyChangeSkillTemplate().instructions],
  ['verify command', getOpsxVerifyCommandTemplate().content],
];

describe('verify adversarial mode', () => {
  it('keeps standard verification as the default path', () => {
    for (const [variant, content] of variants) {
      expect(content, variant).toContain('If the flag is absent, run the standard verification only.');
      expect(content, variant).toContain(
        'If `--adversarial` was not provided, skip this entire step. Do not spend tokens on adversarial claim selection, counterexample search, or extra validation.'
      );

      const coherence = content.indexOf('7. **Verify Coherence**');
      const adversarial = content.indexOf('8. **Optional adversarial pass (`--adversarial` only)**');
      const report = content.indexOf('9. **Generate Verification Report**');
      expect(coherence, variant).toBeGreaterThanOrEqual(0);
      expect(adversarial, variant).toBeGreaterThan(coherence);
      expect(report, variant).toBeGreaterThan(adversarial);
    }
  });

  it('parses --adversarial as workflow input rather than a change or CLI flag', () => {
    for (const [variant, content] of variants) {
      expect(content, variant).toContain('remove it from the positional input');
      expect(content, variant).toContain('never treat it as a change name');
      expect(content, variant).toContain('never append it to any `openspec` CLI command');
      expect(content, variant).toContain('If a name remains after removing workflow flags, use it. Otherwise:');
    }
  });

  it('bounds and prioritizes the adversarial claim set', () => {
    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Prioritize claims touching changed implementation paths first');
      expect(content, variant).toContain('Review at most 5 important claims in one invocation');
      expect(content, variant).toContain('Record important claims beyond the budget as `UNCHECKED`');
      expect(content, variant).toContain('the report never implies exhaustive coverage');
    }
  });

  it('drives adversarial readiness from claim outcomes', () => {
    for (const [variant, content] of variants) {
      expect(content, variant).toContain('Any `FAILED` important claim -> **Not ready**');
      expect(content, variant).toContain(
        'Any important `WEAK EVIDENCE` or `UNVERIFIED` claim -> **Partially verified — not ready**'
      );
      expect(content, variant).toContain(
        'Any important claim left `UNCHECKED` because of the budget -> **Partially verified — not ready**'
      );
      expect(content, variant).toContain('**Ready** only when every important claim is `SUPPORTED`');
      expect(content, variant).toContain('This readiness is independent of CRITICAL/WARNING/SUGGESTION issue counts');
      expect(content, variant).toContain(
        'Do not use the baseline "All checks passed" terminal line as the adversarial readiness result'
      );
    }
  });

  it('documents the opt-in syntax and cost tradeoff in the canonical skills reference', () => {
    const docs = readFileSync('docs-lab/reference/skills.md', 'utf8');
    const verifySection = docs.slice(docs.indexOf('## openspec-verify-change'));

    expect(verifySection).toContain('`--adversarial`');
    expect(verifySection).toContain('more model tokens/work than standard verification');
    expect(verifySection).toContain('workflow-only and is never forwarded to an `openspec` CLI command');
    expect(verifySection).toContain('the explicit `UNCHECKED` remainder');
    expect(verifySection).toContain('readiness derived from claim outcomes');
  });
});
