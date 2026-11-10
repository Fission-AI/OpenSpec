/**
 * Tool Detection Utilities
 *
 * Shared utilities for detecting tool configurations and version status.
 */

import path from 'path';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES } from '../config.js';
import { CommandAdapterRegistry } from '../command-generation/index.js';
import { hasLegacySkills, isToolListed, readKeptSharedSkills, readListedToolsWithOwnFiles } from '../shared-skill-target.js';
import {
  resolveCommandSurfaceCapability,
} from '../command-surface.js';
import {
  getSkillCapableTools,
  resolveFormerOwnSkillsDir,
  resolveSharedSkillsDir,
  resolveSkillLinkDir,
  resolveToolSkillsDir,
  toolSupportsSkills,
  usesSharedSkills,
  type SkillCapableTool,
} from './skill-paths.js';
import { DISK_VIEW, type FileView } from '../file-view.js';
import { FileSystemUtils } from '../../utils/file-system.js';

/**
 * Names of skill directories created by openspec init.
 */
export const SKILL_NAMES = OPENSPEC_SKILL_NAMES;

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
  /** Whether the tool has any skills or commands configured */
  configured: boolean;
  /**
   * The generatedBy version recorded in the tool's skill files. For a tool that
   * has commands but no skills, the current version when the command files match
   * what would be generated now. Null when neither says the files are current.
   */
  generatedByVersion: string | null;
  /** Whether the tool needs updating (version mismatch or missing) */
  needsUpdate: boolean;
}

/**
 * Gets the list of tools with skillsDir configured.
 */
export function getToolsWithSkillsDir(): string[] {
  return getSkillCapableTools().map((tool) => tool.value);
}

/**
 * Whether a tool listed in `.agents/skills/.openspec-target` is still set up.
 * A tool OpenSpec gave files of its own (commands, or links) is listed with
 * `own-files` and stays set up only while some remain: deleting its folder
 * removes it. A tool with none (a skills-only tool that reads the shared
 * folder) has only the list to record it.
 */
export function isListedToolPresent(projectRoot: string, toolId: string, view: FileView = DISK_VIEW): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool || !usesSharedSkills(tool) || !isToolListed(projectRoot, toolId, view)) return false;
  if (!readListedToolsWithOwnFiles(projectRoot, view).has(toolId)) return true;
  if (toolHasAnyConfiguredCommand(projectRoot, toolId, view)) return true;
  const linkDir = resolveSkillLinkDir(projectRoot, tool);
  return linkDir !== undefined && OPENSPEC_SKILL_NAMES.some((name) => view.exists(path.join(linkDir, name, 'SKILL.md')));
}

/**
 * Where a tool's OpenSpec skills can be found, most current first. A tool that
 * shares `.agents/skills` owns what is there only when it is listed as set up;
 * its own folder holds a pre-2.0 copy or, for a linked tool, its links; then
 * any former root.
 */
function skillDirsForTool(projectRoot: string, tool: SkillCapableTool, view: FileView): string[] {
  const legacy = (tool.legacySkillsDirs ?? []).map((root) => path.join(projectRoot, root, 'skills'));
  if (!usesSharedSkills(tool)) return [resolveToolSkillsDir(projectRoot, tool), ...legacy];
  const own = resolveFormerOwnSkillsDir(projectRoot, tool);
  return [
    ...(isListedToolPresent(projectRoot, tool.value, view) ? [resolveSharedSkillsDir(projectRoot)] : []),
    ...(own ? [own] : []),
    ...legacy,
  ];
}

/**
 * Checks which skill files exist for a tool.
 */
