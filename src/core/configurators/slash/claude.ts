import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.claude/commands/lightspec/proposal.md',
  apply: '.claude/commands/lightspec/apply.md',
  archive: '.claude/commands/lightspec/archive.md',
  'context-check': '.claude/commands/lightspec/context-check.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: LightSpec: Proposal
description: Scaffold a new LightSpec change and validate strictly.
category: LightSpec
tags: [lightspec, change]
---`,
  apply: `---
name: LightSpec: Apply
description: Implement an approved LightSpec change and keep tasks in sync.
category: LightSpec
tags: [lightspec, apply]
---`,
  archive: `---
name: LightSpec: Archive
description: Archive a deployed LightSpec change and update specs.
category: LightSpec
tags: [lightspec, archive]
---`,
  'context-check': `---
name: LightSpec: Context Check
description: Validate project context in agent instruction files and help populate missing information.
category: LightSpec
tags: [lightspec, context, validation]
---`
};

export class ClaudeSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'claude';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
