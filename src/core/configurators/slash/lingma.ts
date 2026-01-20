import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

/**
 * File paths for Lingma slash commands
 * Maps each OpenSpec workflow stage to its command file location
 * Commands are stored in .lingma/rules/workflows/ directory
 */
const FILE_PATHS: Record<SlashCommandId, string> = {
  // Create and validate new change proposals
  proposal: '.lingma/rules/workflows/openspec-proposal.md',
  
  // Implement approved changes with task tracking
  apply: '.lingma/rules/workflows/openspec-apply.md',
  
  // Archive completed changes and update specs
  archive: '.lingma/rules/workflows/openspec-archive.md'
};

/**
 * Lingma Slash Command Configurator
 * 
 * Manages OpenSpec slash commands for Lingma IDE AI assistant.
 * Creates three workflow commands: proposal, apply, and archive.
 * Uses manual trigger configuration for command execution.
 * 
 * @extends {SlashCommandConfigurator}
 */
export class LingmaSlashCommandConfigurator extends SlashCommandConfigurator {
  /** Unique identifier for Lingma tool */
  readonly toolId = 'lingma';
  
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
   * Get frontmatter and header for a slash command
   * 
   * Includes manual trigger configuration and OpenSpec command instructions.
   * The trigger setting ensures commands are executed manually by the user.
   * 
   * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
   * @returns {string | undefined} Manual trigger configuration and command header
   */
  protected getFrontmatter(id: SlashCommandId): string | undefined {
    // Define descriptions for each command type
    const descriptions: Record<SlashCommandId, string> = {
      proposal: 'Scaffold a new OpenSpec change and validate strictly.',
      apply: 'Implement an approved OpenSpec change and keep tasks in sync.',
      archive: 'Archive a deployed OpenSpec change and update specs.'
    };
    
    // Create manual trigger configuration for Lingma rules
    const lingmaRulesTrigger = `---\ntrigger: manual\n---\n`;
    
    // Get the appropriate description for the command
    const description = descriptions[id];
    
    // Combine trigger configuration with command header and description
    return `${lingmaRulesTrigger}# OpenSpec: ${id.charAt(0).toUpperCase() + id.slice(1)}\n\n${description}`;
  }
}