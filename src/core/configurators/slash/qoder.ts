import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

/**
 * File paths for Qoder slash commands
 * Maps each LightSpec workflow stage to its command file location
 * Commands are stored in .qoder/commands/openspec/ directory
 */
const FILE_PATHS: Record<SlashCommandId, string> = {
  // Create and validate new change proposals
  proposal: '.qoder/commands/openspec/proposal.md',
  
  // Implement approved changes with task tracking
  apply: '.qoder/commands/openspec/apply.md',
  
  // Archive completed changes and update specs
  archive: '.qoder/commands/openspec/archive.md'
};

/**
 * YAML frontmatter for Qoder slash commands
 * Defines metadata displayed in Qoder's command palette
 * Each command is categorized and tagged for easy discovery
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: LightSpec: Proposal
description: Scaffold a new LightSpec change and validate strictly.
category: LightSpec
tags: [openspec, change]
---`,
  apply: `---
name: LightSpec: Apply
description: Implement an approved LightSpec change and keep tasks in sync.
category: LightSpec
tags: [openspec, apply]
---`,
  archive: `---
name: LightSpec: Archive
description: Archive a deployed LightSpec change and update specs.
category: LightSpec
tags: [openspec, archive]
---`
};

/**
 * Qoder Slash Command Configurator
 * 
 * Manages LightSpec slash commands for Qoder AI assistant.
 * Creates three workflow commands: proposal, apply, and archive.
 * Uses colon-separated command format (/openspec:proposal).
 * 
 * @extends {SlashCommandConfigurator}
 */
export class QoderSlashCommandConfigurator extends SlashCommandConfigurator {
  /** Unique identifier for Qoder tool */
  readonly toolId = 'qoder';
  
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
   * Frontmatter defines how the command appears in Qoder's UI,
   * including display name, description, and categorization.
   * 
   * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
   * @returns {string} YAML frontmatter block with command metadata
   */
  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}