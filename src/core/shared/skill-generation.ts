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
import * as betaTemplates from '../templates/beta/skill-templates.js';
import * as fs from 'fs';
import path from 'path';
import type { CommandContent } from '../command-generation/index.js';
import {
  assertWorkflowConditionalsResolved,
  resolveOptionalWorkflows,
} from '../templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../profiles.js';
import { OPENSPEC_CLI_ALLOWED_TOOLS } from './allowed-tools.js';
import { FileSystemUtils } from '../../utils/file-system.js';

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
/**
 * Which getter on a template barrel renders each workflow, and the directory
 * today's per-project skills use. One list, two sources: the frozen per-project
 * templates, and the `openspec-beta` copy that the router skill evolves.
 */
const SKILL_SOURCES = [
  ['explore', 'openspec-explore', 'getExploreSkillTemplate'],
  ['new', 'openspec-new-change', 'getNewChangeSkillTemplate'],
  ['continue', 'openspec-continue-change', 'getContinueChangeSkillTemplate'],
  ['apply', 'openspec-apply-change', 'getApplyChangeSkillTemplate'],
  ['update', 'openspec-update-change', 'getUpdateChangeSkillTemplate'],
  ['ff', 'openspec-ff-change', 'getFfChangeSkillTemplate'],
  ['sync', 'openspec-sync-specs', 'getSyncSpecsSkillTemplate'],
  ['archive', 'openspec-archive-change', 'getArchiveChangeSkillTemplate'],
  ['bulk-archive', 'openspec-bulk-archive-change', 'getBulkArchiveChangeSkillTemplate'],
  ['verify', 'openspec-verify-change', 'getVerifyChangeSkillTemplate'],
  ['onboard', 'openspec-onboard', 'getOnboardSkillTemplate'],
  ['propose', 'openspec-propose', 'getOpsxProposeSkillTemplate'],
] as const satisfies ReadonlyArray<readonly [string, string, keyof typeof betaTemplates]>;

/** The per-project barrel, frozen so an `openspec update` never changes today's skills. */
const PROJECT_TEMPLATES = {
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
} as const;

type TemplateSource = { [K in (typeof SKILL_SOURCES)[number][2]]: () => SkillTemplate };

function templateEntries(source: TemplateSource): SkillTemplateEntry[] {
  return SKILL_SOURCES.map(([workflowId, dirName, getter]) => ({
    template: source[getter](),
    dirName,
    workflowId,
  }));
}

/** Skill templates for the `openspec-beta` skills, which `openspec setup` installs. */
export function getBetaSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  return selectSkillTemplates(templateEntries(betaTemplates), workflowFilter);
}

export function getSkillTemplates(workflowFilter?: readonly string[]): SkillTemplateEntry[] {
  return selectSkillTemplates(templateEntries(PROJECT_TEMPLATES), workflowFilter);
}

function selectSkillTemplates(
  all: SkillTemplateEntry[],
  workflowFilter?: readonly string[]
): SkillTemplateEntry[] {
  const installed = resolveInstalledWorkflows(workflowFilter);
  const selected = workflowFilter ? all.filter(entry => installed.has(entry.workflowId)) : all;

  return selected.map(entry => ({
    ...entry,
    template: {
      ...entry.template,
      instructions: resolveOptionalWorkflows(entry.template.instructions, installed),
      references: entry.template.references?.map((reference) => ({
        ...reference,
        content: resolveOptionalWorkflows(reference.content, installed),
      })),
    },
  }));
}

/**
 * Gets command templates with their IDs, optionally filtered by workflow IDs.
 *
 * @param workflowFilter - If provided, only return templates whose id is in this array
 */
const COMMAND_SOURCES = [
  ['explore', 'getOpsxExploreCommandTemplate'],
  ['new', 'getOpsxNewCommandTemplate'],
  ['continue', 'getOpsxContinueCommandTemplate'],
  ['apply', 'getOpsxApplyCommandTemplate'],
  ['update', 'getOpsxUpdateCommandTemplate'],
  ['ff', 'getOpsxFfCommandTemplate'],
  ['sync', 'getOpsxSyncCommandTemplate'],
  ['archive', 'getOpsxArchiveCommandTemplate'],
  ['bulk-archive', 'getOpsxBulkArchiveCommandTemplate'],
  ['verify', 'getOpsxVerifyCommandTemplate'],
  ['onboard', 'getOpsxOnboardCommandTemplate'],
  ['propose', 'getOpsxProposeCommandTemplate'],
] as const satisfies ReadonlyArray<readonly [string, keyof typeof betaTemplates]>;

