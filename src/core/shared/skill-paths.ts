import os from 'node:os';
import path from 'node:path';

import { AI_TOOLS, OWN_SKILLS_FOLDER_TOOL_IDS, SKILL_LINKED_TOOL_IDS, type AIToolOption } from '../config.js';

export type SkillCapableTool = AIToolOption & (
  | { skillsDir: string }
  | { globalSkillsDir: string }
);

export function toolSupportsSkills(tool: AIToolOption): tool is SkillCapableTool {
  return Boolean(tool.skillsDir || tool.globalSkillsDir);
}

export function getSkillCapableTools(): SkillCapableTool[] {
  return AI_TOOLS.filter(toolSupportsSkills);
}

export function hasGlobalSkillTarget(tool: AIToolOption): boolean {
  return Boolean(tool.globalSkillsDir);
}

export function resolveToolSkillsDir(
  projectRoot: string,
  tool: SkillCapableTool,
  options: { homeDir?: string } = {}
): string {
  if (tool.globalSkillsDir) {
    const homeDir = options.homeDir ?? process.env.USERPROFILE ?? process.env.HOME ?? os.homedir();
    return path.join(homeDir, tool.globalSkillsDir, 'skills');
  }

  // Every tool's project skills share one folder; only tools that keep their
  // own (see usesSharedSkills) are written under their own `skillsDir`.
  if (usesSharedSkills(tool)) {
    return resolveSharedSkillsDir(projectRoot);
  }

  if (tool.skillsDir) {
    return path.join(projectRoot, tool.skillsDir, 'skills');
  }

  throw new Error(`Tool '${tool.value}' does not support skill generation.`);
}

/** The one folder every tool's project skills are written to. */
export const SHARED_SKILLS_ROOT = '.agents';

/** Whether a tool's project skills live in the shared `.agents/skills/`. */
export function usesSharedSkills(tool: AIToolOption): boolean {
  return Boolean(tool.skillsDir) && !tool.globalSkillsDir && !OWN_SKILLS_FOLDER_TOOL_IDS.has(tool.value);
}

/** Absolute path of the shared skills folder. */
export function resolveSharedSkillsDir(projectRoot: string): string {
  return path.join(projectRoot, SHARED_SKILLS_ROOT, 'skills');
}

/**
 * The tool's own `skills/` folder when OpenSpec links skills into it, or
 * undefined when the tool reads the shared folder itself.
 */
export function resolveSkillLinkDir(projectRoot: string, tool: AIToolOption): string | undefined {
  if (!usesSharedSkills(tool) || !SKILL_LINKED_TOOL_IDS.has(tool.value)) return undefined;
  if (tool.skillsDir === SHARED_SKILLS_ROOT) return undefined;
  return path.join(projectRoot, tool.skillsDir!, 'skills');
}

/**
 * Where earlier releases wrote this tool's skills when that was not the shared
 * folder: its own `<skillsDir>/skills/`. Undefined for tools already there.
 */
export function resolveFormerOwnSkillsDir(projectRoot: string, tool: AIToolOption): string | undefined {
  if (!usesSharedSkills(tool) || tool.skillsDir === SHARED_SKILLS_ROOT) return undefined;
  return path.join(projectRoot, tool.skillsDir!, 'skills');
}
