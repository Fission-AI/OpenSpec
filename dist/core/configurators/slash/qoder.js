import { SlashCommandConfigurator } from './base.js';
/**
 * File paths for Qoder slash commands
 * Maps each OpenSpec workflow stage to its command file location
 * Commands are stored in .qoder/commands/openspec/ directory
 */
const FILE_PATHS = {
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
const FRONTMATTER = {
    proposal: `---
name: OpenSpec: Proposal
description: Scaffold a new OpenSpec change and validate strictly.
category: OpenSpec
tags: [openspec, change]
---`,
    apply: `---
name: OpenSpec: Apply
description: Implement an approved OpenSpec change and keep tasks in sync.
category: OpenSpec
tags: [openspec, apply]
---`,
    archive: `---
name: OpenSpec: Archive
description: Archive a deployed OpenSpec change and update specs.
category: OpenSpec
tags: [openspec, archive]
---`
};
/**
 * Qoder Slash Command Configurator
 *
 * Manages OpenSpec slash commands for Qoder AI assistant.
 * Creates three workflow commands: proposal, apply, and archive.
 * Uses colon-separated command format (/openspec:proposal).
 *
 * @extends {SlashCommandConfigurator}
 */
export class QoderSlashCommandConfigurator extends SlashCommandConfigurator {
    /** Unique identifier for Qoder tool */
    toolId = 'qoder';
    /** Indicates slash commands are available for this tool */
    isAvailable = true;
    /**
     * Get relative file path for a slash command
     *
     * @param {SlashCommandId} id - Command identifier (proposal, apply, or archive)
     * @returns {string} Relative path from project root to command file
     */
    getRelativePath(id) {
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
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
}
//# sourceMappingURL=qoder.js.map