import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.cursor/commands/lightspec-proposal.md',
  apply: '.cursor/commands/lightspec-apply.md',
  archive: '.cursor/commands/lightspec-archive.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: /lightspec-proposal
id: lightspec-proposal
category: LightSpec
description: Scaffold a new LightSpec change and validate strictly.
---`,
  apply: `---
name: /lightspec-apply
id: lightspec-apply
category: LightSpec
description: Implement an approved LightSpec change and keep tasks in sync.
---`,
  archive: `---
name: /lightspec-archive
id: lightspec-archive
category: LightSpec
description: Archive a deployed LightSpec change and update specs.
---`
};

export class CursorSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'cursor';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
