import { SlashCommandConfigurator } from "./base.js";

export class CodexSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = "codex";
  readonly isAvailable = true;
}
