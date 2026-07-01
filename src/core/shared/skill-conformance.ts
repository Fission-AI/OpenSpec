/**
 * Skill authoring-conventions conformance scorer.
 *
 * Scores a generated skill's description + instructions against the objective,
 * checkable signals of the `skill-authoring-conventions` capability:
 * trigger disambiguation, explicit success criteria, named failure recovery,
 * guardrails, cross-skill navigation, a lean body within the Agent Skills
 * standard's budget, and — for the artifact-drafting skills — a link to the
 * shared authoring-conventions reference.
 *
 * This is deliberately signal-based (regex/line-count), not a judgment call, so
 * it can back both an efficacy measurement (current vs. rewritten skills) and,
 * later, the conformance validation gate.
 */

import { AUTHORING_CONVENTIONS_REFERENCE_FILE } from '../templates/workflows/authoring-conventions.js';

/** Workflow ids whose skills draft or update spec deltas. */
export const SPEC_AUTHORING_WORKFLOWS = new Set(['propose', 'ff', 'continue', 'sync']);

/** Agent Skills standard's recommended body budget (lines). */
export const BODY_LINE_BUDGET = 500;

export interface ConformanceInput {
  /** Workflow id (e.g. 'new', 'propose', 'ff'). */
  workflowId: string;
  /** Skill/command description (frontmatter `description`). */
  description: string;
  /** Skill/command instruction body. */
  instructions: string;
}

export interface ConformanceCheck {
  key: string;
  passed: boolean;
  /** False when the check does not apply to this skill (excluded from scoring). */
  applicable: boolean;
}

export interface ConformanceResult {
  workflowId: string;
  checks: ConformanceCheck[];
  passed: number;
  applicable: number;
}

const SIBLING_TERMS = [
  'new-change',
  'propose',
  'ff-change',
  'continue',
  'apply',
  'verify',
  'archive',
  'explore',
  'onboard',
  'sync',
];

function namesADistinctSibling(description: string, workflowId: string): boolean {
  const lower = description.toLowerCase();
  return SIBLING_TERMS.some((term) => {
    if (workflowId.startsWith(term) || term.startsWith(workflowId)) return false;
    return lower.includes(term);
  });
}

function hasTriggerBoundary(description: string, workflowId: string): boolean {
  // A boundary is stated either by an explicit contrast word or by pointing the
  // agent to a distinct sibling skill for the neighboring case.
  if (/\b(instead|rather than|not just|one-shot|only|stop)\b/i.test(description)) return true;
  return namesADistinctSibling(description, workflowId);
}

function lineCount(text: string): number {
  return text.split('\n').length;
}

/**
 * Scores one skill's description + instructions against the conventions.
 */
export function scoreSkillConformance(input: ConformanceInput): ConformanceResult {
  const { workflowId, description, instructions } = input;
  const isSpecAuthoring = SPEC_AUTHORING_WORKFLOWS.has(workflowId);

  const checks: ConformanceCheck[] = [
    {
      key: 'useWhenTrigger',
      applicable: true,
      passed: /use when/i.test(description),
    },
    {
      key: 'triggerBoundary',
      applicable: true,
      passed: hasTriggerBoundary(description, workflowId),
    },
    {
      key: 'successCriteria',
      applicable: true,
      passed: /(^|\n)\s*(\*\*|#+\s*)?success\b/i.test(instructions) || /done when/i.test(instructions),
    },
    {
      key: 'failureRecovery',
      applicable: true,
      passed: /(failure\s*&?\s*recover|recover|if blocked|resume by|if .*fails)/i.test(instructions),
    },
    {
      key: 'guardrails',
      applicable: true,
      passed: /guardrail/i.test(instructions) || /do not\b/i.test(instructions),
    },
    {
      key: 'relatedSkills',
      applicable: true,
      passed: /(^|\n)\s*(\*\*|#+\s*)?related\b/i.test(instructions),
    },
    {
      key: 'withinBodyBudget',
      applicable: true,
      passed: lineCount(instructions) <= BODY_LINE_BUDGET,
    },
    {
      key: 'authoringReferenceLinked',
      applicable: isSpecAuthoring,
      passed: isSpecAuthoring
        ? instructions.includes(AUTHORING_CONVENTIONS_REFERENCE_FILE)
        : false,
    },
  ];

  const applicableChecks = checks.filter((c) => c.applicable);
  const passed = applicableChecks.filter((c) => c.passed).length;

  return {
    workflowId,
    checks,
    passed,
    applicable: applicableChecks.length,
  };
}
