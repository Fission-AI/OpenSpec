import path from 'path';
import { ToolConfigurator } from './base.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { LIGHTSPEC_MARKERS } from '../config.js';

export class CodeBuddyConfigurator implements ToolConfigurator {
  name = 'CodeBuddy';
  configFileName = 'CODEBUDDY.md';
  isAvailable = true;

  async configure(projectPath: string, lightspecDir: string): Promise<void> {
    const filePath = path.join(projectPath, this.configFileName);
    const content = TemplateManager.getClaudeTemplate();
    
    await FileSystemUtils.updateFileWithMarkers(
      filePath,
      content,
      LIGHTSPEC_MARKERS.start,
      LIGHTSPEC_MARKERS.end
    );
  }
}

