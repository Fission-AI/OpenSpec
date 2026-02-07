import { TomlSlashCommandConfigurator } from './toml-base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.gemini/commands/lightspec/proposal.toml',
  apply: '.gemini/commands/lightspec/apply.toml',
  archive: '.gemini/commands/lightspec/archive.toml'
};

const DESCRIPTIONS: Record<SlashCommandId, string> = {
  proposal: 'Scaffold a new LightSpec change and validate strictly.',
  apply: 'Implement an approved LightSpec change and keep tasks in sync.',
  archive: 'Archive a deployed LightSpec change and update specs.'
};

export class GeminiSlashCommandConfigurator extends TomlSlashCommandConfigurator {
  readonly toolId = 'gemini';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getDescription(id: SlashCommandId): string {
    return DESCRIPTIONS[id];
  }
}
