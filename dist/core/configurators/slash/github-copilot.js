import { SlashCommandConfigurator } from './base.js';
const FILE_PATHS = {
    proposal: '.github/prompts/openspec-proposal.prompt.md',
    apply: '.github/prompts/openspec-apply.prompt.md',
    archive: '.github/prompts/openspec-archive.prompt.md'
};
const FRONTMATTER = {
    proposal: `---
description: Scaffold a new OpenSpec change and validate strictly.
---

$ARGUMENTS`,
    apply: `---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

$ARGUMENTS`,
    archive: `---
description: Archive a deployed OpenSpec change and update specs.
---

$ARGUMENTS`
};
export class GitHubCopilotSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = 'github-copilot';
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
}
//# sourceMappingURL=github-copilot.js.map