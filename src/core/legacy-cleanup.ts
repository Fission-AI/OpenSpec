/**
 * Legacy cleanup module for detecting and removing OpenSpec artifacts
 * from previous init versions during the migration to the skill-based workflow.
 */

import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { FileSystemUtils, removeMarkerBlock as removeMarkerBlockUtil } from '../utils/file-system.js';
import { OPENSPEC_MARKERS } from './config.js';
import type { WorkflowId } from './profiles.js';

/**
 * Legacy config file names from the old ToolRegistry.
 * These were config files created at project root with OpenSpec markers.
 */
export const LEGACY_CONFIG_FILES = [
  'CLAUDE.md',
  'CLINE.md',
  'CODEBUDDY.md',
  'COSTRICT.md',
  'QODER.md',
  'IFLOW.md',
  'AGENTS.md', // root AGENTS.md (not openspec/AGENTS.md)
  'QWEN.md',
] as const;

/**
 * Legacy slash command patterns from the old SlashCommandRegistry.
 * These map toolId to the path pattern where legacy commands were created.
 * Some tools used a directory structure, others used individual files.
 */
export const LEGACY_SLASH_COMMAND_PATHS: Record<string, LegacySlashCommandPattern> = {
  // Directory-based: .tooldir/commands/openspec/ or .tooldir/commands/openspec/*.md
  'claude': { type: 'directory', path: '.claude/commands/openspec' },
  'codebuddy': { type: 'directory', path: '.codebuddy/commands/openspec' },
  'qoder': { type: 'directory', path: '.qoder/commands/openspec' },
  'lingma': { type: 'directory', path: '.lingma/commands/openspec' },
  'crush': { type: 'directory', path: '.crush/commands/openspec' },
  'gemini': { type: 'directory', path: '.gemini/commands/openspec' },
  'costrict': { type: 'directory', path: '.cospec/openspec/commands' },

  // File-based: individual openspec-*.md files in a commands/workflows/prompts folder
  'cursor': { type: 'files', pattern: '.cursor/commands/openspec-*.md' },
  'windsurf': { type: 'files', pattern: '.windsurf/workflows/openspec-*.md' },
  'kilocode': { type: 'files', pattern: '.kilocode/workflows/openspec-*.md' },
  'kiro': { type: 'files', pattern: '.kiro/prompts/openspec-*.prompt.md' },
  'github-copilot': { type: 'files', pattern: '.github/prompts/openspec-*.prompt.md' },
  'amazon-q': { type: 'files', pattern: '.amazonq/prompts/openspec-*.md' },
  'cline': { type: 'files', pattern: '.clinerules/workflows/openspec-*.md' },
  'roocode': { type: 'files', pattern: '.roo/commands/openspec-*.md' },
  'auggie': { type: 'files', pattern: '.augment/commands/openspec-*.md' },
  'factory': { type: 'files', pattern: '.factory/commands/openspec-*.md' },
  'opencode': { type: 'files', pattern: ['.opencode/command/opsx-*.md', '.opencode/command/openspec-*.md'] },
  'continue': { type: 'files', pattern: '.continue/prompts/openspec-*.prompt' },
  'antigravity': { type: 'files', pattern: '.agent/workflows/openspec-*.md' },
  'iflow': { type: 'files', pattern: '.iflow/commands/openspec-*.md' },
  'junie': { type: 'files', pattern: ['.junie/commands/opsx-*.md', '.junie/commands/openspec-*.md'] },
  'qwen': { type: 'files', pattern: ['.qwen/commands/opsx-*.toml', '.qwen/commands/openspec-*.toml'] },
  'codex': { type: 'files', pattern: '.codex/prompts/openspec-*.md' },
};

/**
 * Final OpenSpec-managed global Codex prompt filenames mapped to the workflows
 * they represented before Codex moved to skills-only delivery.
 */
const LEGACY_GLOBAL_CODEX_WORKFLOWS: Record<string, readonly WorkflowId[]> = {
  'opsx-propose.md': ['propose'],
  'opsx-explore.md': ['explore'],
  'opsx-new.md': ['new'],
  'opsx-continue.md': ['continue'],
  'opsx-apply.md': ['apply'],
  'opsx-update.md': ['update'],
  'opsx-ff.md': ['ff'],
  'opsx-sync.md': ['sync'],
  'opsx-archive.md': ['archive'],
  'opsx-bulk-archive.md': ['bulk-archive'],
  'opsx-verify.md': ['verify'],
  'opsx-onboard.md': ['onboard'],
};

