import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.continue/prompts/openspec-proposal.prompt',
  apply: '.continue/prompts/openspec-apply.prompt',
  archive: '.continue/prompts/openspec-archive.prompt'
};

/*
 * Continue .prompt format requires YAML frontmatter:
 * ---
 * name: commandName
 * description: description
 * invokable: true
 * ---
 * Body...
 *
 * The 'invokable: true' field is required to make the prompt available as a slash command.
 * We use 'openspec-proposal' as the name so the command becomes /openspec-proposal.
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: openspec-proposal
description: Scaffold a new OpenSpec change and validate strictly.
invokable: true
---`,
  apply: `---
name: openspec-apply
description: Implement an approved OpenSpec change and keep tasks in sync.
invokable: true
---`,
  archive: `---
name: openspec-archive
description: Archive a deployed OpenSpec change and update specs.
invokable: true
---`
};

export class ContinueSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'continue';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
