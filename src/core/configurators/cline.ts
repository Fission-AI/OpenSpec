import path from 'path';
import { ToolConfigurator } from './base.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { OPENSPEC_MARKERS } from '../config.js';

export class ClineConfigurator implements ToolConfigurator {
  name = 'Cline';
  configFileName = '.clinerules/AGENTS.md';
  isAvailable = true;

  async configure(projectPath: string, openspecDir: string): Promise<void> {
    const filePath = path.join(projectPath, this.configFileName);
    const content = TemplateManager.getAgentsStandardTemplate();

    await FileSystemUtils.updateFileWithMarkers(
      filePath,
      content,
      OPENSPEC_MARKERS.start,
      OPENSPEC_MARKERS.end
    );

    // When Cline is selected, remove the root AGENTS.md since we want it in .clinerules
    const rootAgentsPath = path.join(projectPath, 'AGENTS.md');
    if (await FileSystemUtils.fileExists(rootAgentsPath)) {
      await FileSystemUtils.deleteFile(rootAgentsPath);
    }
  }
}
