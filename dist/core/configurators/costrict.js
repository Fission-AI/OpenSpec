import path from 'path';
import { FileSystemUtils } from '../../utils/file-system.js';
import { TemplateManager } from '../templates/index.js';
import { OPENSPEC_MARKERS } from '../config.js';
export class CostrictConfigurator {
    name = 'CoStrict';
    configFileName = 'COSTRICT.md';
    isAvailable = true;
    async configure(projectPath, openspecDir) {
        const filePath = path.join(projectPath, this.configFileName);
        const content = TemplateManager.getCostrictTemplate();
        await FileSystemUtils.updateFileWithMarkers(filePath, content, OPENSPEC_MARKERS.start, OPENSPEC_MARKERS.end);
    }
}
//# sourceMappingURL=costrict.js.map