import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

/**
 * File paths for Neovate slash commands
 * Maps each OpenSpec workflow stage to its command file location
 * Commands are stored in .neovate/commands/openspec/ directory
 */
const FILE_PATHS: Record<SlashCommandId, string> = {
  // Create and validate new change proposals
  proposal: '.neovate/commands/openspec/proposal.md',
  
  // Implement approved changes with task tracking
  apply: '.neovate/commands/openspec/apply.md',
  
  // Archive completed changes and update specs
  archive: '.neovate/commands/openspec/archive.md'
};

/**
 * YAML frontmatter for Neovate slash commands
 * Defines metadata displayed in Neovate's command palette
 * Each command is categorized and tagged for easy discovery
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: Proposal
description: Scaffold a new OpenSpec change and validate strictly.
---`,
  apply: `---
name: Apply
description: Implement an approved OpenSpec change and keep tasks in sync.
---`,
  archive: `---
name: Archive
description: Archive a deployed OpenSpec change and update specs.
---`
};

/**
 * Neovate Slash Command Configurator
 * 
 * Manages OpenSpec slash commands for Neovate Code AI assistant.
 * Creates three workflow commands: proposal, apply, and archive.
 * Uses colon-separated command format (/openspec:proposal).
 * 
 * @extends {SlashCommandConfigurator}
 */
export class NeovateSlashCommandConfigurator extends SlashCommandConfigurator {
  /** Unique identifier for Neovate tool */
  readonly toolId = 'neovate';
  
  /** Indicates slash commands are available for this tool */
  readonly isAvailable = true;

  /**
   * Get relative file path for a slash command
   * 
   * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
   * @returns {string} Relative path from project root to command file
   */
  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  /**
   * Get YAML frontmatter for a slash command
   * 
   * Frontmatter defines how the command appears in Neovate's UI,
   * including display name, description, and categorization.
   * 
   * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
   * @returns {string} YAML frontmatter block with command metadata
   */
  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
