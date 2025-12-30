import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId, TemplateManager } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.continue/prompts/openspec-proposal.prompt',
  apply: '.continue/prompts/openspec-apply.prompt',
  archive: '.continue/prompts/openspec-archive.prompt'
};

/*
 * Continue .prompt format:
 * name: commandName
 * description: description
 * ---
 * Body...
 * 
 * Note: We use 'openspec-proposal' as the name so the command becomes /openspec-proposal
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `name: openspec-proposal
description: Scaffold a new OpenSpec change and validate strictly.
---`,
  apply: `name: openspec-apply
description: Implement an approved OpenSpec change and keep tasks in sync.
---`,
  archive: `name: openspec-archive
description: Archive a deployed OpenSpec change and update specs.
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
