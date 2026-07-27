/**
 * Tool Detection Utilities
 *
 * Shared utilities for detecting tool configurations and version status.
 */

import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS } from '../config.js';
import { CommandAdapterRegistry, generateCommands } from '../command-generation/index.js';
import { getCommandContents } from './skill-generation.js';
import { getGlobalConfig, type Delivery } from '../global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS } from '../profiles.js';

/**
 * Names of skill directories created by openspec init.
 */
export const SKILL_NAMES = [
  'openspec-explore',
  'openspec-new-change',
  'openspec-continue-change',
  'openspec-apply-change',
  'openspec-update-change',
  'openspec-ff-change',
  'openspec-sync-specs',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-verify-change',
  'openspec-onboard',
  'openspec-propose',
] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

/**
 * IDs of command templates created by openspec init.
 */
export const COMMAND_IDS = [
  'explore',
  'new',
  'continue',
  'apply',
  'update',
  'ff',
  'sync',
  'archive',
  'bulk-archive',
  'verify',
  'onboard',
  'propose',
] as const;

export type CommandId = (typeof COMMAND_IDS)[number];

/**
 * Status of skill configuration for a tool.
 */
export interface ToolSkillStatus {
  /** Whether the tool has any skills configured */
  configured: boolean;
  /** Whether all skills are configured */
  fullyConfigured: boolean;
  /** Number of skills currently configured */
  skillCount: number;
}

/**
 * Version information for a tool's skills.
 */
export interface ToolVersionStatus {
  /** The tool ID */
  toolId: string;
  /** The tool's display name */
  toolName: string;
  /** Whether the tool has any skills configured */
  configured: boolean;
  /** The generatedBy version found in the skill files, or null if not found */
  generatedByVersion: string | null;
  /** Whether the tool needs updating (version mismatch or missing) */
  needsUpdate: boolean;
}

/**
 * Gets the list of tools with skillsDir configured.
 */
export function getToolsWithSkillsDir(): string[] {
  return AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);
}

/**
 * Checks which skill files exist for a tool.
 */
export function getToolSkillStatus(projectRoot: string, toolId: string): ToolSkillStatus {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) {
    return { configured: false, fullyConfigured: false, skillCount: 0 };
  }

  const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');
  let skillCount = 0;

  for (const skillName of SKILL_NAMES) {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      skillCount++;
    }
  }

  return {
    configured: skillCount > 0,
    fullyConfigured: skillCount === SKILL_NAMES.length,
    skillCount,
  };
}

/**
 * Checks whether a tool has at least one generated OpenSpec command file.
 */