/**
 * Global legacy prompt locations that live outside the project tree and require
 * allowlisted matching instead of broad glob-based cleanup.
 */
export const LEGACY_GLOBAL_SLASH_COMMAND_PATHS: Record<string, LegacyGlobalPromptPattern> = {
  'codex': {
    managedFileNames: Object.keys(LEGACY_GLOBAL_CODEX_WORKFLOWS),
    workflowIdsByFileName: LEGACY_GLOBAL_CODEX_WORKFLOWS,
    resolvePromptDir: getCodexPromptDir,
    replacementLabel: 'Codex skills',
  },
};

/**
 * Pattern types for legacy slash commands
 */
export interface LegacySlashCommandPattern {
  type: 'directory' | 'files';
  path?: string; // For directory type
  pattern?: string | string[]; // For files type (glob pattern or array of patterns)
}

/**
 * Describes a managed global prompt home and the exact filenames OpenSpec is
 * allowed to treat as legacy artifacts there.
 */
export interface LegacyGlobalPromptPattern {
  managedFileNames: readonly string[];
  workflowIdsByFileName?: Readonly<Record<string, readonly WorkflowId[]>>;
  resolvePromptDir: () => string;
  replacementLabel?: string;
}

/**
 * Workflow-aware metadata for a detected global legacy prompt that is safe for
 * replacement-gated cleanup.
 */
export interface LegacyGlobalPromptMatch {
  path: string;
  toolId: string;
  managedFileName: string;
  workflowIds: readonly WorkflowId[];
  replacementLabel?: string;
}

// Resolve the Codex global prompts directory, respecting CODEX_HOME if set.
export function getCodexPromptDir(): string {
  const envHome = process.env.CODEX_HOME?.trim();
  const codexHome = envHome ? envHome : path.join(os.homedir(), '.codex');
  return path.join(path.resolve(codexHome), 'prompts');
}

