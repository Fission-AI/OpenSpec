import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS = {
  proposal: '.cospec/openspec/commands/openspec-proposal.md',
  apply: '.cospec/openspec/commands/openspec-apply.md',
  archive: '.cospec/openspec/commands/openspec-archive.md',
} as const satisfies Record<SlashCommandId, string>;

const FRONTMATTER = {
  proposal: `---
description: "Scaffold a new OpenSpec change and validate strictly."
argument-hint: feature description or request
---`,
  apply: `---
description: "Implement an approved OpenSpec change and keep tasks in sync."
argument-hint: change-id
---`,
  archive: `---
description: "Archive a deployed OpenSpec change and update specs."
argument-hint: change-id
---`
} as const satisfies Record<SlashCommandId, string>;

export class CostrictSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'costrict';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string | undefined {
    return FRONTMATTER[id];
  }
}