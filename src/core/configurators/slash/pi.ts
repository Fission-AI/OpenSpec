import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.pi/prompts/openspec-proposal.md',
  apply: '.pi/prompts/openspec-apply.md',
  archive: '.pi/prompts/openspec-archive.md'
};

/*
 * Pi-coding-agent .pi/prompts format uses YAML frontmatter with description:
 * ---
 * description: description text
 * ---
 * Body...
 *
 * The filename becomes the command name, so openspec-proposal.md becomes /openspec-proposal.
 */
const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
description: Scaffold a new OpenSpec change and validate strictly.
---`,
  apply: `---
description: Implement an approved OpenSpec change and keep tasks in sync.
---`,
  archive: `---
description: Archive a deployed OpenSpec change and update specs.
---`
};

export class PiSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'pi';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string {
    return FRONTMATTER[id];
  }
}
