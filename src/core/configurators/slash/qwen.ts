/**
 * Qwen slash command configurator for OpenSpec integration.
 * This class handles the generation of Qwen-specific slash command files
 * in the .qwen/commands directory structure.
 * 
 * @implements {SlashCommandConfigurator}
 */
import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

/** 
 * Mapping of slash command IDs to their corresponding file paths in .qwen/commands directory.
 * @type {Record<SlashCommandId, string>}
 */
const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.qwen/commands/openspec-proposal.md',
  apply: '.qwen/commands/openspec-apply.md',
  archive: '.qwen/commands/openspec-archive.md'
};

/**
 * YAML frontmatter definitions for Qwen command files.
 * These provide metadata for each slash command to ensure proper recognition by Qwen Code.
 * @type {Record<SlashCommandId, string>}
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: /openspec-proposal
id: openspec-proposal
category: OpenSpec
description: Scaffold a new OpenSpec change and validate strictly.
---`,
  apply: `---
name: /openspec-apply
id: openspec-apply
category: OpenSpec
description: Implement an approved OpenSpec change and keep tasks in sync.
---`,
  archive: `---
name: /openspec-archive
id: openspec-archive
category: OpenSpec
description: Archive a deployed OpenSpec change and update specs.
---`
};

/**
 * QwenSlashCommandConfigurator class provides integration with Qwen Code
 * by creating the necessary slash command files in the .qwen/commands directory.
 * 
 * The slash commands include:
 * - /openspec-proposal: Create an OpenSpec change proposal
 * - /openspec-apply: Apply an approved OpenSpec change
 * - /openspec-archive: Archive a deployed OpenSpec change
 */
export class QwenSlashCommandConfigurator extends SlashCommandConfigurator {
  /** Unique identifier for the Qwen tool */
  readonly toolId = 'qwen';
  
  /** Availability status for the Qwen tool */
  readonly isAvailable = true;

  /**
   * Returns the relative file path for a given slash command ID.
   * @param {SlashCommandId} id - The slash command identifier
   * @returns {string} The relative path to the command file
   */
  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  /**
   * Returns the YAML frontmatter for a given slash command ID.
   * @param {SlashCommandId} id - The slash command identifier
   * @returns {string} The YAML frontmatter string
   */
  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}