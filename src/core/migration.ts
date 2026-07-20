/**
 * Migration Utilities
 *
 * One-time migration logic for existing projects when profile system is introduced.
 * Called by both init and update commands before profile resolution.
 */

import { AI_TOOLS, type AIToolOption } from './config.js';
import { getGlobalConfig, getGlobalConfigPath, saveGlobalConfig, type Delivery } from './global-config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { WORKFLOW_TO_SKILL_DIR } from './profile-sync-drift.js';
import { ALL_WORKFLOWS } from './profiles.js';
import path from 'path';
import * as fs from 'fs';

/**
 * Former skillsDir locations for tools whose directory was renamed.
 * OpenSpec-managed skill directories left in these locations are migrated
 * to the tool's current skillsDir; user files are never touched.
 */
export const LEGACY_SKILLS_DIRS: Record<string, string[]> = {
  // Kimi CLI became Kimi Code and moved from .kimi to .kimi-code
  kimi: ['.kimi'],
};

export interface LegacySkillsMigration {
  toolId: string;
  /** Legacy tool root, e.g. '.kimi' */
  from: string;
  /** Current tool root, e.g. '.kimi-code' */
  to: string;
  /** Number of skill directories moved or removed */
  movedSkillDirs: number;
}

/**
 * Moves OpenSpec-managed skill directories (openspec-*) from a tool's legacy
 * skillsDir to its current one. When the destination already exists the legacy
 * copy is removed instead. Legacy directories are deleted only when left empty,
 * so user files under the old location are preserved.
 */
export function migrateLegacySkillDirs(projectPath: string): LegacySkillsMigration[] {
  const migrations: LegacySkillsMigration[] = [];

  for (const tool of AI_TOOLS) {
    if (!tool.skillsDir) continue;

    for (const legacyRoot of LEGACY_SKILLS_DIRS[tool.value] ?? []) {
      if (legacyRoot === tool.skillsDir) continue;
      const legacySkillsDir = path.join(projectPath, legacyRoot, 'skills');
      if (!fs.existsSync(legacySkillsDir)) continue;
      const currentSkillsDir = path.join(projectPath, tool.skillsDir, 'skills');
      let movedSkillDirs = 0;

      for (const workflowId of ALL_WORKFLOWS) {
        const dirName = WORKFLOW_TO_SKILL_DIR[workflowId];
        const source = path.join(legacySkillsDir, dirName);
        if (!fs.existsSync(path.join(source, 'SKILL.md'))) continue;

        try {
          const destination = path.join(currentSkillsDir, dirName);
          if (fs.existsSync(destination)) {
            fs.rmSync(source, { recursive: true, force: true });
          } else {
            fs.mkdirSync(currentSkillsDir, { recursive: true });
            fs.renameSync(source, destination);
          }
          movedSkillDirs++;
        } catch {
          // Leave the legacy directory in place if it cannot be moved
        }
      }

      removeDirIfEmpty(legacySkillsDir);
      removeDirIfEmpty(path.join(projectPath, legacyRoot));

      if (movedSkillDirs > 0) {
        migrations.push({ toolId: tool.value, from: legacyRoot, to: tool.skillsDir, movedSkillDirs });
      }
    }
  }

  return migrations;
}

function removeDirIfEmpty(dirPath: string): void {
  try {
    if (fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch {
    // Missing or non-empty directory — nothing to do
  }
}

interface InstalledWorkflowArtifacts {
  workflows: string[];
  hasSkills: boolean;
  hasCommands: boolean;
}

function scanInstalledWorkflowArtifacts(
  projectPath: string,
  tools: AIToolOption[]
): InstalledWorkflowArtifacts {
  const installed = new Set<string>();
  let hasSkills = false;
  let hasCommands = false;

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

    for (const workflowId of ALL_WORKFLOWS) {
      const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId];
      const skillFile = path.join(skillsDir, skillDirName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        installed.add(workflowId);
        hasSkills = true;
      }
    }

    const adapter = CommandAdapterRegistry.get(tool.value);
    if (!adapter) continue;

    for (const workflowId of ALL_WORKFLOWS) {
      const commandPath = adapter.getFilePath(workflowId);
      const fullPath = path.isAbsolute(commandPath)
        ? commandPath
        : path.join(projectPath, commandPath);
      if (fs.existsSync(fullPath)) {
        installed.add(workflowId);
        hasCommands = true;
      }
    }
  }

  return {
    workflows: ALL_WORKFLOWS.filter((workflowId) => installed.has(workflowId)),
    hasSkills,
    hasCommands,
  };
}

/**
 * Scans installed workflow files across all detected tools and returns
 * the union of installed workflow IDs.
 */
export function scanInstalledWorkflows(projectPath: string, tools: AIToolOption[]): string[] {
  return scanInstalledWorkflowArtifacts(projectPath, tools).workflows;
}

function inferDelivery(artifacts: InstalledWorkflowArtifacts): Delivery {
  if (artifacts.hasSkills && artifacts.hasCommands) {
    return 'both';
  }
  if (artifacts.hasCommands) {
    return 'commands';
  }
  return 'skills';
}

/**
 * Performs one-time migration if the global config does not yet have a profile field.
 * Called by both init and update before profile resolution.
 *
 * - If no profile field exists and workflows are installed: sets profile to 'custom'
 *   with the detected workflows, preserving the user's existing setup.
 * - If no profile field exists and no workflows are installed: no-op (defaults apply).
 * - If profile field already exists: no-op.
 */
export function migrateIfNeeded(projectPath: string, tools: AIToolOption[]): void {
  const config = getGlobalConfig();

  // Check raw config file for profile field presence
  const configPath = getGlobalConfigPath();

  let rawConfig: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    return; // Can't read config, skip migration
  }

  // If profile is already explicitly set, no migration needed
  if (rawConfig.profile !== undefined) {
    return;
  }

  // Scan for installed workflows
  const artifacts = scanInstalledWorkflowArtifacts(projectPath, tools);
  const installedWorkflows = artifacts.workflows;

  if (installedWorkflows.length === 0) {
    // No workflows installed, new user — defaults will apply
    return;
  }

  // Migrate: set profile to custom with detected workflows
  config.profile = 'custom';
  config.workflows = installedWorkflows;
  if (rawConfig.delivery === undefined) {
    config.delivery = inferDelivery(artifacts);
  }
  saveGlobalConfig(config);

  console.log(`Migrated: custom profile with ${installedWorkflows.length} workflows`);
  console.log("New in this version: /opsx:propose. Try 'openspec config profile core' for the streamlined experience.");
}
