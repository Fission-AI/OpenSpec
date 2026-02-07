import { SlashCommandConfigurator } from './base.js';

export class MistralVibeSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'mistral-vibe';
  readonly isAvailable = true;
}
