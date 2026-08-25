/**
 * 可用工具检测
 *
 * 通过扫描 AI 工具的配置目录来检测项目中可用的工具。
 */

import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS, type AIToolOption } from './config.js';
import { reconcileSharedSkillTargets } from './shared-skill-target.js';
import { SKILL_NAMES } from './shared/tool-detection.js';
import { resolveToolSkillsDir, toolSupportsSkills } from './shared/skill-paths.js';

/**
 * 扫描项目路径中的 AI 工具配置目录并返回
 * 存在的工具。
 *
 * 对于具有 `detectionPaths` 的工具，检查那些特定的路径（文件或
 * 目录）。否则检查项目的 `skillsDir`，或用户主目录中
 * 用于全局 skill 目标的受管 skill 文件。
 */
export function getAvailableTools(projectPath: string): AIToolOption[] {
  const available = AI_TOOLS.filter((tool) => {
    if (!toolSupportsSkills(tool)) return false;

    if (tool.globalSkillsDir) {
      const skillsDir = resolveToolSkillsDir(projectPath, tool);
      return SKILL_NAMES.some((skillName) =>
        fs.existsSync(path.join(skillsDir, skillName, 'SKILL.md'))
      );
    }

    if (!tool.skillsDir) return false;

    if (tool.detectionPaths && tool.detectionPaths.length > 0) {
      // statSync 不使用 .isDirectory() — 检测路径可以是文件或目录
      return tool.detectionPaths.some((p) => {
        try {
          fs.statSync(path.join(projectPath, p));
          return true;
        } catch {
          return false;
        }
      });
    }

    const dirPath = path.join(projectPath, tool.skillsDir);
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  });
  const activeProjectTools = new Set(
    reconcileSharedSkillTargets(
      projectPath,
      available.filter((tool) => tool.skillsDir)
    ).map((tool) => tool.value)
  );
  return available.filter(
    (tool) => tool.globalSkillsDir || activeProjectTools.has(tool.value)
  );
}
