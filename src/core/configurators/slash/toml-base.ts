import { SlashCommandConfigurator } from './base.js';

export abstract class TomlSlashCommandConfigurator extends SlashCommandConfigurator {
  // Kept as a compatibility layer for configurators that historically produced TOML.
  // Skill installation now uses standard SKILL.md files for all providers.
}
