import { ToolConfigurator } from './base.js';
/**
 * Qoder AI Tool Configurator
 *
 * Configures OpenSpec integration for Qoder AI coding assistant.
 * Creates and manages QODER.md configuration file with OpenSpec instructions.
 *
 * @implements {ToolConfigurator}
 */
export declare class QoderConfigurator implements ToolConfigurator {
    /** Display name for the Qoder tool */
    name: string;
    /** Configuration file name at project root */
    configFileName: string;
    /** Indicates tool is available for configuration */
    isAvailable: boolean;
    /**
     * Configure Qoder integration for a project
     *
     * Creates or updates QODER.md file with OpenSpec instructions.
     * Uses Claude-compatible template for instruction content.
     * Wrapped with OpenSpec markers for future updates.
     *
     * @param {string} projectPath - Absolute path to project root directory
     * @param {string} openspecDir - Path to openspec directory (unused but required by interface)
     * @returns {Promise<void>} Resolves when configuration is complete
     */
    configure(projectPath: string, openspecDir: string): Promise<void>;
}
//# sourceMappingURL=qoder.d.ts.map