import path from 'path';
import { ToolConfigurator } from './base.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { OPENSPEC_MARKERS } from '../config.js';

/**
 * Trae IDE 配置器
 * 在 .trae/rules/project_rules.md 文件中注入 OpenSpec 指令
 */
export class TraeConfigurator implements ToolConfigurator {
  name = 'Trae IDE';
  configFileName = '.trae/rules/project_rules.md';
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
  }
}