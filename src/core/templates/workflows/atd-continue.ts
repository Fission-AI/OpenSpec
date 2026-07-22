/**
 * ATD continue workflow templates (skill + slash command).
 *
 * Step 2 of the ATD journey: façade over the generic continue workflow that
 * creates the next artifact according to the change's ATD schema.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { buildContinueChangeBody } from './continue-change.js';
import { buildAtdSchemaGuard, buildAtdJourneyFooter } from './atd-workflow-shared.js';

const ATD_CONTINUE_INSTRUCTIONS = buildContinueChangeBody({
  intro: 'Create the next planning artifact for an ATD change according to its schema (step 2 of the ATD journey).',
  inputLine: 'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.',
  statusGuard: buildAtdSchemaGuard('openspec-continue-change'),
  completeSuggestion: 'All planning artifacts created! Continue with `atd-change-apply` to load the ATD standards and implement the tracked tasks.',
  nextPrompt: '"Ask me to continue for the next artifact, or move on to `atd-change-apply` once all planning artifacts exist."',
  outro: buildAtdJourneyFooter(
    2,
    'The change\'s selected schema (`atd-sdlc` or `atd-sdlc-lite`) drives which artifact comes next — never embed schema logic here; the `openspec` status/instructions commands resolve it. When every planning artifact is complete, hand off to `atd-change-apply`.'
  ),
});

export function getAtdContinueSkillTemplate(): SkillTemplate {
  return {
    name: 'atd-change-continue',
    description:
      'Create the next artifact for an ATD change (atd-sdlc or atd-sdlc-lite) according to its schema. Step 2 of the ATD journey; use after atd-change-triage.',
    instructions: ATD_CONTINUE_INSTRUCTIONS,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAtdContinueCommandTemplate(): CommandTemplate {
  return {
    name: 'atd-continue',
    description: 'Create the next artifact for an ATD change (step 2 of the ATD journey)',
    category: 'Workflow',
    tags: ['workflow', 'atd', 'continue'],
    content: ATD_CONTINUE_INSTRUCTIONS,
  };
}
