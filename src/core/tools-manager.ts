/**
 * Tools Manager
 *
 * Encapsulates adding and removing IDE/Code Agent OpenSpec configuration files.
 * Shared by `openspec init` (via InitCommand) and `openspec tools`.
 */

import path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';
import { FileSystemUtils } from '../utils/file-system.js';
import { transformToHyphenCommands } from '../utils/command-references.js';
import { AI_TOOLS, type AIToolOption } from './config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from './command-generation/index.js';
import {
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
} from './shared/index.js';
import {
  getToolStates,
  getToolsWithSkillsDir,
  type ToolSkillStatus,
} from './shared/index.js';
import { getGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS } from './profiles.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

// Map from workflow ID to the skill directory name it uses
const WORKFLOW_TO_SKILL_DIR: Record<string, string> = {
  explore: 'openspec-explore',
  new: 'openspec-new-change',
  continue: 'openspec-continue-change',
  apply: 'openspec-apply-change',
  ff: 'openspec-ff-change',
  sync: 'openspec-sync-specs',
  archive: 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  verify: 'openspec-verify-change',
  onboard: 'openspec-onboard',
  propose: 'openspec-propose',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared remove helpers (also used by InitCommand)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Removes all OpenSpec-owned skill directories under the given `skillsDir`.
 * Only directories whose names match known workflow skill dir names are removed.
 * Other files and directories are left intact.
 *
 * @returns Number of directories removed
 */
export async function removeOpenSpecSkillDirs(skillsDir: string): Promise<number> {
  let removed = 0;

  for (const workflow of ALL_WORKFLOWS) {
    const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
    if (!dirName) continue;

    const skillDir = path.join(skillsDir, dirName);
    try {
      if (fs.existsSync(skillDir)) {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Ignore individual errors
    }
  }

  return removed;
}

/**
 * Removes all OpenSpec-owned command files for the given tool.
 * Only files whose paths are produced by the tool's adapter `getFilePath()` are removed.
 * The tool's configuration directory is left intact.
 *
 * @returns Number of files removed
 */
export async function removeOpenSpecCommandFiles(
  projectPath: string,
  toolId: string
): Promise<number> {
  let removed = 0;
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return 0;

  for (const workflow of ALL_WORKFLOWS) {
    const cmdPath = adapter.getFilePath(workflow);
    const fullPath = path.isAbsolute(cmdPath)
      ? cmdPath
      : path.join(projectPath, cmdPath);

    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        removed++;
      }
    } catch {
      // Ignore individual errors
    }
  }

  return removed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Remove API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds OpenSpec skill and command files for the given tool.
 * Creates the tool's configuration directory if it does not exist.
 * Respects the active global config (profile and delivery settings).
 */
export async function addTool(
  projectPath: string,
  tool: AIToolOption
): Promise<void> {
  if (!tool.skillsDir) {
    throw new Error(`Tool '${tool.value}' does not support skill generation.`);
  }

  const globalConfig = getGlobalConfig();
  const profile: Profile = globalConfig.profile ?? 'core';
  const delivery: Delivery = globalConfig.delivery ?? 'both';
  const workflows = getProfileWorkflows(profile, globalConfig.workflows);

  const shouldGenerateSkills = delivery !== 'commands';
  const shouldGenerateCommands = delivery !== 'skills';

  // Write skill files
  if (shouldGenerateSkills) {
    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
    const skillTemplates = getSkillTemplates(workflows);

    for (const { template, dirName } of skillTemplates) {
      const skillDir = path.join(skillsDir, dirName);
      const skillFile = path.join(skillDir, 'SKILL.md');
      const transformer =
        tool.value === 'opencode' || tool.value === 'pi'
          ? transformToHyphenCommands
          : undefined;
      const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
      await FileSystemUtils.writeFile(skillFile, skillContent);
    }
  }

  // Write command files
  if (shouldGenerateCommands) {
    const adapter = CommandAdapterRegistry.get(tool.value);
    if (adapter) {
      const commandContents = getCommandContents(workflows);
      const generatedCommands = generateCommands(commandContents, adapter);

      for (const cmd of generatedCommands) {
        const commandFile = path.isAbsolute(cmd.path)
          ? cmd.path
          : path.join(projectPath, cmd.path);
        await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
      }
    }
  }
}

/**
 * Removes OpenSpec-owned skill and command files for the given tool.
 * The tool's configuration directory itself is left intact; only files and
 * directories created by OpenSpec are removed.
 *
 * @returns Counts of removed skill dirs and command files
 */
export async function removeTool(
  projectPath: string,
  tool: AIToolOption
): Promise<{ removedSkillCount: number; removedCommandCount: number }> {
  if (!tool.skillsDir) {
    return { removedSkillCount: 0, removedCommandCount: 0 };
  }

  const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
  const removedSkillCount = await removeOpenSpecSkillDirs(skillsDir);
  const removedCommandCount = await removeOpenSpecCommandFiles(projectPath, tool.value);

  return { removedSkillCount, removedCommandCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the IDs of all tools that are currently configured in the project.
 */
export function getCurrentToolIds(projectPath: string): Set<string> {
  const toolStates: Map<string, ToolSkillStatus> = getToolStates(projectPath);
  const configured = new Set<string>();
  for (const [toolId, status] of toolStates) {
    if (status.configured) configured.add(toolId);
  }
  return configured;
}

/**
 * Returns all tools eligible for skill generation (those with a skillsDir).
 */
export function getEligibleTools(): AIToolOption[] {
  return AI_TOOLS.filter((t) => !!t.skillsDir);
}

/**
 * Resolves a comma-separated tool list string to an array of valid tool IDs.
 *
 * Accepts the special values "all" and "none".
 * Throws a descriptive error for invalid or ambiguous inputs.
 */
export function resolveToolsArg(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(
      'The --add/--remove option requires a value. Use "all" or a comma-separated list of tool IDs.'
    );
  }

  const availableTools = getToolsWithSkillsDir();
  const availableSet = new Set(availableTools);

  if (trimmed.toLowerCase() === 'all') {
    return availableTools;
  }

  if (trimmed.toLowerCase() === 'none') {
    return [];
  }

  const tokens = trimmed
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (tokens.some((t) => t === 'all' || t === 'none')) {
    throw new Error('Cannot combine "all" or "none" with specific tool IDs.');
  }

  const invalid = tokens.filter((t) => !availableSet.has(t));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid tool(s): ${invalid.join(', ')}. Available: ${availableTools.join(', ')}`
    );
  }

  // Deduplicate preserving order
  const deduped: string[] = [];
  for (const t of tokens) {
    if (!deduped.includes(t)) deduped.push(t);
  }
  return deduped;
}
