import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.clinerules/openspec-proposal.md',
    apply: '.clinerules/openspec-apply.md',
    archive: '.clinerules/openspec-archive.md'
};
export class ClineSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'cline';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        const descriptions = {
            proposal: 'Scaffold a new OpenSpec change and validate strictly.',
            apply: 'Implement an approved OpenSpec change and keep tasks in sync.',
            archive: 'Archive a deployed OpenSpec change and update specs.'
        };
        const description = descriptions[id];
        return `# OpenSpec: ${id.charAt(0).toUpperCase() + id.slice(1)}\n\n${description}`;
    }
}
//# sourceMappingURL=cline.js.map