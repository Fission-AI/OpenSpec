import path from "path";
import { ToolConfigurator } from "./base.js";
import { FileSystemUtils } from "../../utils/file-system.js";
import { TemplateManager } from "../templates/index.js";
import { OPENSPEC_MARKERS } from "../config.js";

export class IflowConfigurator implements ToolConfigurator {
  name = "iFlow";
  configFileName = "IFLOW.md";
  isAvailable = true;

  async configure(projectPath: string, openspecDir: string): Promise<void> {
    const filePath = path.join(projectPath, this.configFileName);
    const content = TemplateManager.getClaudeTemplate();

    await FileSystemUtils.updateFileWithMarkers(
      filePath,
      content,
      OPENSPEC_MARKERS.start,
      OPENSPEC_MARKERS.end
    );
  }
}
