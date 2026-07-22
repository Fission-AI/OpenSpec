/**
 * ATD verify workflow templates (skill + slash command).
 *
 * Step 4 of the ATD journey: façade over the generic verify workflow that
 * additionally checks standards conformance, documentation, and closure
 * readiness.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { buildVerifyChangeBody } from './verify-change.js';
import { buildAtdSchemaGuard, buildAtdJourneyFooter } from './atd-workflow-shared.js';

const ATD_VERIFY_INSTRUCTIONS = buildVerifyChangeBody({
  intro: 'Verify an ATD change before closing: tests, acceptance criteria, standards conformance, documentation, and closure readiness (step 4 of the ATD journey).',
  inputLine: 'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.',
  statusGuard: buildAtdSchemaGuard('openspec-verify-change'),
  outro: buildAtdJourneyFooter(
    4,
    `**ATD verification additions** — fold these into the three-dimension report:
- **Acceptance criteria**: every requirement traces to an acceptance-criterion ID and each AC is covered by a test or implementation evidence.
- **Standards conformance**: the implementation follows the ATD standards named by the schema for each affected stack; cite the standards spec sections checked.
- **Documentation**: the solution document reflects what was actually built, and any required publication targets are named.
- **Closure readiness**: the closure task group (standards conformance, solution-document reconciliation, publication, Jira closure) is complete or the gaps are listed as CRITICAL.

When the report is clean, hand off to \`atd-change-close\`; gaps go back to \`atd-change-apply\`.`
  ),
});

export function getAtdVerifySkillTemplate(): SkillTemplate {
  return {
    name: 'atd-change-verify',
    description:
      'Verify an ATD change: tests, acceptance criteria, standards conformance, documentation, and closure readiness. Step 4 of the ATD journey; use after atd-change-apply.',
    instructions: ATD_VERIFY_INSTRUCTIONS,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAtdVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'atd-verify',
    description: 'Verify an ATD change before closing (step 4 of the ATD journey)',
    category: 'Workflow',
    tags: ['workflow', 'atd', 'verify'],
    content: ATD_VERIFY_INSTRUCTIONS,
  };
}
