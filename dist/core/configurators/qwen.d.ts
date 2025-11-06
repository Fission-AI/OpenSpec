import { ToolConfigurator } from './base.js';
/**
 * QwenConfigurator class provides integration with Qwen Code
 * by creating and managing the necessary configuration files.
 * Currently configures the QWEN.md file with OpenSpec instructions.
 */
export declare class QwenConfigurator implements ToolConfigurator {
    /** Display name for the Qwen Code tool */
    name: string;
    /** Configuration file name for Qwen Code */
    configFileName: string;
    /** Availability status for the Qwen Code tool */
    isAvailable: boolean;
    /**
     * Configures the Qwen Code integration by creating or updating the QWEN.md file
     * with OpenSpec instructions and markers.
     *
     * @param {string} projectPath - The path to the project root
     * @param {string} _openspecDir - The path to the openspec directory (unused)
     * @returns {Promise<void>} A promise that resolves when configuration is complete
     */
    configure(projectPath: string, _openspecDir: string): Promise<void>;
}
//# sourceMappingURL=qwen.d.ts.map