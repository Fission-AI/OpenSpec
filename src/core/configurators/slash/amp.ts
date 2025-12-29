import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
import { getSkillBody, getSkillMetadata, SkillId } from '../../templates/skill-templates.js';

/**
 * AmpSlashCommandConfigurator generates Amp "skills" for OpenSpec workflows.
 *
 * Amp uses Skills (not slash commands) located in .agents/skills/<skill-name>/SKILL.md.
 * Each skill file contains YAML frontmatter with `name` and `description` fields,
 * followed by the OpenSpec workflow instructions wrapped in managed markers.
 *
 * Despite extending SlashCommandConfigurator (a historical naming choice),
 * this configurator generates Amp-native skill files that Amp discovers and
 * presents to users as available skills.
 */

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.agents/skills/openspec-proposal/SKILL.md',
  apply: '.agents/skills/openspec-apply/SKILL.md',
  archive: '.agents/skills/openspec-archive/SKILL.md'
};

export class AmpSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'amp';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string | undefined {
    const metadata = getSkillMetadata(id as SkillId);
    return `---\nname: ${metadata.name}\ndescription: ${metadata.description}\n---`;
  }

  protected getBody(id: SlashCommandId): string {
    return getSkillBody(id as SkillId).trim();
  }
}
