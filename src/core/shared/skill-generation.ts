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
import {
  assertWorkflowConditionalsResolved,
  resolveOptionalWorkflows,
} from '../templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../profiles.js';
import { OPENSPEC_CLI_ALLOWED_TOOLS } from './allowed-tools.js';

/**
 * The workflow set a template body is rendered against.
 *
 * `workflowFilter` is both the list of workflows to install and the set a
 * template may refer to, so resolving optional-workflow conditionals here —
 * the one place every generation path (init, update, migration, the skills.sh
 * distribution) already funnels through — keeps a reference to an uninstalled
 * workflow out of every generated file (#1734, umbrella #919).
 *
 * With no filter, every workflow is installed (that is what an unfiltered call
 * means), so the installed branch is kept.
 */
function resolveInstalledWorkflows(
  workflowFilter?: readonly string[]
): ReadonlySet<string> {
  return new Set<string>(workflowFilter ?? ALL_WORKFLOWS);
}

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
 * @param workflowFilter - If provided, only return templates whose workflowId is in this array
 */
export function getSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  const all = allSkillTemplates();
  const installed = resolveInstalledWorkflows(workflowFilter);
  const selected = workflowFilter ? all.filter(entry => installed.has(entry.workflowId)) : all;

  return selected.map(entry => ({
    ...entry,
    template: {
      ...entry.template,
      instructions: resolveOptionalWorkflows(entry.template.instructions, installed),
    },
  }));
}

/**
 * Every text this version writes for one skill, whatever set of workflows was
 * installed beside it. A skill's text changes only with the workflows its own
 * conditionals name, so this is 2^k texts for k such workflows.
 */
export function everySkillRendering(
  dirName: string,
  generatedByVersion: string,
  transformInstructions?: (instructions: string) => string
): string[] {
  // Pure and asked for many times per run (every tool, every skill): cached
  // per transformer, version and skill.
  const byTransformer = renderingCache.get(transformInstructions ?? NO_TRANSFORM) ?? new Map<string, string[]>();
  renderingCache.set(transformInstructions ?? NO_TRANSFORM, byTransformer);
  const key = `${generatedByVersion}\0${dirName}`;
  const cached = byTransformer.get(key);
  if (cached) return cached;
  const entry = allSkillTemplates().find((candidate) => candidate.dirName === dirName);
  if (!entry) return [];
  const named = [
    ...new Set([...entry.template.instructions.matchAll(/\[\[opsx:if-workflow ([a-z-]+)\]\]/g)].map((match) => match[1])),
  ];
  const texts: string[] = [];
  for (let mask = 0; mask < 2 ** named.length; mask += 1) {
    const installed = new Set(named.filter((_, index) => mask & (2 ** index)));
    texts.push(
      generateSkillContent(
        { ...entry.template, instructions: resolveOptionalWorkflows(entry.template.instructions, installed) },
        generatedByVersion,
        transformInstructions
      )
    );
  }
  byTransformer.set(key, texts);
  return texts;
}

const NO_TRANSFORM = (text: string) => text;
const renderingCache = new WeakMap<(text: string) => string, Map<string, string[]>>();

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

  const installed = resolveInstalledWorkflows(workflowFilter);
  const selected = workflowFilter ? all.filter(entry => installed.has(entry.id)) : all;

  return selected.map(entry => ({
    ...entry,
    template: {
      ...entry.template,
      content: resolveOptionalWorkflows(entry.template.content, installed),
    },
  }));
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

  assertWorkflowConditionalsResolved(
    instructions,
    `Skill '${template.name}' was generated without resolving its optional-workflow blocks`
  );

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
---

${instructions}
`;
}
