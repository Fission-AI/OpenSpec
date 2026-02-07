import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS = {
  proposal: '.cospec/lightspec/commands/lightspec-proposal.md',
  apply: '.cospec/lightspec/commands/lightspec-apply.md',
  archive: '.cospec/lightspec/commands/lightspec-archive.md',
} as const satisfies Record<SlashCommandId, string>;

const FRONTMATTER = {
  proposal: `---
description: "Scaffold a new LightSpec change and validate strictly."
argument-hint: feature description or request
---`,
  apply: `---
description: "Implement an approved LightSpec change and keep tasks in sync."
argument-hint: change-id
---`,
  archive: `---
description: "Archive a deployed LightSpec change and update specs."
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