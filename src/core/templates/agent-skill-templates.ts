export type AgentSkillId = 'proposal' | 'apply' | 'archive' | 'context-check';
import { applyTemplate, applyFrontmatter } from './apply-template.js';
import { archiveTemplate, archiveFrontmatter } from './archive-template.js';
import { proposalTemplate, proposalFrontmatter } from './proposal-template.js';
import {
  contextCheckTemplate,
  contextCheckFrontmatter,
} from './context-check-template.js';

export const agentSkillBodies: Record<AgentSkillId, string> = {
  proposal: proposalTemplate,
  apply: applyTemplate,
  archive: archiveTemplate,
  'context-check': contextCheckTemplate,
};

export const agentSkillFrontmatter: Record<AgentSkillId, string> = {
  proposal: proposalFrontmatter,
  apply: applyFrontmatter,
  archive: archiveFrontmatter,
  'context-check': contextCheckFrontmatter,
};

export function getAgentSkillBody(id: AgentSkillId): string {
  return agentSkillBodies[id];
}

export function getAgentSkillFrontmatter(id: AgentSkillId): string {
  return agentSkillFrontmatter[id];
}
