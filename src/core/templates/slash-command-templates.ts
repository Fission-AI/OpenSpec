import {
  PROPOSAL_GUARDRAILS,
  PROPOSAL_STEPS,
  PROPOSAL_REFERENCES,
  BASE_GUARDRAILS,
  APPLY_STEPS,
  APPLY_REFERENCES,
  ARCHIVE_STEPS,
  ARCHIVE_REFERENCES
} from './prompts.js';

export type SlashCommandId = 'proposal' | 'apply' | 'archive';

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: [PROPOSAL_GUARDRAILS, PROPOSAL_STEPS, PROPOSAL_REFERENCES].join('\n\n'),
  apply: [BASE_GUARDRAILS, APPLY_STEPS, APPLY_REFERENCES].join('\n\n'),
  archive: [BASE_GUARDRAILS, ARCHIVE_STEPS, ARCHIVE_REFERENCES].join('\n\n')
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}
