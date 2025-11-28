import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.codebuddy/commands/openspec/proposal.md',
    apply: '.codebuddy/commands/openspec/apply.md',
    archive: '.codebuddy/commands/openspec/archive.md'
};
const FRONTMATTER = {
    proposal: `---
name: OpenSpec: Proposal
description: Scaffold a new OpenSpec change and validate strictly.
category: OpenSpec
tags: [openspec, change]
---`,
    apply: `---
name: OpenSpec: Apply
description: Implement an approved OpenSpec change and keep tasks in sync.
category: OpenSpec
tags: [openspec, apply]
---`,
    archive: `---
name: OpenSpec: Archive
description: Archive a deployed OpenSpec change and update specs.
category: OpenSpec
tags: [openspec, archive]
---`
};
export class CodeBuddySlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'codebuddy';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
}
//# sourceMappingURL=codebuddy.js.map