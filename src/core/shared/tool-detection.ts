/**
 * Tool Detection Utilities
 *
 * Shared utilities for detecting tool configurations and version status.
 */

import path from 'path';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES } from '../config.js';
import { CommandAdapterRegistry, generateCommands } from '../command-generation/index.js';
import { getCommandContents } from './skill-generation.js';
import { getGlobalConfig, type Delivery } from '../global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS } from '../profiles.js';
import { hasLegacySkills, isToolListed, readKeptSharedSkills, readListedToolsWithOwnFiles } from '../shared-skill-target.js';
import {
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
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
import { isReleasedGeneratedContent } from './generated-fingerprint.js';

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
function normalizeCommandContent(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

/**
 * Checks whether command files for a tool on disk match current generated command contents.
 *
 * Command files carry no version stamp, so content equality is the only available
 * "is this current?" signal for a commands-only install.
 */
export function areCommandFilesUpToDate(
  projectRoot: string,
  toolId: string,
  options?: {
    workflows?: readonly string[];
    /** The tree to read; the disk unless an update is planning. */
    view?: FileView;
  }
): boolean {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return false;
  const view = options?.view ?? DISK_VIEW;

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
    if (!view.exists(cmdPath)) {
      return false;
    }
    try {
      const existingContent = view.read(cmdPath);
      if (normalizeCommandContent(existingContent) !== normalizeCommandContent(cmd.fileContent)) {
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
    if (view.exists(fullPath)) {
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
    /** Effective delivery; read from the global config when omitted. */
    delivery?: Delivery;
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

  // 1. Find the first skill file that exists and read its version. When the
  //    tool gets no skills under the current delivery, a copy the user keeps
  //    in its own folder says nothing about what is installed (only a link or
  //    untouched release output does); reading it would make every update
  //    think the tool is out of date.
  const ownDir = usesSharedSkills(tool) ? resolveFormerOwnSkillsDir(projectRoot, tool) : undefined;
  let usesSkills = true;
  try {
    usesSkills = shouldGenerateSkillsForTool(toolId, options?.delivery ?? getGlobalConfig().delivery ?? 'both');
  } catch {
    usesSkills = true;
  }
  const sharedDir = resolveSharedSkillsDir(projectRoot);
  const keptShared = usesSharedSkills(tool) ? readKeptSharedSkills(projectRoot, view) : new Set<string>();
  const speaksForVersion = (skillsDir: string, skillFile: string): boolean => {
    // A skill the user keeps in the shared folder is theirs, not a version,
    // whether read there or through a tool's link to it.
    if (keptShared.has(path.basename(path.dirname(skillFile)))) return false;
    if (skillsDir === sharedDir || skillsDir !== ownDir || usesSkills) return true;
    if (view.linkTarget?.(path.dirname(skillFile)) !== undefined) return true;
    try {
      return isReleasedGeneratedContent(view.read(skillFile));
    } catch {
      return false;
    }
  };
  for (const skillName of SKILL_NAMES) {
    for (const skillsDir of skillsDirs) {
      const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
      if (view.exists(skillFile) && speaksForVersion(skillsDir, skillFile)) {
        generatedByVersion = extractGeneratedByVersion(skillFile, view);
        foundSkill = true;
        break;
      }
    }
    if (foundSkill) break;
  }

  // Configured from any of its skills; current only from those found above.
  const skillConfigured = foundSkill;
  const commandConfigured = toolHasAnyConfiguredCommand(projectRoot, toolId, view);
  const markerConfigured = isListedToolPresent(projectRoot, toolId, view);
  const configured =
    getToolSkillStatus(projectRoot, toolId, view).configured || commandConfigured || markerConfigured;

  // 2. Commands-only installs have no skill file to read a version from, so fall
  //    back to comparing the generated command content. Deliberately skipped when
  //    skill files exist: an unreadable version there must still force a rewrite.
  if (!skillConfigured && commandConfigured && areCommandFilesUpToDate(projectRoot, toolId, options)) {
    generatedByVersion = currentVersion;
  }
  if (!skillConfigured && !commandConfigured && markerConfigured) {
    const delivery = options?.delivery ?? getGlobalConfig().delivery ?? 'both';
    if (
      !shouldGenerateSkillsForTool(toolId, delivery) &&
      !shouldGenerateCommandsForTool(toolId, delivery)
    ) {
      generatedByVersion = currentVersion;
    }
  }

  // 3. A version marker in a skill file only proves the SKILL files came from
  //    this CLI. It says nothing about the command files written beside them,
  //    which a user may have hand-edited or a partial write may have truncated.
  //    Without this, `update` answered "all tools up to date" while a damaged
  //    command file sat on disk, repairable only by knowing to pass --force.
  //    The content comparison already exists; it was simply never consulted
  //    once a skill file supplied a version.
  //
  //    Scoped to tools that have BOTH, so the commands-only path above keeps
  //    its exact behaviour, and skipped when the delivery mode generates no
  //    commands for this tool - there would be nothing to compare against, and
  //    `areCommandFilesUpToDate` reports an empty command set as "not current".
  let commandsDrifted = false;
  if (skillConfigured && commandConfigured) {
    let generatesCommands = true;
    try {
      generatesCommands = shouldGenerateCommandsForTool(
        toolId,
        options?.delivery ?? getGlobalConfig().delivery ?? 'both'
      );
    } catch {
      generatesCommands = true;
    }
    commandsDrifted =
      generatesCommands && !areCommandFilesUpToDate(projectRoot, toolId, options);
  }

  const needsUpdate =
    configured &&
    (generatedByVersion === null ||
      generatedByVersion !== currentVersion ||
      commandsDrifted);

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
