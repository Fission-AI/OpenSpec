import { FileSystemUtils } from '../../../utils/file-system.js';
import { TemplateManager } from '../../templates/index.js';
import { OPENSPEC_MARKERS } from '../../config.js';
const ALL_COMMANDS = ['proposal', 'apply', 'archive'];
export class SlashCommandConfigurator {
    getTargets() {
        return ALL_COMMANDS.map((id) => ({
            id,
            path: this.getRelativePath(id),
            kind: 'slash'
        }));
    }
    async generateAll(projectPath, _openspecDir) {
        const createdOrUpdated = [];
        for (const target of this.getTargets()) {
            const body = this.getBody(target.id);
            const filePath = FileSystemUtils.joinPath(projectPath, target.path);
            if (await FileSystemUtils.fileExists(filePath)) {
                await this.updateBody(filePath, body);
            }
            else {
                const frontmatter = this.getFrontmatter(target.id);
                const sections = [];
                if (frontmatter) {
                    sections.push(frontmatter.trim());
                }
                sections.push(`${OPENSPEC_MARKERS.start}\n${body}\n${OPENSPEC_MARKERS.end}`);
                const content = sections.join('\n') + '\n';
                await FileSystemUtils.writeFile(filePath, content);
            }
            createdOrUpdated.push(target.path);
        }
        return createdOrUpdated;
    }
    async updateExisting(projectPath, _openspecDir) {
        const updated = [];
        for (const target of this.getTargets()) {
            const filePath = FileSystemUtils.joinPath(projectPath, target.path);
            if (await FileSystemUtils.fileExists(filePath)) {
                const body = this.getBody(target.id);
                await this.updateBody(filePath, body);
                updated.push(target.path);
            }
        }
        return updated;
    }
    getBody(id) {
        return TemplateManager.getSlashCommandBody(id).trim();
    }
    // Resolve absolute path for a given slash command target. Subclasses may override
    // to redirect to tool-specific locations (e.g., global directories).
    resolveAbsolutePath(projectPath, id) {
        const rel = this.getRelativePath(id);
        return FileSystemUtils.joinPath(projectPath, rel);
    }
    async updateBody(filePath, body) {
        const content = await FileSystemUtils.readFile(filePath);
        const startIndex = content.indexOf(OPENSPEC_MARKERS.start);
        const endIndex = content.indexOf(OPENSPEC_MARKERS.end);
        if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
            throw new Error(`Missing OpenSpec markers in ${filePath}`);
        }
        const before = content.slice(0, startIndex + OPENSPEC_MARKERS.start.length);
        const after = content.slice(endIndex);
        const updatedContent = `${before}\n${body}\n${after}`;
        await FileSystemUtils.writeFile(filePath, updatedContent);
    }
}
//# sourceMappingURL=base.js.map