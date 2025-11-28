import path from 'path';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { OPENSPEC_MARKERS } from '../config.js';
export class AgentsStandardConfigurator {
    name = 'AGENTS.md standard';
    configFileName = 'AGENTS.md';
    isAvailable = true;
    async configure(projectPath, _openspecDir) {
        const filePath = path.join(projectPath, this.configFileName);
        const content = TemplateManager.getAgentsStandardTemplate();
        await FileSystemUtils.updateFileWithMarkers(filePath, content, OPENSPEC_MARKERS.start, OPENSPEC_MARKERS.end);
    }
}
//# sourceMappingURL=agents.js.map