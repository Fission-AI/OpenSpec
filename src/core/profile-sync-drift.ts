import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS } from './config.js';
import type { Delivery } from './global-config.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { getConfiguredTools } from './shared/index.js';
import { classifyCommandFiles } from './shared/command-reconcile.js';
import { shouldReconcileCommandFilesForTool } from './command-surface.js';
import { isToolListed, readKeptSharedSkills } from './shared-skill-target.js';
import { ownSkillFolderNeedsWork } from './shared/shared-skill-install.js';
import { classifyOwnSkill } from './shared/own-skill-texts.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { DISK_VIEW, type FileView } from './file-view.js';
import { isRedundantLegacyCopy } from './shared/skill-content-equivalence.js';
import {
  resolveToolSkillsDir,
  toolSupportsSkills,
  usesSharedSkills,
} from './shared/skill-paths.js';

type WorkflowId = (typeof ALL_WORKFLOWS)[number];

/**
 * Maps workflow IDs to their skill directory names.
 */
export const WORKFLOW_TO_SKILL_DIR: Record<WorkflowId, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'update': 'openspec-update-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

function toKnownWorkflows(workflows: readonly string[]): WorkflowId[] {
  return workflows.filter(
    (workflow): workflow is WorkflowId =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
  );
}

/**
 * Returns tools that are configured via either skills or commands.
 */
export function getConfiguredToolsForProfileSync(
  projectPath: string,
  view: FileView = DISK_VIEW
): string[] {
  return getConfiguredTools(projectPath, view);
}

/**
 * Detects if a single tool has profile/delivery drift against the desired state.
 *
 * This function covers:
 * - required artifacts missing for selected workflows
 * - artifacts that should not exist for the selected delivery mode
 * - artifacts for workflows that were deselected from the current profile
 */
export function hasToolProfileOrDeliveryDrift(
  projectPath: string,
  toolId: string,
  desiredWorkflows: readonly string[],
  _delivery: Delivery,
  view: FileView = DISK_VIEW
): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool || !toolSupportsSkills(tool)) return false;

  const knownDesiredWorkflows = toKnownWorkflows(desiredWorkflows);
  const desiredWorkflowSet = new Set<WorkflowId>(knownDesiredWorkflows);
  const skillsDir = resolveToolSkillsDir(projectPath, tool);
  const adapter = CommandAdapterRegistry.get(toolId);

  const shared = usesSharedSkills(tool);
  const listed = shared && isToolListed(projectPath, toolId, view);
  for (const root of tool.legacySkillsDirs ?? []) {
    for (const workflow of knownDesiredWorkflows) {
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      const legacySkill = path.join(projectPath, root, 'skills', dirName, 'SKILL.md');
      if (!view.exists(legacySkill)) continue;

      const currentSkill = path.join(skillsDir, dirName, 'SKILL.md');
      if (!view.exists(currentSkill) || (shared && !listed)) {
        return true;
      }
      try {
        if (
          FileSystemUtils.canonicalizeExistingPath(legacySkill) ===
          FileSystemUtils.canonicalizeExistingPath(currentSkill)
        ) {
          continue;
        }
        // Redundant copies are actionable: migration can safely remove a
        // legacy file that matches the current one, or that is untouched
        // output of an older release. Copies holding user edits stay in place
        // without forcing an update on every run.
        if (isRedundantLegacyCopy(view.read(legacySkill), view.read(currentSkill), true)) {
          return true;
        }
      } catch {
        return true;
      }
    }
  }

  if (shared) {
    // The shared copy is common to every set-up tool, so only this tool's own
    // part is checked here: being listed, and its own skills folder.
    if (!listed) return true;
    const linked = new Set<string>(
      knownDesiredWorkflows.map((workflow) => WORKFLOW_TO_SKILL_DIR[workflow])
    );
    if (ownSkillFolderNeedsWork(projectPath, tool, linked, view)) return true;
  }

  // A skill the user keeps in the shared folder is theirs: OpenSpec neither
  // installs nor removes it.
  const kept = shared ? readKeptSharedSkills(projectPath, view) : new Set<string>();
  for (const workflow of knownDesiredWorkflows) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    // Once the user deletes a kept skill, OpenSpec installs its own again.
    if (kept.has(dirName) && view.exists(path.join(skillsDir, dirName))) continue;
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    if (!view.exists(skillFile)) {
      return true;
    }
  }

  // Deselecting workflows in a profile should trigger sync.
  for (const workflow of ALL_WORKFLOWS) {
    if (desiredWorkflowSet.has(workflow)) continue;
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    const skillDir = path.join(skillsDir, dirName);
    if (!view.exists(path.join(skillDir, 'SKILL.md')) || kept.has(dirName)) continue;
    // In a tool's own folder (MiniMax), only OpenSpec's own SKILL.md goes.
    if (!shared && classifyOwnSkill(skillDir, toolId, dirName, view) !== 'ours') continue;
    return true;
  }

  if (shouldReconcileCommandFilesForTool(toolId) && adapter) {
    // Only generated output is drift. Files cleanup keeps (edits, older
    // versions, unreadable entries) stay on disk by design; counting them would
    // re-sync on every update.
    if (classifyCommandFiles(projectPath, toolId, knownDesiredWorkflows, view).generated.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Returns configured tools that currently need a profile/delivery sync.
 */
export function getToolsNeedingProfileSync(
  projectPath: string,
  desiredWorkflows: readonly string[],
  delivery: Delivery,
  configuredTools?: readonly string[],
  view: FileView = DISK_VIEW
): string[] {
  const tools = configuredTools
    ? [...new Set(configuredTools)]
    : getConfiguredToolsForProfileSync(projectPath, view);
  return tools.filter((toolId) =>
    hasToolProfileOrDeliveryDrift(projectPath, toolId, desiredWorkflows, delivery, view)
  );
}

function getInstalledWorkflowsForTool(projectPath: string, toolId: string): WorkflowId[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool || !toolSupportsSkills(tool)) return [];

  const installed = new Set<WorkflowId>();
  const skillsDir = resolveToolSkillsDir(projectPath, tool);
  // A skill kept as the user's is not OpenSpec's to sync.
  const shared = usesSharedSkills(tool);
  const kept = shared ? readKeptSharedSkills(projectPath) : new Set<string>();

  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (kept.has(dirName)) continue;
    const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
    if (!shared && fs.existsSync(skillFile) && classifyOwnSkill(path.dirname(skillFile), toolId, dirName, DISK_VIEW) !== 'ours') {
      continue;
    }
    if (fs.existsSync(skillFile)) {
      installed.add(workflow);
    }
  }

  return [...installed];
}

/**
 * Detects whether the current project has any profile/delivery drift.
 */
export function hasProjectConfigDrift(
  projectPath: string,
  desiredWorkflows: readonly string[],
  delivery: Delivery
): boolean {
  const configuredTools = getConfiguredToolsForProfileSync(projectPath);
  if (getToolsNeedingProfileSync(projectPath, desiredWorkflows, delivery, configuredTools).length > 0) {
    return true;
  }

  const desiredSet = new Set(toKnownWorkflows(desiredWorkflows));

  for (const toolId of configuredTools) {
    const installed = getInstalledWorkflowsForTool(projectPath, toolId);
    if (installed.some((workflow) => !desiredSet.has(workflow))) {
      return true;
    }
  }

  return false;
}
