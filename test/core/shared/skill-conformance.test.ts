import { describe, expect, it } from 'vitest';

import { getSkillTemplates, getSkillReferenceFiles } from '../../../src/core/shared/skill-generation.js';
import { AUTHORING_CONVENTIONS_REFERENCE_FILE } from '../../../src/core/templates/workflows/authoring-conventions.js';
import {
  scoreSkillConformance,
  SPEC_AUTHORING_WORKFLOWS,
  type ConformanceResult,
} from '../../../src/core/shared/skill-conformance.js';

const CHECK_ORDER = [
  'useWhenTrigger',
  'triggerBoundary',
  'successCriteria',
  'failureRecovery',
  'guardrails',
  'relatedSkills',
  'withinBodyBudget',
  'authoringReferenceLinked',
];

function scoreAll(): ConformanceResult[] {
  return getSkillTemplates().map(({ template, workflowId }) =>
    scoreSkillConformance({
      workflowId,
      description: template.description,
      instructions: template.instructions,
    })
  );
}

describe('skill authoring-conventions conformance', () => {
  it('prints the scorecard for every generated skill', () => {
    const results = scoreAll();
    const lines: string[] = [];
    lines.push(['workflow', ...CHECK_ORDER, 'score'].join('\t'));
    let totalPassed = 0;
    let totalApplicable = 0;
    for (const r of results) {
      const byKey = Object.fromEntries(r.checks.map((c) => [c.key, c]));
      const cells = CHECK_ORDER.map((k) => {
        const c = byKey[k];
        if (!c || !c.applicable) return '-';
        return c.passed ? 'Y' : '.';
      });
      totalPassed += r.passed;
      totalApplicable += r.applicable;
      lines.push([r.workflowId, ...cells, `${r.passed}/${r.applicable}`].join('\t'));
    }
    lines.push(`TOTAL ${totalPassed}/${totalApplicable}`);
    // Printed so `vitest run` surfaces the before/after scorecard.
    console.log('\n' + lines.join('\n') + '\n');
    expect(results.length).toBe(11);
  });

  it('every spec-authoring skill links the authoring-conventions reference', () => {
    const results = scoreAll().filter((r) => SPEC_AUTHORING_WORKFLOWS.has(r.workflowId));
    for (const r of results) {
      const linked = r.checks.find((c) => c.key === 'authoringReferenceLinked');
      expect(linked?.passed, `${r.workflowId} should link the authoring-conventions reference`).toBe(true);
    }
  });

  it('the create-a-change family meets every applicable convention', () => {
    const family = new Set(['new', 'propose', 'ff', 'continue']);
    const results = scoreAll().filter((r) => family.has(r.workflowId));
    expect(results.length).toBe(4);
    for (const r of results) {
      expect(r.passed, `${r.workflowId} scored ${r.passed}/${r.applicable}`).toBe(r.applicable);
    }
  });

  it('emits the authoring-conventions reference for exactly the skills that link it', () => {
    for (const { template, workflowId } of getSkillTemplates()) {
      const refs = getSkillReferenceFiles(template);
      const linksIt = template.instructions.includes(AUTHORING_CONVENTIONS_REFERENCE_FILE);
      const emitsIt = refs.some((r) => r.relativePath === AUTHORING_CONVENTIONS_REFERENCE_FILE);
      // A skill can never link a reference that is not emitted beside it.
      expect(emitsIt, `${workflowId}: link=${linksIt} emit=${emitsIt}`).toBe(linksIt);
      for (const ref of refs) {
        expect(ref.content.length, `${workflowId} ${ref.relativePath}`).toBeGreaterThan(0);
      }
    }
  });
});