export function getToolSkillStatus(
  projectRoot: string,
  toolId: string,
  view: FileView = DISK_VIEW
): ToolSkillStatus {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool || !toolSupportsSkills(tool)) {
    return { configured: false, fullyConfigured: false, skillCount: 0 };
  }
  const skillsDirs = skillDirsForTool(projectRoot, tool, view);
  let skillCount = 0;

  for (const skillName of SKILL_NAMES) {
    if (skillsDirs.some((skillsDir) =>
      view.exists(path.join(skillsDir, skillName, 'SKILL.md'))
    )) {
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
export function toolHasAnyConfiguredCommand(
  projectPath: string,
  toolId: string,
  view: FileView = DISK_VIEW
): boolean {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return false;

  for (const commandId of COMMAND_IDS) {
    const cmdPath = adapter.getFilePath(commandId);
    const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);
    if (view.exists(fullPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes checkout artifacts that are not real content drift: a UTF-8 BOM and
 * CRLF line endings, which a Windows clone with `core.autocrlf` reintroduces on
 * every checkout of committed command files.
 */
export function normalizeCommandContent(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

/**
 * Gets the skill status for all tools with skillsDir configured.
 */
export function getToolStates(projectRoot: string): Map<string, ToolSkillStatus> {
  const states = new Map<string, ToolSkillStatus>();
  const tools = getSkillCapableTools();

  for (const tool of tools) {
    const skillStatus = getToolSkillStatus(projectRoot, tool.value);
    // A listed tool is set up even when its delivery writes no skills.
    states.set(
      tool.value,
      isListedToolPresent(projectRoot, tool.value) ? { ...skillStatus, configured: true } : skillStatus
    );
  }

  return states;
}

/**
 * Extracts the generatedBy version from a skill file's YAML frontmatter.
 * Returns null if the field is not found or the file doesn't exist.
 */
export function extractGeneratedByVersion(
  skillFilePath: string,
  view: FileView = DISK_VIEW
): string | null {
  try {
    if (!view.exists(skillFilePath)) {
      return null;
    }

    const content = view.read(skillFilePath);

    // Look for generatedBy in the YAML frontmatter
    // The file format is:
    // ---
    // ...
    // metadata:
    //   author: openspec
    //   version: "1.0"
    //   generatedBy: "0.23.0"
    // ---
    // Scanned per line, and with `[ \t]` rather than `\s`, so the leading
    // whitespace run can never cross a newline. A single `m`-anchored `\s*`
    // over the whole file re-scans it from every line start, which is
    // quadratic on a whitespace-heavy SKILL.md.
    for (const line of content.split(/\r\n?|\n/)) {
      const generatedByMatch = line.match(
        /^[ \t]*generatedBy:[ \t]*["']?([^"'\n]+)["']?[ \t]*$/
      );

      if (generatedByMatch && generatedByMatch[1]) {
        return generatedByMatch[1].trim();
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Gets version status for a tool by reading its skill files, falling back to a
 * command-content fingerprint for installs that have commands but no skills.
 */
export function getToolVersionStatus(
  projectRoot: string,
  toolId: string,
  currentVersion: string,
  options?: {
    workflows?: readonly string[];
    /** The tree to read; the disk unless an update is planning. */
    view?: FileView;
  }
): ToolVersionStatus {
  const view = options?.view ?? DISK_VIEW;
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool || !toolSupportsSkills(tool)) {
    return {
      toolId,
      toolName: toolId,
      configured: false,
      generatedByVersion: null,
      needsUpdate: false,
    };
  }

  const skillsDirs = skillDirsForTool(projectRoot, tool, view);
  let generatedByVersion: string | null = null;
  let foundSkill = false;

  // 1. Find the first skill file that exists and read its version.
  const keptShared = usesSharedSkills(tool) ? readKeptSharedSkills(projectRoot, view) : new Set<string>();
  // A skill the user keeps in the shared folder is theirs, not a version,
  // whether read there or through a tool's link to it.
  const speaksForVersion = (skillFile: string): boolean =>
    !keptShared.has(path.basename(path.dirname(skillFile)));
  for (const skillName of SKILL_NAMES) {
    for (const skillsDir of skillsDirs) {
      const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
      if (view.exists(skillFile) && speaksForVersion(skillFile)) {
        generatedByVersion = extractGeneratedByVersion(skillFile, view);
        foundSkill = true;
        break;
      }
    }
    if (foundSkill) break;
  }

  // Configured from any of its skills; current only from those found above.
  const commandConfigured = toolHasAnyConfiguredCommand(projectRoot, toolId, view);
  const markerConfigured = isListedToolPresent(projectRoot, toolId, view);
  const configured =
    getToolSkillStatus(projectRoot, toolId, view).configured || commandConfigured || markerConfigured;

  // 2. OpenSpec 2.0 installs skills only, so command files never make a tool
  //    current: a commands-only install from 1.x has no skills and always
  //    needs an update, which installs them and removes the generated commands.
  //    Leftover command files beside current skills are removal work found by
  //    profile drift, not a reason to rewrite the skills.
  const needsUpdate =
    configured && (generatedByVersion === null || generatedByVersion !== currentVersion);

  return {
    toolId,
    toolName: tool.name,
    configured,
    generatedByVersion,
    needsUpdate,
  };
}

/**
 * Whether a tool still has OpenSpec commands under a former root, such as a
 * commands-only Antigravity install in `.agent/workflows`. Like legacy skills,
 * they mark the tool as configured, so update can generate the current files
 * and retire the old ones instead of reporting no tools at all.
 */
function hasLegacyCommands(projectRoot: string, toolId: string, view: FileView): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!tool?.skillsDir || !adapter) return false;
  return (tool.legacySkillsDirs ?? []).some((legacyRoot) =>
    COMMAND_IDS.some((commandId) => {
      const commandPath = adapter.getFilePath(commandId);
      const segments = commandPath.split(/[\\/]/);
      if (path.isAbsolute(commandPath) || segments[0] !== tool.skillsDir) return false;
      segments[0] = legacyRoot;
      const file = path.join(projectRoot, ...segments);
      try {
        FileSystemUtils.assertProjectArtifactPath(projectRoot, file);
        return view.exists(file);
      } catch {
        return false;
      }
    })
  );
}

/**
 * Gets all configured tools in the project (configured via skills or commands).
 */
export function getConfiguredTools(projectRoot: string, view: FileView = DISK_VIEW): string[] {
  return AI_TOOLS
    .filter((t) => {
      if (!toolSupportsSkills(t)) return false;
      return (
        getToolSkillStatus(projectRoot, t.value, view).configured ||
        toolHasAnyConfiguredCommand(projectRoot, t.value, view) ||
        (
          resolveCommandSurfaceCapability(t.value) === 'adapter-backed' &&
          (hasLegacySkills(projectRoot, t, view) || hasLegacyCommands(projectRoot, t.value, view))
        ) ||
        isListedToolPresent(projectRoot, t.value, view)
      );
    })
    .map((tool) => tool.value);
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
