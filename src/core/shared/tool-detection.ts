/**
 * Tool Detection Utilities
 *
 * Shared utilities for detecting tool configurations and version status.
 */

import path from 'path';
import os from 'os';
import * as fs from 'fs';
import { AI_TOOLS, type AIToolOption } from '../config.js';

/**
 * Resolve the skills directory for a tool.
 *
 * Most tools install skills into a project-local directory
 * (``<projectRoot>/<skillsDir>/skills``).  Tools with ``installDir`` set
 * (e.g. Hermes Agent → ``~/.hermes/skills``) store skills in a user-global
 * directory; this function expands ``~`` and returns the absolute path.
 */
export function resolveSkillsDir(tool: AIToolOption, projectRoot: string): string {
  if (tool.installDir) {
    return path.resolve(tool.installDir.replace(/^~/, os.homedir()));
  }
  return path.join(projectRoot, tool.skillsDir!, 'skills');
}

/**
 * Resolve the project-local marker directory for a tool.
 *
 * For global-install tools this is an empty directory used solely for
 * auto-detection and update-bookkeeping.  For project-local tools it is
 * the same as the skills directory.
 */
export function resolveMarkerDir(tool: AIToolOption, projectRoot: string): string {
  return path.join(projectRoot, tool.skillsDir!, 'skills');
}


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
 *
 * For project-local tools (no installDir), skill files are checked in
 * ``<projectRoot>/<skillsDir>/skills/``.  For global-install tools
 * (installDir set, e.g. Hermes), "configured" is determined by the
 * project-local marker directory existence — the global skills directory
 * may contain skills from other projects, so its presence does not mean
 * this project has the tool configured.
 */
export function getToolSkillStatus(projectRoot: string, toolId: string): ToolSkillStatus {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) {
    return { configured: false, fullyConfigured: false, skillCount: 0 };
  }

  if (tool.installDir) {
    // Global-install tool: "configured" = marker directory exists.
    // skillCount/fullyConfigured reflect the global skills directory.
    const markerDir = resolveMarkerDir(tool, projectRoot);
    const configured = fs.existsSync(markerDir);
    if (!configured) {
      return { configured: false, fullyConfigured: false, skillCount: 0 };
    }
    const skillsDir = resolveSkillsDir(tool, projectRoot);
    let skillCount = 0;
    for (const skillName of SKILL_NAMES) {
      const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        skillCount++;
      }
    }
    return {
      configured: true,
      fullyConfigured: skillCount === SKILL_NAMES.length,
      skillCount,
    };
  }

  const skillsDir = resolveSkillsDir(tool, projectRoot);
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

  const skillsDir = resolveSkillsDir(tool, projectRoot);
  let generatedByVersion: string | null = null;

  // Find the first skill file that exists and read its version
  for (const skillName of SKILL_NAMES) {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      generatedByVersion = extractGeneratedByVersion(skillFile);
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