const PROJECT_COMMANDS = {
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
} as const;

type CommandSource = {
  [K in (typeof COMMAND_SOURCES)[number][1]]: () => ReturnType<typeof getOpsxExploreCommandTemplate>;
};

function commandEntries(source: CommandSource): CommandTemplateEntry[] {
  return COMMAND_SOURCES.map(([id, getter]) => ({ template: source[getter](), id }));
}

/**
 * Command renderings of the beta templates. Nothing installs these: `openspec
 * setup` writes skills only. They exist so the beta bodies are checked on both
 * surfaces, the way the per-project ones are.
 */
export function getBetaCommandTemplates(workflowFilter?: readonly string[]): CommandTemplateEntry[] {
  return selectCommandTemplates(commandEntries(betaTemplates), workflowFilter);
}

export function getCommandTemplates(workflowFilter?: readonly string[]): CommandTemplateEntry[] {
  return selectCommandTemplates(commandEntries(PROJECT_COMMANDS), workflowFilter);
}

function selectCommandTemplates(
  all: CommandTemplateEntry[],
  workflowFilter?: readonly string[]
): CommandTemplateEntry[] {
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
export function getBetaCommandContents(workflowFilter?: readonly string[]): CommandContent[] {
  return toCommandContents(getBetaCommandTemplates(workflowFilter));
}

export function getCommandContents(workflowFilter?: readonly string[]): CommandContent[] {
  return toCommandContents(getCommandTemplates(workflowFilter));
}

function toCommandContents(commandTemplates: CommandTemplateEntry[]): CommandContent[] {
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

/** One file of a generated skill, relative to the skill directory. */
export interface GeneratedSkillFile {
  relativePath: string;
  content: string;
}

const REFERENCE_PATH = /^references\/[a-z0-9][a-z0-9-]*\.md$/;

/**
 * Generates every file of a skill: SKILL.md plus its `references/` files.
 *
 * References get the same per-tool transform as SKILL.md, so a command
 * reference reads the same way wherever the agent finds it.
 *
 * @param template - The skill template
 * @param generatedByVersion - The OpenSpec version to embed in SKILL.md
 * @param transformInstructions - Optional callback applied to every file body
 */
export function generateSkillFiles(
  template: SkillTemplate,
  generatedByVersion: string,
  transformInstructions?: (instructions: string) => string
): GeneratedSkillFile[] {
  const references = (template.references ?? []).map(({ path: relativePath, content }) => {
    if (!REFERENCE_PATH.test(relativePath)) {
      throw new Error(
        `Skill '${template.name}' has an invalid reference path '${relativePath}'. Use references/<name>.md.`
      );
    }
    const body = transformInstructions ? transformInstructions(content) : content;
    assertWorkflowConditionalsResolved(
      body,
      `Skill '${template.name}' reference '${relativePath}' was generated without resolving its optional-workflow blocks`
    );
    return { relativePath, content: body.endsWith('\n') ? body : `${body}\n` };
  });

  return [
    { relativePath: 'SKILL.md', content: generateSkillContent(template, generatedByVersion, transformInstructions) },
    ...references,
  ];
}

/**
 * Writes a skill's files into `skillDir`, refusing any path outside `root`.
 *
 * The skill directory belongs to OpenSpec (removing a workflow deletes it
 * whole), so a reference file a newer version no longer ships is removed
 * rather than left for the agent to find.
 */
export async function writeSkillFiles(
  root: string,
  skillDir: string,
  files: readonly GeneratedSkillFile[]
): Promise<void> {
  for (const file of files) {
    const target = path.join(skillDir, file.relativePath);
    FileSystemUtils.assertPathWithin(root, target);
    await FileSystemUtils.writeFile(target, file.content);
  }

  const referencesDir = path.join(skillDir, 'references');
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(referencesDir, { withFileTypes: true });
  } catch {
    return;
  }
  const kept = new Set(files.map((file) => file.relativePath));
  for (const entry of entries) {
    const relativePath = `references/${entry.name}`;
    if (entry.isFile() && entry.name.endsWith('.md') && !kept.has(relativePath)) {
      const stale = path.join(referencesDir, entry.name);
      FileSystemUtils.assertPathWithin(root, stale);
      await fs.promises.rm(stale, { force: true });
    }
  }
}
