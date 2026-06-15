import os from 'node:os';

import { FileSystemUtils } from '../../utils/file-system.js';
import { AI_TOOLS, type AIToolOption } from '../config.js';

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

export function getSkillCapableToolIds(): string[] {
  return getSkillCapableTools().map((tool) => tool.value);
}

export function hasGlobalSkillTarget(tool: AIToolOption): boolean {
  return Boolean(tool.globalSkillsDir);
}

function getUserHomeDir(): string {
  return process.env.USERPROFILE || process.env.HOME || os.homedir();
}

export function resolveToolSkillsDir(
  projectRoot: string,
  tool: SkillCapableTool,
  options: { homeDir?: string } = {}
): string {
  if (tool.globalSkillsDir) {
    return FileSystemUtils.joinPath(options.homeDir ?? getUserHomeDir(), tool.globalSkillsDir, 'skills');
  }

  if (tool.skillsDir) {
    return FileSystemUtils.joinPath(projectRoot, tool.skillsDir, 'skills');
  }

  throw new Error(`Tool '${tool.value}' does not support skill generation.`);
}
