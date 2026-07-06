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
  getSyncSpecsSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
  getOnboardSkillTemplate,
  getClsxProposeSkillTemplate,
  getCheckReadinessSkillTemplate,
  getDeepReviewSkillTemplate,
  getDiscoverSkillTemplate,
  getClsxExploreCommandTemplate,
  getClsxNewCommandTemplate,
  getClsxContinueCommandTemplate,
  getClsxApplyCommandTemplate,
  getClsxFfCommandTemplate,
  getClsxSyncCommandTemplate,
  getClsxArchiveCommandTemplate,
  getClsxBulkArchiveCommandTemplate,
  getClsxVerifyCommandTemplate,
  getClsxOnboardCommandTemplate,
  getClsxProposeCommandTemplate,
  getClsxCheckReadinessCommandTemplate,
  getClsxDeepReviewCommandTemplate,
  getClsxDiscoverCommandTemplate,
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
  template: ReturnType<typeof getClsxExploreCommandTemplate>;
  id: string;
}

/**
 * Gets skill templates with their directory names, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose workflowId is in this array
 */
export function getSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  const all: SkillTemplateEntry[] = [
    { template: getExploreSkillTemplate(), dirName: 'clearspec-explore', workflowId: 'explore' },
    { template: getNewChangeSkillTemplate(), dirName: 'clearspec-new-change', workflowId: 'new' },
    { template: getContinueChangeSkillTemplate(), dirName: 'clearspec-continue-change', workflowId: 'continue' },
    { template: getApplyChangeSkillTemplate(), dirName: 'clearspec-apply-change', workflowId: 'apply' },
    { template: getFfChangeSkillTemplate(), dirName: 'clearspec-ff-change', workflowId: 'ff' },
    { template: getSyncSpecsSkillTemplate(), dirName: 'clearspec-sync-specs', workflowId: 'sync' },
    { template: getArchiveChangeSkillTemplate(), dirName: 'clearspec-archive-change', workflowId: 'archive' },
    { template: getBulkArchiveChangeSkillTemplate(), dirName: 'clearspec-bulk-archive-change', workflowId: 'bulk-archive' },
    { template: getVerifyChangeSkillTemplate(), dirName: 'clearspec-verify-change', workflowId: 'verify' },
    { template: getOnboardSkillTemplate(), dirName: 'clearspec-onboard', workflowId: 'onboard' },
    { template: getClsxProposeSkillTemplate(), dirName: 'clearspec-propose', workflowId: 'propose' },
    { template: getCheckReadinessSkillTemplate(), dirName: 'clearspec-check-readiness', workflowId: 'check-readiness' },
    { template: getDeepReviewSkillTemplate(), dirName: 'clearspec-deep-review', workflowId: 'deep-review' },
    { template: getDiscoverSkillTemplate(), dirName: 'clearspec-discover', workflowId: 'discover' },
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
    { template: getClsxExploreCommandTemplate(), id: 'explore' },
    { template: getClsxNewCommandTemplate(), id: 'new' },
    { template: getClsxContinueCommandTemplate(), id: 'continue' },
    { template: getClsxApplyCommandTemplate(), id: 'apply' },
    { template: getClsxFfCommandTemplate(), id: 'ff' },
    { template: getClsxSyncCommandTemplate(), id: 'sync' },
    { template: getClsxArchiveCommandTemplate(), id: 'archive' },
    { template: getClsxBulkArchiveCommandTemplate(), id: 'bulk-archive' },
    { template: getClsxVerifyCommandTemplate(), id: 'verify' },
    { template: getClsxOnboardCommandTemplate(), id: 'onboard' },
    { template: getClsxProposeCommandTemplate(), id: 'propose' },
    { template: getClsxCheckReadinessCommandTemplate(), id: 'check-readiness' },
    { template: getClsxDeepReviewCommandTemplate(), id: 'deep-review' },
    { template: getClsxDiscoverCommandTemplate(), id: 'discover' },
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
 * @param generatedByVersion - The ClearSpec version to embed in the file
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
compatibility: ${template.compatibility || 'Requires clearspec CLI.'}
metadata:
  author: ${template.metadata?.author || 'clearspec'}
  version: "${template.metadata?.version || '1.0'}"
  generatedBy: "${generatedByVersion}"
---

${instructions}
`;
}
