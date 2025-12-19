import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.github/prompts/openspec-proposal.prompt.md',
  apply: '.github/prompts/openspec-apply.prompt.md',
  refine: '.github/prompts/openspec-refine.prompt.md',
  archive: '.github/prompts/openspec-archive.prompt.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
description: Scaffold a new OpenSpec change and validate strictly.
---

$ARGUMENTS`,
  apply: `---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

$ARGUMENTS`,
  refine: `---
description: Refine an approved OpenSpec change without editing code.
---

$ARGUMENTS`,
  archive: `---
description: Archive a deployed OpenSpec change and update specs.
---

$ARGUMENTS`
};

export class GitHubCopilotSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'github-copilot';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
