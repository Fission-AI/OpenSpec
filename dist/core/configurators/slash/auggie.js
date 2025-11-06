import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.augment/commands/openspec-proposal.md',
    apply: '.augment/commands/openspec-apply.md',
    archive: '.augment/commands/openspec-archive.md'
};
const FRONTMATTER = {
    proposal: `---
description: Scaffold a new OpenSpec change and validate strictly.
argument-hint: feature description or request
---`,
    apply: `---
description: Implement an approved OpenSpec change and keep tasks in sync.
argument-hint: change-id
---`,
    archive: `---
description: Archive a deployed OpenSpec change and update specs.
argument-hint: change-id
---`
};
export class AuggieSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'auggie';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
}
//# sourceMappingURL=auggie.js.map