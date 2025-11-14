import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.factory/commands/openspec-proposal.md',
    apply: '.factory/commands/openspec-apply.md',
    archive: '.factory/commands/openspec-archive.md'
};
const FRONTMATTER = {
    proposal: `---
description: Scaffold a new OpenSpec change and validate strictly.
argument-hint: request or feature description
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
export class FactorySlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'factory';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
    getBody(id) {
        const baseBody = super.getBody(id);
        return `${baseBody}\n\n$ARGUMENTS`;
    }
}
//# sourceMappingURL=factory.js.map