// Convert a simple glob pattern (only * wildcards) into an anchored RegExp.
function globToRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`);
}

// Normalize Windows backslashes to forward slashes for cross-platform path matching.
function normalizePathForMatch(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Classifies a global Codex prompt path as OpenSpec-managed only when it matches
 * the explicit legacy allowlist for the resolved prompt home.
 */
function getManagedGlobalLegacyPromptMetadata(filePath: string): LegacyGlobalPromptMatch | undefined {
  if (!path.isAbsolute(filePath)) {
    return undefined;
  }

  const resolvedPath = path.resolve(filePath);

  for (const [toolId, pattern] of Object.entries(LEGACY_GLOBAL_SLASH_COMMAND_PATHS)) {
    const promptDir = path.resolve(pattern.resolvePromptDir());
    if (path.dirname(resolvedPath) !== promptDir) {
      continue;
    }

    const managedFileName = path.basename(resolvedPath);
    if (pattern.managedFileNames.includes(managedFileName)) {
      return {
        path: resolvedPath,
        toolId,
        managedFileName,
        workflowIds: pattern.workflowIdsByFileName?.[managedFileName] ?? [],
        replacementLabel: pattern.replacementLabel,
      };
    }
  }

  return undefined;
}

/**
 * Result of legacy artifact detection
 */
export interface LegacyDetectionResult {
  /** Config files with OpenSpec markers detected */
  configFiles: string[];
  /** Config files to update (remove markers only, never delete) */
  configFilesToUpdate: string[];
  /** Legacy slash command directories found */
  slashCommandDirs: string[];
  /** Legacy slash command files found (for file-based tools) */
  slashCommandFiles: string[];
  /** Managed global command/prompt files found outside the project root */
  globalSlashCommandFiles: string[];
  /** Details for managed global command/prompt files */
  globalSlashCommandDetails?: LegacyGlobalPromptMatch[];
  /** Whether openspec/AGENTS.md exists */
  hasOpenspecAgents: boolean;
  /** Whether openspec/project.md exists (preserved, migration hint only) */
  hasProjectMd: boolean;
  /** Whether root AGENTS.md has OpenSpec markers */
  hasRootAgentsWithMarkers: boolean;
  /** Whether any legacy artifacts were found */
  hasLegacyArtifacts: boolean;
}

/**
 * Detects all legacy OpenSpec artifacts in a project.
 *
 * @param projectPath - The root path of the project
 * @returns Detection result with all found legacy artifacts
 */
export async function detectLegacyArtifacts(
  projectPath: string
): Promise<LegacyDetectionResult> {
  const result: LegacyDetectionResult = {
    configFiles: [],
    configFilesToUpdate: [],
    slashCommandDirs: [],
    slashCommandFiles: [],
    globalSlashCommandFiles: [],
    globalSlashCommandDetails: [],
    hasOpenspecAgents: false,
    hasProjectMd: false,
    hasRootAgentsWithMarkers: false,
    hasLegacyArtifacts: false,
  };

  // Detect legacy config files
  const configResult = await detectLegacyConfigFiles(projectPath);
  result.configFiles = configResult.allFiles;
  result.configFilesToUpdate = configResult.filesToUpdate;

  // Detect legacy slash commands
  const slashResult = await detectLegacySlashCommands(projectPath);
  result.slashCommandDirs = slashResult.directories;
  result.slashCommandFiles = [...new Set(slashResult.files)];

  // Detect legacy global slash commands
  result.globalSlashCommandDetails = await detectLegacyGlobalPromptFiles();
  result.globalSlashCommandFiles = result.globalSlashCommandDetails.map((detail) => detail.path);

  // Detect legacy structure files
  const structureResult = await detectLegacyStructureFiles(projectPath);
  result.hasOpenspecAgents = structureResult.hasOpenspecAgents;
  result.hasProjectMd = structureResult.hasProjectMd;
  result.hasRootAgentsWithMarkers = structureResult.hasRootAgentsWithMarkers;

  // Determine if any legacy artifacts exist
  result.hasLegacyArtifacts =
    result.configFiles.length > 0 ||
    result.slashCommandDirs.length > 0 ||
    result.slashCommandFiles.length > 0 ||
    result.globalSlashCommandFiles.length > 0 ||
    result.hasOpenspecAgents ||
    result.hasRootAgentsWithMarkers ||
    result.hasProjectMd;

  return result;
}

/**
 * Detects legacy config files with OpenSpec markers.
 * All config files with markers are candidates for update (marker removal only).
 * Config files are NEVER deleted - they belong to the user's project root.
 *
 * @param projectPath - The root path of the project
 * @returns Object with all files found and files to update
 */
export async function detectLegacyConfigFiles(
  projectPath: string
): Promise<{
  allFiles: string[];
  filesToUpdate: string[];
}> {
  const allFiles: string[] = [];
  const filesToUpdate: string[] = [];

  for (const fileName of LEGACY_CONFIG_FILES) {
    const filePath = FileSystemUtils.joinPath(projectPath, fileName);

    if (await FileSystemUtils.fileExists(filePath)) {
      const content = await FileSystemUtils.readFile(filePath);

      if (hasOpenSpecMarkers(content)) {
        allFiles.push(fileName);
        filesToUpdate.push(fileName); // Always update, never delete config files
      }
    }
  }

  return { allFiles, filesToUpdate };
}

/**
 * Detects legacy slash command directories and files.
 *
 * @param projectPath - The root path of the project
 * @returns Object with directories and individual files found
 */
export async function detectLegacySlashCommands(
  projectPath: string
): Promise<{
  directories: string[];
  files: string[];
}> {
  const directories: string[] = [];
  const files: string[] = [];

  for (const pattern of Object.values(LEGACY_SLASH_COMMAND_PATHS)) {
    if (pattern.type === 'directory' && pattern.path) {
      const dirPath = FileSystemUtils.joinPath(projectPath, pattern.path);
      if (await FileSystemUtils.directoryExists(dirPath)) {
        directories.push(pattern.path);
      }
    } else if (pattern.type === 'files' && pattern.pattern) {
      const patterns = Array.isArray(pattern.pattern) ? pattern.pattern : [pattern.pattern];
      for (const p of patterns) {
        const foundFiles = await findLegacySlashCommandFiles(projectPath, p);
        files.push(...foundFiles);
      }
    }
  }

  return { directories, files };
}

/**
 * Detects legacy global slash command files.
 *
 * @returns Object with individual files found
 */
/**
 * Scans the resolved global Codex prompt directories and returns only the
 * allowlisted OpenSpec-managed legacy prompt files.
 */
async function detectLegacyGlobalPromptFiles(): Promise<LegacyGlobalPromptMatch[]> {
  const foundFiles: LegacyGlobalPromptMatch[] = [];

  for (const pattern of Object.values(LEGACY_GLOBAL_SLASH_COMMAND_PATHS)) {
    const promptDir = pattern.resolvePromptDir();

    try {
      const entries = await fs.readdir(promptDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && pattern.managedFileNames.includes(entry.name)) {
          const fullPath = path.join(promptDir, entry.name);
          const match = getManagedGlobalLegacyPromptMetadata(fullPath);
          if (match) {
            foundFiles.push(match);
          }
        }
      }
    } catch {
      // Directory does not exist or cannot be read.
    }
  }

  return foundFiles;
}

/**
 * Finds legacy slash command files matching a glob pattern.
 *
 * @param projectPath - The root path of the project
 * @param pattern - Glob pattern like '.cursor/commands/openspec-*.md'
 * @returns Array of matching file paths relative to projectPath
 */
async function findLegacySlashCommandFiles(
  projectPath: string,
  pattern: string
): Promise<string[]> {
  const foundFiles: string[] = [];

  // Extract directory and file pattern from glob
  // Handle both forward and backward slashes for Windows compatibility
  const lastForwardSlash = pattern.lastIndexOf('/');
  const lastBackSlash = pattern.lastIndexOf('\\');
  const lastSeparator = Math.max(lastForwardSlash, lastBackSlash);
  const dirPart = pattern.substring(0, lastSeparator);
  const filePart = pattern.substring(lastSeparator + 1);

  const dirPath = FileSystemUtils.joinPath(projectPath, dirPart);

  if (!(await FileSystemUtils.directoryExists(dirPath))) {
    return foundFiles;
  }

  try {
    const entries = await fs.readdir(dirPath);

    const regex = globToRegex(filePart);

    for (const entry of entries) {
      if (regex.test(entry)) {
        // Use forward slashes for consistency in relative paths (cross-platform)
        const normalizedDir = dirPart.replace(/\\/g, '/');
        foundFiles.push(`${normalizedDir}/${entry}`);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return foundFiles;
}

/**
 * Detects legacy OpenSpec structure files (AGENTS.md and project.md).
 *
 * @param projectPath - The root path of the project
 * @returns Object with detection results for structure files
 */
export async function detectLegacyStructureFiles(
  projectPath: string
): Promise<{
  hasOpenspecAgents: boolean;
  hasProjectMd: boolean;
  hasRootAgentsWithMarkers: boolean;
}> {
  let hasOpenspecAgents = false;
  let hasProjectMd = false;
  let hasRootAgentsWithMarkers = false;

  // Check for openspec/AGENTS.md
  const openspecAgentsPath = FileSystemUtils.joinPath(projectPath, 'openspec', 'AGENTS.md');
  hasOpenspecAgents = await FileSystemUtils.fileExists(openspecAgentsPath);

  // Check for openspec/project.md (for migration messaging, not deleted)
  const projectMdPath = FileSystemUtils.joinPath(projectPath, 'openspec', 'project.md');
  hasProjectMd = await FileSystemUtils.fileExists(projectMdPath);

  // Check for root AGENTS.md with OpenSpec markers
  const rootAgentsPath = FileSystemUtils.joinPath(projectPath, 'AGENTS.md');
  if (await FileSystemUtils.fileExists(rootAgentsPath)) {
    const content = await FileSystemUtils.readFile(rootAgentsPath);
    hasRootAgentsWithMarkers = hasOpenSpecMarkers(content);
  }

  return { hasOpenspecAgents, hasProjectMd, hasRootAgentsWithMarkers };
}

/**
 * Checks if content contains OpenSpec markers.
 *
 * @param content - File content to check
 * @returns True if both start and end markers are present
 */
export function hasOpenSpecMarkers(content: string): boolean {
  return (
    content.includes(OPENSPEC_MARKERS.start) && content.includes(OPENSPEC_MARKERS.end)
  );
}

/**
 * Checks if file content is 100% OpenSpec content (only markers and whitespace outside).
 *
 * @param content - File content to check
 * @returns True if content outside markers is only whitespace
 */
export function isOnlyOpenSpecContent(content: string): boolean {
  const startIndex = content.indexOf(OPENSPEC_MARKERS.start);
  const endIndex = content.indexOf(OPENSPEC_MARKERS.end);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return false;
  }

  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex + OPENSPEC_MARKERS.end.length);

  return before.trim() === '' && after.trim() === '';
}

/**
 * Removes the OpenSpec marker block from file content.
 * Only removes markers that are on their own lines (ignores inline mentions).
 * Cleans up double blank lines that may result from removal.
 *
 * @param content - File content with OpenSpec markers
 * @returns Content with marker block removed
 */
export function removeMarkerBlock(content: string): string {
  return removeMarkerBlockUtil(content, OPENSPEC_MARKERS.start, OPENSPEC_MARKERS.end);
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  /** Files that were deleted entirely */
  deletedFiles: string[];
  /** Replacement labels for deleted files when cleanup knows the new surface */
  deletedFileReplacementLabels?: Record<string, string>;
  /** Files that had marker blocks removed */
  modifiedFiles: string[];
  /** Directories that were deleted */
  deletedDirs: string[];
  /** Whether project.md exists and needs manual migration */
  projectMdNeedsMigration: boolean;
  /** Error messages if any operations failed */
  errors: string[];
}

/**
 * Cleans up legacy OpenSpec artifacts from a project.
 * Preserves openspec/project.md (shows migration hint instead of deleting).
 *
 * @param projectPath - The root path of the project
 * @param detection - Detection result from detectLegacyArtifacts
 * @returns Cleanup result with summary of actions taken
 */
export async function cleanupLegacyArtifacts(
  projectPath: string,
  detection: LegacyDetectionResult
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedFiles: [],
    deletedFileReplacementLabels: {},
    modifiedFiles: [],
    deletedDirs: [],
    projectMdNeedsMigration: detection.hasProjectMd,
    errors: [],
  };

  // Remove marker blocks from config files (NEVER delete config files)
  // Config files like CLAUDE.md, AGENTS.md belong to the user's project root
  for (const fileName of detection.configFilesToUpdate) {
    const filePath = FileSystemUtils.joinPath(projectPath, fileName);
    try {
      const content = await FileSystemUtils.readFile(filePath);
      const newContent = removeMarkerBlock(content);
      // Always write the file, even if empty - never delete user config files
      await FileSystemUtils.writeFile(filePath, newContent);
      result.modifiedFiles.push(fileName);
    } catch (error: any) {
      result.errors.push(`Failed to modify ${fileName}: ${error.message}`);
    }
  }

  // Delete legacy slash command directories (these are 100% OpenSpec-managed)
  for (const dirPath of detection.slashCommandDirs) {
    const fullPath = FileSystemUtils.joinPath(projectPath, dirPath);
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
      result.deletedDirs.push(dirPath);
    } catch (error: any) {
      result.errors.push(`Failed to delete directory ${dirPath}: ${error.message}`);
    }
  }

  // Delete legacy slash command files (these are 100% OpenSpec-managed)
  for (const filePath of detection.slashCommandFiles) {
    const fullPath = FileSystemUtils.joinPath(projectPath, filePath);
    try {
      await fs.unlink(fullPath);
      result.deletedFiles.push(filePath);
    } catch (error: any) {
      result.errors.push(`Failed to delete ${filePath}: ${error.message}`);
    }
  }

  // Delete managed global slash command files (these are 100% OpenSpec-managed)
  const globalPromptMatchesByPath = new Map(
    getLegacyGlobalPromptMatches(detection).map((prompt) => [prompt.path, prompt] as const)
  );
  for (const filePath of detection.globalSlashCommandFiles) {
    if (!getManagedGlobalLegacyPromptMetadata(filePath)) {
      result.errors.push(`Skipped unmanaged global prompt ${filePath}`);
      continue;
    }

    try {
      await fs.unlink(filePath);
      result.deletedFiles.push(filePath);
      const promptMatch = globalPromptMatchesByPath.get(filePath);
      if (promptMatch?.replacementLabel) {
        result.deletedFileReplacementLabels![filePath] = promptMatch.replacementLabel;
      }
    } catch (error: any) {
      result.errors.push(`Failed to delete ${filePath}: ${error.message}`);
    }
  }

  // Delete openspec/AGENTS.md (this is inside openspec/, it's OpenSpec-managed)
  if (detection.hasOpenspecAgents) {
    const agentsPath = FileSystemUtils.joinPath(projectPath, 'openspec', 'AGENTS.md');
    if (await FileSystemUtils.fileExists(agentsPath)) {
      try {
        await fs.unlink(agentsPath);
        result.deletedFiles.push('openspec/AGENTS.md');
      } catch (error: any) {
        result.errors.push(`Failed to delete openspec/AGENTS.md: ${error.message}`);
      }
    }
  }

  // Handle root AGENTS.md with OpenSpec markers - remove markers only, NEVER delete
  // Note: Root AGENTS.md is handled via configFilesToUpdate above (it's in LEGACY_CONFIG_FILES)
  // This hasRootAgentsWithMarkers flag is just for detection, cleanup happens via configFilesToUpdate

  return result;
}

/**
 * Generates a cleanup summary message for display.
 *
 * @param result - Cleanup result from cleanupLegacyArtifacts
 * @returns Formatted summary string for console output
 */
export function formatCleanupSummary(result: CleanupResult): string {
  const lines: string[] = [];

  if (result.deletedFiles.length > 0 || result.deletedDirs.length > 0 || result.modifiedFiles.length > 0) {
    lines.push('Cleaned up legacy files:');

    for (const file of result.deletedFiles) {
      const replacementLabel = result.deletedFileReplacementLabels?.[file]
        ?? getManagedGlobalLegacyPromptMetadata(file)?.replacementLabel;
      const replacement = replacementLabel
        ? ` (replaced by ${replacementLabel})`
        : '';
      lines.push(`  ✓ Removed ${file}${replacement}`);
    }

    for (const dir of result.deletedDirs) {
      lines.push(`  ✓ Removed ${dir}/ (replaced by /opsx:*)`);
    }

    for (const file of result.modifiedFiles) {
      lines.push(`  ✓ Removed OpenSpec markers from ${file}`);
    }
  }

  if (result.projectMdNeedsMigration) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(formatProjectMdMigrationHint());
  }

  if (result.errors.length > 0) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push('Errors during cleanup:');
    for (const error of result.errors) {
      lines.push(`  ⚠ ${error}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build list of files to be removed with explanations.
 * Only includes OpenSpec-managed files (slash commands, openspec/AGENTS.md).
 * Config files like CLAUDE.md, AGENTS.md are NEVER deleted.
 *
 * @param detection - Detection result from detectLegacyArtifacts
 * @returns Array of objects with path and explanation
 */
