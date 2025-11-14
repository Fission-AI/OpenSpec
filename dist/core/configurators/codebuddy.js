import path from 'path';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { OPENSPEC_MARKERS } from '../config.js';
export class CodeBuddyConfigurator {
    name = 'CodeBuddy';
    configFileName = 'CODEBUDDY.md';
    isAvailable = true;
    async configure(projectPath, openspecDir) {
        const filePath = path.join(projectPath, this.configFileName);
        const content = TemplateManager.getClaudeTemplate();
        await FileSystemUtils.updateFileWithMarkers(filePath, content, OPENSPEC_MARKERS.start, OPENSPEC_MARKERS.end);
    }
}
//# sourceMappingURL=codebuddy.js.map