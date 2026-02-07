import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.github/prompts/lightspec-proposal.prompt.md',
  apply: '.github/prompts/lightspec-apply.prompt.md',
  archive: '.github/prompts/lightspec-archive.prompt.md',
  'context-check': '.github/copilot/prompts/lightspec-context-check.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
description: Scaffold a new LightSpec change and validate strictly.
---

$ARGUMENTS`,
  apply: `---
description: Implement an approved LightSpec change and keep tasks in sync.
---

$ARGUMENTS`,
  archive: `---
description: Archive a deployed LightSpec change and update specs.
---

$ARGUMENTS`,
  'context-check': `---
description: Validate project context in agent instruction files and help populate missing information.
---`
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
