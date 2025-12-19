import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.amazonq/prompts/openspec-proposal.md',
  apply: '.amazonq/prompts/openspec-apply.md',
  refine: '.amazonq/prompts/openspec-refine.md',
  archive: '.amazonq/prompts/openspec-archive.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
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
  refine: `---
description: Refine an approved OpenSpec change without editing code.
---

The user wants to refine an OpenSpec change. Use the change ID and adjustment request below to update proposal details and spec deltas without editing code.

<UserRequest>
  $ARGUMENTS
</UserRequest>`,
  archive: `---
description: Archive a deployed OpenSpec change and update specs.
---

The user wants to archive the following deployed change. Use the openspec instructions to archive the change and update specs.

<ChangeId>
  $ARGUMENTS
</ChangeId>`
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
