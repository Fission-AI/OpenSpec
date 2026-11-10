/**
 * Generation for the `openspec-beta` skills.
 *
 * Kept apart from skill-generation.ts, which writes today's per-project skills
 * for `openspec init` and `openspec update`: nothing here is reachable from
 * either, so the beta can change without touching what those commands write.
 * The committed `skills/` mirror (`scripts/generate-skillssh.mjs`) is built
 * from this module.
 */

import * as betaTemplates from '../templates/beta/skill-templates.js';
import type { SkillTemplate } from '../templates/beta/types.js';
import type { CommandContent } from '../command-generation/index.js';
import {
  assertWorkflowConditionalsResolved,
  resolveOptionalWorkflows,
} from '../templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../profiles.js';
import { generateSkillContent } from './skill-generation.js';

/** A beta skill template with its workflow id and today's per-project directory name. */
export interface BetaSkillTemplateEntry {
  template: SkillTemplate;
  dirName: string;
  workflowId: string;
}

/** A beta command rendering with its workflow id. */
export interface BetaCommandTemplateEntry {
  template: betaTemplates.CommandTemplate;
  id: string;
}

/**
 * Which getter renders each workflow, and the directory today's per-project
 * skill uses (the router keeps those names for anything that looks them up).
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

/**
 * The workflows a template is rendered against: the installed set, or every
 * workflow when there is no filter. Optional-workflow blocks resolve against
 * it, so no generated file names a workflow that is not installed (#1734).
 */
function installedWorkflows(workflowFilter?: readonly string[]): ReadonlySet<string> {
  return new Set<string>(workflowFilter ?? ALL_WORKFLOWS);
}

/** Beta skill templates, optionally filtered by workflow id. */
export function getBetaSkillTemplates(workflowFilter?: readonly string[]): BetaSkillTemplateEntry[] {
  const installed = installedWorkflows(workflowFilter);
  return SKILL_SOURCES.filter(([workflowId]) => !workflowFilter || installed.has(workflowId)).map(
    ([workflowId, dirName, getter]) => {
      const template: SkillTemplate = betaTemplates[getter]();
      return {
        workflowId,
        dirName,
        template: {
          ...template,
          instructions: resolveOptionalWorkflows(template.instructions, installed),
          references: template.references?.map((reference) => ({
            ...reference,
            content: resolveOptionalWorkflows(reference.content, installed),
          })),
        },
      };
    }
  );
}

/**
 * Command renderings of the beta templates. Nothing installs these; they exist
 * so the beta bodies are checked on both surfaces, the way today's are.
 */
export function getBetaCommandTemplates(workflowFilter?: readonly string[]): BetaCommandTemplateEntry[] {
  const installed = installedWorkflows(workflowFilter);
  return COMMAND_SOURCES.filter(([id]) => !workflowFilter || installed.has(id)).map(([id, getter]) => {
    const template = betaTemplates[getter]();
    return { id, template: { ...template, content: resolveOptionalWorkflows(template.content, installed) } };
  });
}

export function getBetaCommandContents(workflowFilter?: readonly string[]): CommandContent[] {
  return getBetaCommandTemplates(workflowFilter).map(({ template, id }) => ({
    id,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: template.tags,
    body: template.content,
  }));
}

/** One file of a generated skill, relative to the skill directory. */
export interface GeneratedSkillFile {
  relativePath: string;
  content: string;
}

const REFERENCE_PATH = /^references\/[a-z0-9][a-z0-9-]*\.md$/;

/**
 * Every file of a beta skill: SKILL.md, then its `references/` files. A
 * transform applies to all of them, so a reference reads the same way wherever
 * the agent finds it.
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
