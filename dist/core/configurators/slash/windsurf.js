import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.windsurf/workflows/openspec-proposal.md',
    apply: '.windsurf/workflows/openspec-apply.md',
    archive: '.windsurf/workflows/openspec-archive.md'
};
export class WindsurfSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'windsurf';
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
        return `---\ndescription: ${description}\nauto_execution_mode: 3\n---`;
    }
}
//# sourceMappingURL=windsurf.js.map