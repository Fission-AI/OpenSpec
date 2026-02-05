import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.crush/commands/openspec/proposal.md',
  apply: '.crush/commands/openspec/apply.md',
  archive: '.crush/commands/openspec/archive.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: LightSpec: Proposal
description: Scaffold a new LightSpec change and validate strictly.
category: LightSpec
tags: [openspec, change]
---`,
  apply: `---
name: LightSpec: Apply
description: Implement an approved LightSpec change and keep tasks in sync.
category: LightSpec
tags: [openspec, apply]
---`,
  archive: `---
name: LightSpec: Archive
description: Archive a deployed LightSpec change and update specs.
category: LightSpec
tags: [openspec, archive]
---`
};

export class CrushSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'crush';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}