function buildRemovalsList(detection: LegacyDetectionResult): Array<{ path: string; explanation: string }> {
  const removals: Array<{ path: string; explanation: string }> = [];

  // Slash command directories (these are 100% OpenSpec-managed)
  for (const dir of detection.slashCommandDirs) {
    // Split on both forward and backward slashes for Windows compatibility
    const toolDir = dir.split(/[\/\\]/)[0];
    removals.push({ path: dir + '/', explanation: `replaced by ${toolDir}/skills/` });
  }

  // Slash command files (these are 100% OpenSpec-managed)
  for (const file of detection.slashCommandFiles) {
    removals.push({ path: file, explanation: 'replaced by skills/' });
  }

  // Managed global slash command files
  for (const prompt of getLegacyGlobalPromptMatches(detection)) {
    const explanation = prompt.toolId
      ? `replaced by .${prompt.toolId}/skills/`
      : 'replaced by skills/';
    removals.push({ path: prompt.path, explanation });
  }

  // openspec/AGENTS.md (inside openspec/, it's OpenSpec-managed)
  if (detection.hasOpenspecAgents) {
    removals.push({ path: 'openspec/AGENTS.md', explanation: 'obsolete workflow file' });
  }

  // Note: Config files (CLAUDE.md, AGENTS.md, etc.) are NEVER in the removals list
  // They always go to the updates list where only markers are removed

  return removals;
}

