/**
 * Skill Generation Utilities
 *
 * Shared utilities for generating skill and command files.
 */

import {
  getExploreSkillTemplate,
  getNewChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getApplyChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getCompleteChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
  getOnboardSkillTemplate,
  getProposeSkillTemplate,
  getTrelloSetupSkillTemplate,
  getTrelloDraftSkillTemplate,
  getPsExploreCommandTemplate,
  getPsNewCommandTemplate,
  getPsContinueCommandTemplate,
  getPsApplyCommandTemplate,
  getPsFfCommandTemplate,
  getPsCompleteCommandTemplate,
  getPsBulkArchiveCommandTemplate,
  getPsVerifyCommandTemplate,
  getPsOnboardCommandTemplate,
  getPsProposeCommandTemplate,
  getTrelloSetupCommandTemplate,
  getTrelloDraftCommandTemplate,
  type SkillTemplate,
} from '../templates/skill-templates.js';
import type { CommandContent } from '../command-generation/index.js';

/**
 * Skill template with directory name and workflow ID mapping.
 */
export interface SkillTemplateEntry {
  template: SkillTemplate;
  dirName: string;
  workflowId: string;
}

/**
 * Command template with ID mapping.
 */
export interface CommandTemplateEntry {
  template: ReturnType<typeof getPsExploreCommandTemplate>;
  id: string;
}

/**
 * Gets skill templates with their directory names, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose workflowId is in this array
 */
export function getSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  const all: SkillTemplateEntry[] = [
    { template: getExploreSkillTemplate(), dirName: 'pscode-explore', workflowId: 'explore' },
    { template: getNewChangeSkillTemplate(), dirName: 'pscode-new-change', workflowId: 'new' },
    { template: getContinueChangeSkillTemplate(), dirName: 'pscode-continue-change', workflowId: 'continue' },
    { template: getApplyChangeSkillTemplate(), dirName: 'pscode-apply-change', workflowId: 'apply' },
    { template: getFfChangeSkillTemplate(), dirName: 'pscode-ff-change', workflowId: 'ff' },
    { template: getCompleteChangeSkillTemplate(), dirName: 'pscode-archive-change', workflowId: 'complete' },
    { template: getBulkArchiveChangeSkillTemplate(), dirName: 'pscode-bulk-archive-change', workflowId: 'bulk-archive' },
    { template: getVerifyChangeSkillTemplate(), dirName: 'pscode-verify-change', workflowId: 'verify' },
    { template: getOnboardSkillTemplate(), dirName: 'pscode-onboard', workflowId: 'onboard' },
    { template: getProposeSkillTemplate(), dirName: 'pscode-propose', workflowId: 'propose' },
    // Trello-specific workflows
    { template: getTrelloSetupSkillTemplate(), dirName: 'pscode-trello-setup', workflowId: 'trello-setup' },
    { template: getTrelloDraftSkillTemplate(), dirName: 'pscode-trello-draft', workflowId: 'draft' },
  ];

  if (!workflowFilter) return all;

  const filterSet = new Set(workflowFilter);
  return all.filter(entry => filterSet.has(entry.workflowId));
}

/**
 * Gets command templates with their IDs, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose id is in this array
 */
export function getCommandTemplates(workflowFilter?: readonly string[]): CommandTemplateEntry[] {
  const all: CommandTemplateEntry[] = [
    { template: getPsExploreCommandTemplate(), id: 'explore' },
    { template: getPsNewCommandTemplate(), id: 'new' },
    { template: getPsContinueCommandTemplate(), id: 'continue' },
    { template: getPsApplyCommandTemplate(), id: 'apply' },
    { template: getPsFfCommandTemplate(), id: 'ff' },
    { template: getPsCompleteCommandTemplate(), id: 'complete' },
    { template: getPsBulkArchiveCommandTemplate(), id: 'bulk-archive' },
    { template: getPsVerifyCommandTemplate(), id: 'verify' },
    { template: getPsOnboardCommandTemplate(), id: 'onboard' },
    { template: getPsProposeCommandTemplate(), id: 'propose' },
    // Trello-specific workflows
    { template: getTrelloSetupCommandTemplate(), id: 'trello-setup' },
    { template: getTrelloDraftCommandTemplate(), id: 'draft' },
  ];

  if (!workflowFilter) return all;

  const filterSet = new Set(workflowFilter);
  return all.filter(entry => filterSet.has(entry.id));
}

/**
 * Converts command templates to CommandContent array, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return contents whose id is in this array
 */
export function getCommandContents(workflowFilter?: readonly string[]): CommandContent[] {
  const commandTemplates = getCommandTemplates(workflowFilter);
  return commandTemplates.map(({ template, id }) => ({
    id,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: template.tags,
    body: template.content,
  }));
}

/**
 * Generates skill file content with YAML frontmatter.
 *
 * @param template - The skill template
 * @param generatedByVersion - The Pscode version to embed in the file
 * @param transformInstructions - Optional callback to transform the instructions content
 */
export function generateSkillContent(
  template: SkillTemplate,
  generatedByVersion: string,
  transformInstructions?: (instructions: string) => string
): string {
  const instructions = transformInstructions
    ? transformInstructions(template.instructions)
    : template.instructions;

  return `---
name: ${template.name}
description: ${template.description}
license: ${template.license || 'MIT'}
compatibility: ${template.compatibility || 'Requires pscode CLI.'}
metadata:
  author: ${template.metadata?.author || 'pscode'}
  version: "${template.metadata?.version || '1.0'}"
  generatedBy: "${generatedByVersion}"
---

${instructions}
`;
}
