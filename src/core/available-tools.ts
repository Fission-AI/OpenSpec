/**
 * Available Tools Detection
 *
 * Detects which AI tools are available in a project by scanning
 * for their configuration directories.
 */

import path from 'path';
import { AI_TOOLS, type AIToolOption } from './config.js';
import { readSkillToolList } from './shared-skill-target.js';
import { SKILL_NAMES } from './shared/tool-detection.js';
import { SHARED_SKILLS_ROOT, resolveToolSkillsDir, toolSupportsSkills, usesSharedSkills } from './shared/skill-paths.js';
import { DISK_VIEW, type FileView } from './file-view.js';

/**
 * Scans the project path for AI tool configuration directories and returns
 * the tools that are present.
 *
 * For tools with `detectionPaths`, checks those specific paths (files or
 * directories). Otherwise checks the project's `skillsDir`, or managed skill
 * files in the user's home directory for a global skill target.
 *
 * Every tool's skills live in `.agents/skills/`, so nothing under `.agents`
 * is evidence of a tool whose own folder is `.agents` (Amp, Codex, Zed, GSD,
 * the `agents` target): those count only when listed as set up, or when a path
 * of their own exists (`.amp`, `.codex/skills`, `.agents/workflows`).
 */
export function getAvailableTools(projectPath: string, view: FileView = DISK_VIEW): AIToolOption[] {
  const isSharedPath = (p: string) => p === SHARED_SKILLS_ROOT || p.startsWith(`${SHARED_SKILLS_ROOT}/skills`);
  const listed = readSkillToolList(projectPath, view);
  return AI_TOOLS.filter((tool) => {
    if (!toolSupportsSkills(tool)) return false;

    if (tool.globalSkillsDir) {
      const skillsDir = resolveToolSkillsDir(projectPath, tool);
      return SKILL_NAMES.some((skillName) =>
        view.exists(path.join(skillsDir, skillName, 'SKILL.md'))
      );
    }

    if (!tool.skillsDir) return false;

    const hasOwnPath = tool.detectionPaths && tool.detectionPaths.length > 0
      // Presence, not type — detection paths can be files or directories
      ? tool.detectionPaths
        .filter((p) => tool.skillsDir !== SHARED_SKILLS_ROOT || !isSharedPath(p))
        .some((p) => {
          if (!view.exists(path.join(projectPath, p))) return false;
          // When the project lists its tools and leaves this one out, a
          // skills folder of its own counts only with an OpenSpec skill in
          // it: the user's own skills there say nothing about OpenSpec.
          if (p.endsWith('/skills') && listed.length > 0 && !listed.includes(tool.value)) {
            return SKILL_NAMES.some((skillName) => view.exists(path.join(projectPath, p, skillName, 'SKILL.md')));
          }
          return true;
        })
      : tool.skillsDir !== SHARED_SKILLS_ROOT && view.isDirectory(path.join(projectPath, tool.skillsDir));
    // A tool listed as set up is present even with no folder of its own
    // (a skills-only Cursor reads `.agents/skills` and has no `.cursor`).
    return hasOwnPath || (usesSharedSkills(tool) && listed.includes(tool.value));
  });
}
