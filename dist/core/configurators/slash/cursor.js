import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.cursor/commands/openspec-proposal.md',
    apply: '.cursor/commands/openspec-apply.md',
    archive: '.cursor/commands/openspec-archive.md'
};
const FRONTMATTER = {
    proposal: `---
name: /openspec-proposal
id: openspec-proposal
category: OpenSpec
description: Scaffold a new OpenSpec change and validate strictly.
---`,
    apply: `---
name: /openspec-apply
id: openspec-apply
category: OpenSpec
description: Implement an approved OpenSpec change and keep tasks in sync.
---`,
    archive: `---
name: /openspec-archive
id: openspec-archive
category: OpenSpec
description: Archive a deployed OpenSpec change and update specs.
---`
};
export class CursorSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'cursor';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
}
//# sourceMappingURL=cursor.js.map