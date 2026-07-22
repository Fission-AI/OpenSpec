/**
 * ATD apply workflow templates (skill + slash command).
 *
 * Step 3 of the ATD journey: façade over the generic apply workflow that
 * loads the applicable ATD standards and executes every tracked task,
 * including the closure tasks.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { buildApplyChangeBody } from './apply-change.js';
import { buildAtdSchemaGuard, buildAtdJourneyFooter } from './atd-workflow-shared.js';

const ATD_APPLY_INSTRUCTIONS = buildApplyChangeBody({
  intro: 'Implement the tracked tasks of an ATD change under the applicable ATD standards (step 3 of the ATD journey).',
  inputLine: 'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.',
  overrideExample: '/opsx:atd-apply <other>',
  statusGuard: buildAtdSchemaGuard('openspec-apply-change'),
  blockedNext: '`atd-change-continue`',
  contextFilesNote: '(varies by schema)',
  completionFooter: 'All tasks complete! Continue with `atd-change-verify` before closing.',
  outro: buildAtdJourneyFooter(
    3,
    `**ATD policy**: The schema's apply instructions name the coding standards to load from the \`atd-standards\` store for each affected stack — follow them before writing code. Every tracked task must be completed here, including the closure task group (standards conformance, solution-document reconciliation, publication, and Jira closure): \`atd-change-close\` only gates on their completion, it never performs them. When all tasks are checked, hand off to \`atd-change-verify\`.`
  ),
});

export function getAtdApplySkillTemplate(): SkillTemplate {
  return {
    name: 'atd-change-apply',
    description:
      'Implement an ATD change: load the applicable ATD standards and execute every tracked task, including closure tasks. Step 3 of the ATD journey; use after atd-change-continue.',
    instructions: ATD_APPLY_INSTRUCTIONS,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAtdApplyCommandTemplate(): CommandTemplate {
  return {
    name: 'atd-apply',
    description: 'Implement an ATD change under the ATD standards (step 3 of the ATD journey)',
    category: 'Workflow',
    tags: ['workflow', 'atd', 'apply'],
    content: ATD_APPLY_INSTRUCTIONS,
  };
}
