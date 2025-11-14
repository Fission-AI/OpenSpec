import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
/**
 * Qoder Slash Command Configurator
 *
 * Manages OpenSpec slash commands for Qoder AI assistant.
 * Creates three workflow commands: proposal, apply, and archive.
 * Uses colon-separated command format (/openspec:proposal).
 *
 * @extends {SlashCommandConfigurator}
 */
export declare class QoderSlashCommandConfigurator extends SlashCommandConfigurator {
    /** Unique identifier for Qoder tool */
    readonly toolId = "qoder";
    /** Indicates slash commands are available for this tool */
    readonly isAvailable = true;
    /**
     * Get relative file path for a slash command
     *
     * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
     * @returns {string} Relative path from project root to command file
     */
    protected getRelativePath(id: SlashCommandId): string;
    /**
     * Get YAML frontmatter for a slash command
     *
     * Frontmatter defines how the command appears in Qoder's UI,
     * including display name, description, and categorization.
     *
     * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
     * @returns {string} YAML frontmatter block with command metadata
     */
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=qoder.d.ts.map