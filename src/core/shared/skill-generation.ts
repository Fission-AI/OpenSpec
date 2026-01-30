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
  getOpsxExploreCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getOpsxOnboardCommandTemplate,
  type SkillTemplate,
} from '../templates/skill-templates.js';
import type { CommandContent } from '../command-generation/index.js';

/**
 * Skill template with directory name mapping.
 */
export interface SkillTemplateEntry {
  template: SkillTemplate;
  dirName: string;
}

/**
 * Command template with ID mapping.
 */
export interface CommandTemplateEntry {
  template: ReturnType<typeof getOpsxExploreCommandTemplate>;
  id: string;
}

/**
 * Gets all skill templates with their directory names.
 */
export function getSkillTemplates(): SkillTemplateEntry[] {
  return [
    { template: getExploreSkillTemplate(), dirName: 'openspec-explore' },
    { template: getNewChangeSkillTemplate(), dirName: 'openspec-new-change' },
    { template: getContinueChangeSkillTemplate(), dirName: 'openspec-continue-change' },
    { template: getApplyChangeSkillTemplate(), dirName: 'openspec-apply-change' },
    { template: getFfChangeSkillTemplate(), dirName: 'openspec-ff-change' },
    { template: getSyncSpecsSkillTemplate(), dirName: 'openspec-sync-specs' },
    { template: getArchiveChangeSkillTemplate(), dirName: 'openspec-archive-change' },
    { template: getBulkArchiveChangeSkillTemplate(), dirName: 'openspec-bulk-archive-change' },
    { template: getVerifyChangeSkillTemplate(), dirName: 'openspec-verify-change' },
    { template: getOnboardSkillTemplate(), dirName: 'openspec-onboard' },
  ];
}

/**
 * Gets all command templates with their IDs.
 */
export function getCommandTemplates(): CommandTemplateEntry[] {
  return [
    { template: getOpsxExploreCommandTemplate(), id: 'explore' },
    { template: getOpsxNewCommandTemplate(), id: 'new' },
    { template: getOpsxContinueCommandTemplate(), id: 'continue' },
    { template: getOpsxApplyCommandTemplate(), id: 'apply' },
    { template: getOpsxFfCommandTemplate(), id: 'ff' },
    { template: getOpsxSyncCommandTemplate(), id: 'sync' },
    { template: getOpsxArchiveCommandTemplate(), id: 'archive' },
    { template: getOpsxBulkArchiveCommandTemplate(), id: 'bulk-archive' },
    { template: getOpsxVerifyCommandTemplate(), id: 'verify' },
    { template: getOpsxOnboardCommandTemplate(), id: 'onboard' },
  ];
}

/**
 * Converts command templates to CommandContent array.
 */
export function getCommandContents(): CommandContent[] {
  const commandTemplates = getCommandTemplates();
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
 * @param generatedByVersion - The OpenSpec version to embed in the file
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
compatibility: ${template.compatibility || 'Requires openspec CLI.'}
metadata:
  author: ${template.metadata?.author || 'openspec'}
  version: "${template.metadata?.version || '1.0'}"
  generatedBy: "${generatedByVersion}"
---

${instructions}
`;
}