/**
 * Build list of files to be updated with explanations.
 * Includes ALL config files with markers - markers are removed, file is never deleted.
 *
 * @param detection - Detection result from detectLegacyArtifacts
 * @returns Array of objects with path and explanation
 */
function buildUpdatesList(detection: LegacyDetectionResult): Array<{ path: string; explanation: string }> {
  const updates: Array<{ path: string; explanation: string }> = [];

  // All config files with markers get updated (markers removed, file preserved)
  for (const file of detection.configFilesToUpdate) {
    updates.push({ path: file, explanation: 'removing OpenSpec markers' });
  }

  return updates;
}

/**
 * Generates a detection summary message for display before cleanup.
 * Groups files by action type: removals, updates, and manual migration.
 *
 * @param detection - Detection result from detectLegacyArtifacts
 * @returns Formatted summary string showing what was found
 */
export function formatDetectionSummary(detection: LegacyDetectionResult): string {
  const lines: string[] = [];

  const removals = buildRemovalsList(detection);
  const updates = buildUpdatesList(detection);

  // If nothing to show, return empty
  if (removals.length === 0 && updates.length === 0 && !detection.hasProjectMd) {
    return '';
  }

  // Header - welcoming upgrade message
  lines.push(chalk.bold('Upgrading to the new OpenSpec'));
  lines.push('');
  lines.push('OpenSpec now uses agent skills, the emerging standard across coding');
  lines.push('agents. This simplifies your setup while keeping everything working');
  lines.push('as before.');
  lines.push('');

  // Section 1: Files to remove (no user content to preserve)
  if (removals.length > 0) {
    lines.push(chalk.bold('Files to remove'));
    lines.push(chalk.dim('No user content to preserve:'));
    for (const { path } of removals) {
      lines.push(`  • ${path}`);
    }
  }

  // Section 2: Files to update (markers removed, content preserved)
  if (updates.length > 0) {
    if (removals.length > 0) lines.push('');
    lines.push(chalk.bold('Files to update'));
    lines.push(chalk.dim('OpenSpec markers will be removed, your content preserved:'));
    for (const { path } of updates) {
      lines.push(`  • ${path}`);
    }
  }

  // Section 3: Manual migration (project.md)
  if (detection.hasProjectMd) {
    if (removals.length > 0 || updates.length > 0) lines.push('');
    lines.push(formatProjectMdMigrationHint());
  }

  return lines.join('\n');
}