export function toolHasAnyConfiguredCommand(projectPath: string, toolId: string): boolean {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return false;

  for (const commandId of COMMAND_IDS) {
    const cmdPath = adapter.getFilePath(commandId);
    const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);
    if (fs.existsSync(fullPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether command files for a tool on disk match current generated command contents.
 */
export function areCommandFilesUpToDate(
  projectRoot: string,
  toolId: string,
  options?: {
    workflows?: readonly string[];
    delivery?: Delivery;
  }
): boolean {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return false;

  let workflows: readonly string[];
  if (options?.workflows) {
    workflows = options.workflows;
  } else {
    try {
      const globalCfg = getGlobalConfig();
      const profile = globalCfg.profile ?? 'core';
      workflows = getProfileWorkflows(profile, globalCfg.workflows);
    } catch {
      workflows = ALL_WORKFLOWS;
    }
  }

  const knownWorkflows = workflows.filter((w): w is (typeof ALL_WORKFLOWS)[number] =>
    (ALL_WORKFLOWS as readonly string[]).includes(w)
  );

  const commandContents = getCommandContents(knownWorkflows);
  const generatedCommands = generateCommands(commandContents, adapter);

  if (generatedCommands.length === 0) {
    return false;
  }

  for (const cmd of generatedCommands) {
    const cmdPath = path.isAbsolute(cmd.path) ? cmd.path : path.join(projectRoot, cmd.path);
    if (!fs.existsSync(cmdPath)) {
      return false;
    }
    try {
      const existingContent = fs.readFileSync(cmdPath, 'utf-8');
      if (existingContent !== cmd.fileContent) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // Also check no extra command files exist for deselected workflows
  const desiredWorkflowSet = new Set(knownWorkflows);
  for (const workflow of ALL_WORKFLOWS) {
    if (desiredWorkflowSet.has(workflow)) continue;
    const cmdPath = adapter.getFilePath(workflow);
    const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectRoot, cmdPath);
    if (fs.existsSync(fullPath)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets the skill status for all tools with skillsDir configured.
 */
export function getToolStates(projectRoot: string): Map<string, ToolSkillStatus> {
  const states = new Map<string, ToolSkillStatus>();
  const toolIds = AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);

  for (const toolId of toolIds) {
    states.set(toolId, getToolSkillStatus(projectRoot, toolId));
  }

  return states;
}

/**
 * Extracts the generatedBy version from a skill file's YAML frontmatter.
 * Returns null if the field is not found or the file doesn't exist.
 */
export function extractGeneratedByVersion(skillFilePath: string): string | null {
  try {
    if (!fs.existsSync(skillFilePath)) {
      return null;
    }

    const content = fs.readFileSync(skillFilePath, 'utf-8');

    // Look for generatedBy in the YAML frontmatter
    // The file format is:
    // ---
    // ...
    // metadata:
    //   author: openspec
    //   version: "1.0"
    //   generatedBy: "0.23.0"
    // ---
    const generatedByMatch = content.match(/^\s*generatedBy:\s*["']?([^"'\n]+)["']?\s*$/m);

    if (generatedByMatch && generatedByMatch[1]) {
      return generatedByMatch[1].trim();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Gets version status for a tool by reading available skill or command files or checking content fingerprint.
 */
export function getToolVersionStatus(
  projectRoot: string,
  toolId: string,
  currentVersion: string,
  options?: {
    workflows?: readonly string[];
    delivery?: Delivery;
  }
): ToolVersionStatus {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) {
    return {
      toolId,
      toolName: toolId,
      configured: false,
      generatedByVersion: null,
      needsUpdate: false,
    };
  }

  const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');
  let generatedByVersion: string | null = null;

  // 1. Find the first skill file that exists and read its version
  for (const skillName of SKILL_NAMES) {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      generatedByVersion = extractGeneratedByVersion(skillFile);
      break;
    }
  }

  const skillConfigured = getToolSkillStatus(projectRoot, toolId).configured;
  const commandConfigured = toolHasAnyConfiguredCommand(projectRoot, toolId);
  const configured = skillConfigured || commandConfigured;

  // 2. If version is not found in skills, check command files
  if (generatedByVersion === null && commandConfigured) {
    const adapter = CommandAdapterRegistry.get(toolId);
    if (adapter) {
      for (const commandId of COMMAND_IDS) {
        const cmdPath = adapter.getFilePath(commandId);
        const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectRoot, cmdPath);
        if (fs.existsSync(fullPath)) {
          const version = extractGeneratedByVersion(fullPath);
          if (version !== null) {
            generatedByVersion = version;
            break;
          }
        }
      }

      if (generatedByVersion === null) {
        if (areCommandFilesUpToDate(projectRoot, toolId, options)) {
          generatedByVersion = currentVersion;
        }
      }
    }
  }

  const needsUpdate = configured && (generatedByVersion === null || generatedByVersion !== currentVersion);

  return {
    toolId,
    toolName: tool.name,
    configured,
    generatedByVersion,
    needsUpdate,
  };
}

/**
 * Gets all configured tools in the project (configured via skills or commands).
 */
export function getConfiguredTools(projectRoot: string): string[] {
  return AI_TOOLS
    .filter((t) => {
      if (!t.skillsDir) return false;
      return getToolSkillStatus(projectRoot, t.value).configured || toolHasAnyConfiguredCommand(projectRoot, t.value);
    })
    .map((t) => t.value);
}

/**
 * Gets version status for all configured tools.
 */
export function getAllToolVersionStatus(
  projectRoot: string,
  currentVersion: string,
  options?: {
    workflows?: readonly string[];
    delivery?: Delivery;
  }
): ToolVersionStatus[] {
  const configuredTools = getConfiguredTools(projectRoot);
  return configuredTools.map((toolId) =>
    getToolVersionStatus(projectRoot, toolId, currentVersion, options)
  );
}

