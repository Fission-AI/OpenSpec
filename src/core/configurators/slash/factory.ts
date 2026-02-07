import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.factory/commands/lightspec-proposal.md',
  apply: '.factory/commands/lightspec-apply.md',
  archive: '.factory/commands/lightspec-archive.md',
  'context-check': '.factory/commands/lightspec-context-check.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
description: Scaffold a new LightSpec change and validate strictly.
argument-hint: request or feature description
---`,
  apply: `---
description: Implement an approved LightSpec change and keep tasks in sync.
argument-hint: change-id
---`,
  archive: `---
description: Archive a deployed LightSpec change and update specs.
argument-hint: change-id
---`,
  'context-check': `---
name: LightSpec: Context Check
description: Validate project context in agent instruction files and help populate missing information.
category: LightSpec
tags: [lightspec, context, validation]
---`
};

export class FactorySlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'factory';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }

  protected getBody(id: SlashCommandId): string {
    const baseBody = super.getBody(id);
    return `${baseBody}\n\n$ARGUMENTS`;
  }
}
