import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.amazonq/prompts/lightspec-proposal.md',
  apply: '.amazonq/prompts/lightspec-apply.md',
  archive: '.amazonq/prompts/lightspec-archive.md',
  'context-check': '.aws/amazonq/commands/lightspec-context-check.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
description: Scaffold a new LightSpec change and validate strictly.
---

The user has requested the following change proposal. Use the lightspec instructions to create their change proposal.

<UserRequest>
  $ARGUMENTS
</UserRequest>`,
  apply: `---
description: Implement an approved LightSpec change and keep tasks in sync.
---

The user wants to apply the following change. Use the lightspec instructions to implement the approved change.

<ChangeId>
  $ARGUMENTS
</ChangeId>`,
  archive: `---
description: Archive a deployed LightSpec change and update specs.
---

The user wants to archive the following deployed change. Use the lightspec instructions to archive the change and update specs.

<ChangeId>
  $ARGUMENTS
</ChangeId>`,
  'context-check': `---
description: Validate project context in agent instruction files and help populate missing information.
---`
};

export class AmazonQSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'amazon-q';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}