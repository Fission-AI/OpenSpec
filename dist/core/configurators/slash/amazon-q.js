import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.amazonq/prompts/openspec-proposal.md',
    apply: '.amazonq/prompts/openspec-apply.md',
    archive: '.amazonq/prompts/openspec-archive.md'
};
const FRONTMATTER = {
    proposal: `---
description: Scaffold a new OpenSpec change and validate strictly.
---

The user has requested the following change proposal. Use the openspec instructions to create their change proposal.

<UserRequest>
  $ARGUMENTS
</UserRequest>`,
    apply: `---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

The user wants to apply the following change. Use the openspec instructions to implement the approved change.

<ChangeId>
  $ARGUMENTS
</ChangeId>`,
    archive: `---
description: Archive a deployed OpenSpec change and update specs.
---

The user wants to archive the following deployed change. Use the openspec instructions to archive the change and update specs.

<ChangeId>
  $ARGUMENTS
</ChangeId>`
};
export class AmazonQSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'amazon-q';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
}
//# sourceMappingURL=amazon-q.js.map