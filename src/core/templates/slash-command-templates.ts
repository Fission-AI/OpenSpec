export type SlashCommandId = 'proposal' | 'apply' | 'archive' | 'context-check';
import { applyTemplate, applyFrontmatter } from './apply-template.js';
import { archiveTemplate, archiveFrontmatter } from './archive-template.js';
import { proposalTemplate, proposalFrontmatter } from './proposal-template.js';
import {
  contextCheckTemplate,
  contextCheckFrontmatter,
} from './context-check-template.js';

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: proposalTemplate,
  apply: applyTemplate,
  archive: archiveTemplate,
  'context-check': contextCheckTemplate,
};

export const slashCommandFrontmatter: Record<SlashCommandId, string> = {
  proposal: proposalFrontmatter,
  apply: applyFrontmatter,
  archive: archiveFrontmatter,
  'context-check': contextCheckFrontmatter,
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}

export function getSlashCommandFrontmatter(id: SlashCommandId): string {
  return slashCommandFrontmatter[id];
}
