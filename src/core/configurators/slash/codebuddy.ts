import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.codebuddy/commands/lightspec/proposal.md',
  apply: '.codebuddy/commands/lightspec/apply.md',
  archive: '.codebuddy/commands/lightspec/archive.md'
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: LightSpec: Proposal
description: "Scaffold a new LightSpec change and validate strictly."
argument-hint: "[feature description or request]"
---`,
  apply: `---
name: LightSpec: Apply
description: "Implement an approved LightSpec change and keep tasks in sync."
argument-hint: "[change-id]"
---`,
  archive: `---
name: LightSpec: Archive
description: "Archive a deployed LightSpec change and update specs."
argument-hint: "[change-id]"
---`
};

export class CodeBuddySlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'codebuddy';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}

