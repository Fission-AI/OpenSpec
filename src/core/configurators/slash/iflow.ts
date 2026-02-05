import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.iflow/commands/openspec-proposal.md',
  apply: '.iflow/commands/openspec-apply.md',
  archive: '.iflow/commands/openspec-archive.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: /openspec-proposal
id: openspec-proposal
category: LightSpec
description: Scaffold a new LightSpec change and validate strictly.
---`,
  apply: `---
name: /openspec-apply
id: openspec-apply
category: LightSpec
description: Implement an approved LightSpec change and keep tasks in sync.
---`,
  archive: `---
name: /openspec-archive
id: openspec-archive
category: LightSpec
description: Archive a deployed LightSpec change and update specs.
---`
};

export class IflowSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'iflow';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
