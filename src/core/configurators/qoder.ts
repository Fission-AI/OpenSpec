import path from 'path';
import { ToolConfigurator } from './base.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { OPENSPEC_MARKERS } from '../config.js';

/**
 * Qoder AI Tool Configurator
 * 
 * Configures OpenSpec integration for Qoder AI coding assistant.
 * Creates and manages QODER.md configuration file with OpenSpec instructions.
 * 
 * @implements {ToolConfigurator}
 */
export class QoderConfigurator implements ToolConfigurator {
  /** Display name for the Qoder tool */
  name = 'Qoder';
  
  /** Configuration file name at project root */
  configFileName = 'QODER.md';
  
  /** Indicates tool is available for configuration */
  isAvailable = true;

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
  async configure(projectPath: string, openspecDir: string): Promise<void> {
    // Construct full path to QODER.md at project root
    const filePath = path.join(projectPath, this.configFileName);
    
    // Get Claude-compatible instruction template
    // This ensures Qoder receives the same high-quality OpenSpec instructions
    const content = TemplateManager.getClaudeTemplate();
    
    // Write or update file with managed content between markers
    // This allows future updates to refresh instructions automatically
    await FileSystemUtils.updateFileWithMarkers(
      filePath,
      content,
      OPENSPEC_MARKERS.start,
      OPENSPEC_MARKERS.end
    );
  }
}
