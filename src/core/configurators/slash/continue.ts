import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.continue/prompts/lightspec-proposal.prompt',
  apply: '.continue/prompts/lightspec-apply.prompt',
  archive: '.continue/prompts/lightspec-archive.prompt'
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
 * We use 'lightspec-proposal' as the name so the command becomes /lightspec-proposal.
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
name: lightspec-proposal
description: Scaffold a new LightSpec change and validate strictly.
invokable: true
---`,
  apply: `---
name: lightspec-apply
description: Implement an approved LightSpec change and keep tasks in sync.
invokable: true
---`,
  archive: `---
name: lightspec-archive
description: Archive a deployed LightSpec change and update specs.
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
