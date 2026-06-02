/**
 * Tool Detection Utilities
 *
 * Shared utilities for detecting tool configurations and version status.
 */

import * as fs from 'fs';
import { FileSystemUtils } from '../../utils/file-system.js';
import { AI_TOOLS, type AIToolOption } from '../config.js';

/**
 * Names of skill directories created by openspec init.
 */
export const SKILL_NAMES = [
  'openspec-explore',
  'openspec-new-change',
  'openspec-continue-change',
  'openspec-apply-change',
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
  'ff',
  'sync',
  'archive',
  'bulk-archive',
  'verify',
  'onboard',
  'propose',
] as const;

export type CommandId = (typeof COMMAND_IDS)[number];

type SkillPathTool = Pick<AIToolOption, 'skillsDir' | 'legacySkillsDirs'>;

/**
 * Names of OpenSpec-managed skill directories.
 */
export function getOpenSpecManagedSkillDirNames(): string[] {
  return [...SKILL_NAMES];
}

export function getToolCurrentSkillDirectory(
  projectRoot: string,
  tool: SkillPathTool
): string | null {
  if (!tool.skillsDir) return null;
  return FileSystemUtils.joinPath(projectRoot, tool.skillsDir, 'skills');
}

export function getToolLegacySkillDirectories(
  projectRoot: string,
  tool: SkillPathTool
): string[] {
  return (tool.legacySkillsDirs ?? []).map((legacySkillsDir) =>
    FileSystemUtils.joinPath(projectRoot, legacySkillsDir, 'skills')
  );
}

export function getToolSkillDirectories(
  projectRoot: string,
  tool: SkillPathTool,
  options: { includeLegacy?: boolean } = {}
): string[] {
  const currentSkillDirectory = getToolCurrentSkillDirectory(projectRoot, tool);
  const directories = currentSkillDirectory ? [currentSkillDirectory] : [];

  if (options.includeLegacy !== false) {
    directories.push(...getToolLegacySkillDirectories(projectRoot, tool));
  }

  return directories;
}

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

  const skillDirectories = getToolSkillDirectories(projectRoot, tool);
  let skillCount = 0;

  for (const skillName of SKILL_NAMES) {
    const isConfigured = skillDirectories.some((skillsDir) =>
      fs.existsSync(FileSystemUtils.joinPath(skillsDir, skillName, 'SKILL.md'))
    );
    if (isConfigured) {
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
 * Gets version status for a tool by reading the first available skill file.
 */
export function getToolVersionStatus(
  projectRoot: string,
  toolId: string,
  currentVersion: string
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

  const skillDirectories = getToolSkillDirectories(projectRoot, tool);
  let generatedByVersion: string | null = null;
  let foundSkillFile = false;

  // Find the first skill file that exists and read its version
  for (const skillsDir of skillDirectories) {
    for (const skillName of SKILL_NAMES) {
      const skillFile = FileSystemUtils.joinPath(skillsDir, skillName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        generatedByVersion = extractGeneratedByVersion(skillFile);
        foundSkillFile = true;
        break;
      }
    }

    if (foundSkillFile) {
      break;
    }
  }

  const configured = getToolSkillStatus(projectRoot, toolId).configured;
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
 * Gets all configured tools in the project.
 */
export function getConfiguredTools(projectRoot: string): string[] {
  return AI_TOOLS
    .filter((t) => t.skillsDir && getToolSkillStatus(projectRoot, t.value).configured)
    .map((t) => t.value);
}

/**
 * Gets version status for all configured tools.
 */
export function getAllToolVersionStatus(
  projectRoot: string,
  currentVersion: string
): ToolVersionStatus[] {
  const configuredTools = getConfiguredTools(projectRoot);
  return configuredTools.map((toolId) =>
    getToolVersionStatus(projectRoot, toolId, currentVersion)
  );
}
