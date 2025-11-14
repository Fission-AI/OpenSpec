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
 * QwenSlashCommandConfigurator class provides integration with Qwen Code
 * by creating the necessary slash command files in the .qwen/commands directory.
 *
 * The slash commands include:
 * - /openspec-proposal: Create an OpenSpec change proposal
 * - /openspec-apply: Apply an approved OpenSpec change
 * - /openspec-archive: Archive a deployed OpenSpec change
 */
export declare class QwenSlashCommandConfigurator extends SlashCommandConfigurator {
    /** Unique identifier for the Qwen tool */
    readonly toolId = "qwen";
    /** Availability status for the Qwen tool */
    readonly isAvailable = true;
    /**
     * Returns the relative file path for a given slash command ID.
     * @param {SlashCommandId} id - The slash command identifier
     * @returns {string} The relative path to the command file
     */
    protected getRelativePath(id: SlashCommandId): string;
    /**
     * Returns the YAML frontmatter for a given slash command ID.
     * @param {SlashCommandId} id - The slash command identifier
     * @returns {string} The YAML frontmatter string
     */
    protected getFrontmatter(id: SlashCommandId): string;
}
//# sourceMappingURL=qwen.d.ts.map