/**
 * Generates a summary for managed global prompt files whose cleanup must wait
 * until replacement skills are installed.
 */
export function formatDeferredGlobalPromptSummary(detection: LegacyDetectionResult): string {
  const deferredPrompts = getLegacyGlobalPromptMatches(detection);
  if (deferredPrompts.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push(chalk.bold('Deferred global prompts cleanup'));
  lines.push(chalk.dim('These global prompts will only be removed after matching replacement skills are installed.'));
  for (const prompt of deferredPrompts) {
    const toolLabel = prompt.toolId ? `${prompt.toolId}: ` : '';
    lines.push(`  • ${toolLabel}${prompt.path}`);
  }

  return lines.join('\n');
}

/**
 * Extract tool IDs from detected legacy artifacts.
 * Uses LEGACY_SLASH_COMMAND_PATHS to map paths back to tool IDs.
 *
 * @param detection - Detection result from detectLegacyArtifacts
 * @returns Array of tool IDs that had legacy artifacts
 */
export function getToolsFromLegacyArtifacts(detection: LegacyDetectionResult): string[] {
  const tools = new Set<string>();

  // Match directories to tool IDs
  for (const dir of detection.slashCommandDirs) {
    for (const [toolId, pattern] of Object.entries(LEGACY_SLASH_COMMAND_PATHS)) {
      if (pattern.type === 'directory' && pattern.path === dir) {
        tools.add(toolId);
        break;
      }
    }
  }

  // Match files to tool IDs using glob patterns
  for (const file of detection.slashCommandFiles) {
    // Normalize file path to use forward slashes for consistent matching (Windows compatibility)
    const normalizedFile = normalizePathForMatch(file);
    for (const [toolId, pattern] of Object.entries(LEGACY_SLASH_COMMAND_PATHS)) {
      if (pattern.type === 'files' && pattern.pattern) {
        const patterns = Array.isArray(pattern.pattern) ? pattern.pattern : [pattern.pattern];
        let matched = false;
        for (const p of patterns) {
          const regex = globToRegex(p);
          if (regex.test(normalizedFile)) {
            tools.add(toolId);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
  }

  for (const prompt of getLegacyGlobalPromptMatches(detection)) {
    tools.add(prompt.toolId);
  }

  return Array.from(tools);
}

/**
 * Normalizes global Codex prompt matches so callers can rely on workflow-aware
 * metadata even when older detection results only carry file paths.
 */
export function getLegacyGlobalPromptMatches(detection: LegacyDetectionResult): LegacyGlobalPromptMatch[] {
  if (detection.globalSlashCommandDetails && detection.globalSlashCommandDetails.length > 0) {
    return detection.globalSlashCommandDetails;
  }

  return detection.globalSlashCommandFiles
    .map((filePath) => getManagedGlobalLegacyPromptMetadata(filePath))
    .filter((match): match is LegacyGlobalPromptMatch => match !== undefined);
}

/**
 * Collects workflow IDs inferred from detected legacy global prompts for a
 * specific tool.
 */
export function getLegacyWorkflowIdsForTool(
  detection: LegacyDetectionResult,
  toolId: string
): WorkflowId[] {
  const workflows = new Set<WorkflowId>();

  for (const prompt of getLegacyGlobalPromptMatches(detection)) {
    if (prompt.toolId !== toolId) {
      continue;
    }

    for (const workflowId of prompt.workflowIds) {
      workflows.add(workflowId);
    }
  }

  return Array.from(workflows);
}

function hasLegacyArtifacts(detection: LegacyDetectionResult): boolean {
  return (
    detection.configFiles.length > 0 ||
    detection.slashCommandDirs.length > 0 ||
    detection.slashCommandFiles.length > 0 ||
    detection.globalSlashCommandFiles.length > 0 ||
    detection.hasOpenspecAgents ||
    detection.hasRootAgentsWithMarkers ||
    detection.hasProjectMd
  );
}

/**
 * Returns a detection snapshot with global Codex prompt cleanup removed so
 * callers can safely perform the immediate, non-deferred cleanup pass.
 */
export function omitGlobalLegacyPromptFiles(detection: LegacyDetectionResult): LegacyDetectionResult {
  const nextDetection: LegacyDetectionResult = {
    ...detection,
    globalSlashCommandFiles: [],
    globalSlashCommandDetails: [],
  };
  nextDetection.hasLegacyArtifacts = hasLegacyArtifacts(nextDetection);
  return nextDetection;
}

/**
 * Builds a detection snapshot containing only the selected global Codex prompt
 * matches for replacement-gated cleanup.
 */
export function pickGlobalLegacyPromptFiles(
  detection: LegacyDetectionResult,
  filePaths: readonly string[]
): LegacyDetectionResult {
  const selectedPaths = new Set(filePaths.map((filePath) => path.resolve(filePath)));
  const details = getLegacyGlobalPromptMatches(detection)
    .filter((detail) => selectedPaths.has(path.resolve(detail.path)));

  return {
    configFiles: [],
    configFilesToUpdate: [],
    slashCommandDirs: [],
    slashCommandFiles: [],
    globalSlashCommandFiles: details.map((detail) => detail.path),
    globalSlashCommandDetails: details,
    hasOpenspecAgents: false,
    hasProjectMd: false,
    hasRootAgentsWithMarkers: false,
    hasLegacyArtifacts: details.length > 0,
  };
}

/**
 * Generates a migration hint message for project.md.
 * This is shown when project.md exists and needs manual migration to config.yaml.
 *
 * @returns Formatted migration hint string for console output
 */
export function formatProjectMdMigrationHint(): string {
  const lines: string[] = [];
  lines.push(chalk.yellow.bold('Needs your attention'));
  lines.push('  • openspec/project.md');
  lines.push(chalk.dim('    We won\'t delete this file. It may contain useful project context.'));
  lines.push('');
  lines.push(chalk.dim('    The new openspec/config.yaml has a "context:" section for planning'));
  lines.push(chalk.dim('    context. This is included in every OpenSpec request and works more'));
  lines.push(chalk.dim('    reliably than the old project.md approach.'));
  lines.push('');
  lines.push(chalk.dim('    Review project.md, move any useful content to config.yaml\'s context'));
  lines.push(chalk.dim('    section, then delete the file when ready.'));
  return lines.join('\n');
}
