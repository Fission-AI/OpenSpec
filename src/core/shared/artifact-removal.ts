/**
 * Artifact Removal Helpers
 *
 * Shared functions for removing skill directories and command files.
 * Used by both init and update commands when delivery mode changes or
 * workflows are deselected.
 */

import path from 'path';
import * as fs from 'fs';
import { ALL_WORKFLOWS } from '../profiles.js';
import { WORKFLOW_TO_SKILL_DIR } from '../profile-sync-drift.js';
import { CommandAdapterRegistry } from '../command-generation/index.js';

// ---------------------------------------------------------------------------
// Skill directory removal
// ---------------------------------------------------------------------------

/**
 * Removes ALL workflow skill directories under the given skillsDir.
 * Used when delivery changes to commands-only.
 */
export async function removeAllSkillDirs(skillsDir: string): Promise<number> {
  let removed = 0;

  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (!dirName) continue;

    const skillDir = path.join(skillsDir, dirName);
    try {
      if (fs.existsSync(skillDir)) {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }

  return removed;
}

/**
 * Removes skill directories for workflows that are NOT in the desired set.
 * Used during profile-sync to clean up deselected workflows.
 */
export async function removeUnselectedSkillDirs(
  skillsDir: string,
  desiredWorkflows: readonly string[],
): Promise<number> {
  const desiredSet = new Set(desiredWorkflows);
  let removed = 0;

  for (const workflow of ALL_WORKFLOWS) {
    if (desiredSet.has(workflow)) continue;
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (!dirName) continue;

    const skillDir = path.join(skillsDir, dirName);
    try {
      if (fs.existsSync(skillDir)) {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }

  return removed;
}

// ---------------------------------------------------------------------------
// Command file removal
// ---------------------------------------------------------------------------

/**
 * Removes ALL workflow command files for a given tool.
 * Used when delivery changes to skills-only.
 */
export async function removeAllCommandFiles(
  projectPath: string,
  toolId: string,
): Promise<number> {
  let removed = 0;
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return 0;

  for (const workflow of ALL_WORKFLOWS) {
    const cmdPath = adapter.getFilePath(workflow);
    const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);

    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }

  return removed;
}

/**
 * Removes command files for workflows that are NOT in the desired set.
 * Used during profile-sync to clean up deselected workflows.
 */
export async function removeUnselectedCommandFiles(
  projectPath: string,
  toolId: string,
  desiredWorkflows: readonly string[],
): Promise<number> {
  let removed = 0;
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return 0;

  const desiredSet = new Set(desiredWorkflows);

  for (const workflow of ALL_WORKFLOWS) {
    if (desiredSet.has(workflow)) continue;
    const cmdPath = adapter.getFilePath(workflow);
    const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);

    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        removed++;
      }
    } catch {
      // Ignore errors
    }
  }

  return removed;
}
