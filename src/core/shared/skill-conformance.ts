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
import { getAllowedToolsFor } from '../templates/workflows/skill-tools.js';
import { getSkillReferenceFiles } from './skill-generation.js';
import type { SkillTemplate } from '../templates/skill-templates.js';

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

/** Result of validating one skill against the Agent Skills standard's hard rules. */
export interface ConformanceValidation {
  errors: string[];
  warnings: string[];
}

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REFERENCE_LINK_PATTERN = /references\/[A-Za-z0-9._-]+/g;

/**
 * Validates a generated skill against the standard's hard rules — the
 * conformance gate. Frontmatter validity, `name` == folder, resolvable
 * `references/` links, and a declared `allowed-tools` set are errors (block
 * generation); an over-budget body is a warning (does not block).
 */
export function validateSkillConformance(
  template: SkillTemplate,
  dirName: string
): ConformanceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const id = template.name || dirName;

  // Frontmatter: name
  if (!template.name || template.name.length < 1 || template.name.length > 64) {
    errors.push(`${id}: name must be 1–64 characters`);
  } else if (!NAME_PATTERN.test(template.name)) {
    errors.push(`${id}: name must be lowercase alphanumeric and hyphens with no leading/trailing/consecutive hyphens`);
  }
  if (template.name !== dirName) {
    errors.push(`${id}: name "${template.name}" must equal folder "${dirName}"`);
  }

  // Frontmatter: description / compatibility
  if (!template.description || template.description.length < 1 || template.description.length > 1024) {
    errors.push(`${id}: description must be 1–1024 characters`);
  }
  if (template.compatibility && template.compatibility.length > 500) {
    errors.push(`${id}: compatibility must be at most 500 characters`);
  }

  // Declared tools present + cover body usage
  const declared = getAllowedToolsFor(template.name);
  if (!declared?.length) {
    errors.push(`${id}: no allowed-tools declared`);
  } else {
    // Only unambiguous tool tokens (not English words) are checked, so the
    // "declared set covers body usage" rule never false-positives on prose like
    // "Read the file". A body that names one of these tools must declare it.
    const UNAMBIGUOUS_TOOLS = ['AskUserQuestion', 'TodoWrite', 'Grep', 'Glob', 'WebFetch', 'WebSearch'];
    for (const tool of UNAMBIGUOUS_TOOLS) {
      if (template.instructions.includes(tool) && !declared.includes(tool)) {
        errors.push(`${id}: body uses ${tool} but it is not in the declared allowed-tools`);
      }
    }
  }

  // Reference links resolve to an emitted file
  const emitted = new Set(getSkillReferenceFiles(template).map((r) => r.relativePath));
  const linked = template.instructions.match(REFERENCE_LINK_PATTERN) ?? [];
  for (const link of linked) {
    if (!emitted.has(link)) {
      errors.push(`${id}: links "${link}" but no such reference file is emitted`);
    }
  }

  // Body budget — warning, not a hard failure
  const bodyLines = template.instructions.split('\n').length;
  if (bodyLines > BODY_LINE_BUDGET) {
    warnings.push(`${id}: body is ${bodyLines} lines, over the ${BODY_LINE_BUDGET}-line budget`);
  }

  return { errors, warnings };
}
