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
  getUpdateChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxProposeSkillTemplate,
  getRouterSkillTemplate,
  ROUTER_SKILL_NAME,
  getOpsxExploreCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxUpdateCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxProposeCommandTemplate,
  type SkillTemplate,
} from '../templates/skill-templates.js';
import type { CommandContent } from '../command-generation/index.js';
import { createHash } from 'node:crypto';
import { OPENSPEC_CLI_ALLOWED_TOOLS } from './allowed-tools.js';

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
  template: ReturnType<typeof getOpsxExploreCommandTemplate>;
  id: string;
}

/**
 * Gets skill templates with their directory names, optionally filtered by workflow IDs.
 *
 * The filter chooses which skills are returned, never what they say: a skill's
 * text is the same for every workflow list. The router skill comes with any
 * workflow skill and is not returned alone.
 *
 * @param workflowFilter - If provided, only return templates whose workflowId is in this array
 */
export function getSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  const all = allSkillTemplates();
  const wanted = workflowFilter && new Set<string>(workflowFilter);
  const workflows = wanted ? all.filter(entry => wanted.has(entry.workflowId)) : all;
  // The router points at the workflow skills, so it goes wherever any of them does.
  return workflows.length ? [...workflows, routerSkillEntry()] : workflows;
}

/** The router is not a workflow: no profile selects it or leaves it out. */
const ROUTER_WORKFLOW_ID = 'router';

function routerSkillEntry(): SkillTemplateEntry {
  return { template: getRouterSkillTemplate(), dirName: ROUTER_SKILL_NAME, workflowId: ROUTER_WORKFLOW_ID };
}

/**
 * Drops the per-release `generatedBy` frontmatter line. What is left is the
 * published form of a skill: the text in the repository's `skills/` folder,
 * and the text a project's `.agents/skills` holds, which is the same for every
 * release that doesn't change the skill.
 */
export function stripVolatileFrontmatter(content: string): string {
  return content.replace(/^ {2}generatedBy: .*\n/m, '');
}

function allSkillTemplates(): SkillTemplateEntry[] {
  return [
    { template: getExploreSkillTemplate(), dirName: 'openspec-explore', workflowId: 'explore' },
    { template: getNewChangeSkillTemplate(), dirName: 'openspec-new-change', workflowId: 'new' },
    { template: getContinueChangeSkillTemplate(), dirName: 'openspec-continue-change', workflowId: 'continue' },
    { template: getApplyChangeSkillTemplate(), dirName: 'openspec-apply-change', workflowId: 'apply' },
    { template: getUpdateChangeSkillTemplate(), dirName: 'openspec-update-change', workflowId: 'update' },
    { template: getFfChangeSkillTemplate(), dirName: 'openspec-ff-change', workflowId: 'ff' },
    { template: getSyncSpecsSkillTemplate(), dirName: 'openspec-sync-specs', workflowId: 'sync' },
    { template: getArchiveChangeSkillTemplate(), dirName: 'openspec-archive-change', workflowId: 'archive' },
    { template: getBulkArchiveChangeSkillTemplate(), dirName: 'openspec-bulk-archive-change', workflowId: 'bulk-archive' },
    { template: getVerifyChangeSkillTemplate(), dirName: 'openspec-verify-change', workflowId: 'verify' },
    { template: getOnboardSkillTemplate(), dirName: 'openspec-onboard', workflowId: 'onboard' },
    { template: getOpsxProposeSkillTemplate(), dirName: 'openspec-propose', workflowId: 'propose' },
  ];
}

/**
 * Gets command templates with their IDs, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose id is in this array
 */
export function getCommandTemplates(workflowFilter?: readonly string[]): CommandTemplateEntry[] {
  const all: CommandTemplateEntry[] = [
    { template: getOpsxExploreCommandTemplate(), id: 'explore' },
    { template: getOpsxNewCommandTemplate(), id: 'new' },
    { template: getOpsxContinueCommandTemplate(), id: 'continue' },
    { template: getOpsxApplyCommandTemplate(), id: 'apply' },
    { template: getOpsxUpdateCommandTemplate(), id: 'update' },
    { template: getOpsxFfCommandTemplate(), id: 'ff' },
    { template: getOpsxSyncCommandTemplate(), id: 'sync' },
    { template: getOpsxArchiveCommandTemplate(), id: 'archive' },
    { template: getOpsxBulkArchiveCommandTemplate(), id: 'bulk-archive' },
    { template: getOpsxVerifyCommandTemplate(), id: 'verify' },
    { template: getOpsxOnboardCommandTemplate(), id: 'onboard' },
    { template: getOpsxProposeCommandTemplate(), id: 'propose' },
  ];

  if (!workflowFilter) return all;
  const wanted = new Set<string>(workflowFilter);
  return all.filter(entry => wanted.has(entry.id));
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
allowed-tools: ${OPENSPEC_CLI_ALLOWED_TOOLS}
license: ${template.license || 'MIT'}
compatibility: ${template.compatibility || 'Requires openspec CLI.'}
metadata:
  author: ${template.metadata?.author || 'openspec'}
  version: "${template.metadata?.version || '1.0'}"
  generatedBy: "${generatedByVersion}"
${template.metadata?.references ? `  references: "${template.metadata.references}"\n` : ''}---

${instructions}
`;
}

/** Where the router keeps the steps of one workflow skill, relative to the router's folder. */
export function referencePath(workflowId: string): string {
  return `references/${workflowId}.md`;
}

/**
 * The files of one skill as they are published and installed, by path inside
 * the skill's folder.
 *
 * A workflow skill is a short SKILL.md that points at its steps. The steps
 * themselves, the template's instructions word for word, are a reference file
 * in the router's folder. The router's SKILL.md carries a digest of its
 * references, so a changed reference shows as a changed SKILL.md wherever an
 * install is compared with what this release publishes.
 */
export function generateSkillFiles(
  entry: SkillTemplateEntry,
  generatedByVersion: string,
  transformInstructions?: (instructions: string) => string
): Map<string, string> {
  const files = new Map<string, string>();
  if (entry.workflowId !== ROUTER_WORKFLOW_ID) {
    const pointer = { ...entry.template, instructions: stepsPointer(entry.workflowId) };
    return files.set('SKILL.md', generateSkillContent(pointer, generatedByVersion));
  }
  const digest = createHash('sha256');
  for (const workflow of allSkillTemplates()) {
    const steps = transformInstructions ? transformInstructions(workflow.template.instructions) : workflow.template.instructions;
    files.set(referencePath(workflow.workflowId), `${steps}\n`);
    digest.update(`${workflow.workflowId}\n${steps}\n`);
  }
  const router = { ...entry.template, metadata: { ...entry.template.metadata, references: digest.digest('hex').slice(0, 12) } };
  return files.set('SKILL.md', generateSkillContent(router, generatedByVersion, transformInstructions));
}

function stepsPointer(workflowId: string): string {
  return `The steps for this skill are in \`${referencePath(workflowId)}\` inside the \`${ROUTER_SKILL_NAME}\` skill, whose folder sits next to this skill's folder. Read that file now and follow it. Do nothing else for this request until you have read it.`;
}
