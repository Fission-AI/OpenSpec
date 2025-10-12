import { SlashCommandConfigurator } from './base.js';
import { ClaudeSlashCommandConfigurator } from './claude.js';
import { CursorSlashCommandConfigurator } from './cursor.js';
import { WindsurfSlashCommandConfigurator } from './windsurf.js';
import { KiloCodeSlashCommandConfigurator } from './kilocode.js';
import { OpenCodeSlashCommandConfigurator } from './opencode.js';
import { CodexSlashCommandConfigurator } from './codex.js';
import { GitHubCopilotSlashCommandConfigurator } from './github-copilot.js';
import { AmazonQSlashCommandConfigurator } from './amazon-q.js';

export class SlashCommandRegistry {
  private static configurators: Map<string, SlashCommandConfigurator> = new Map();

  static {
    const claude = new ClaudeSlashCommandConfigurator();
    const cursor = new CursorSlashCommandConfigurator();
    const windsurf = new WindsurfSlashCommandConfigurator();
    const kilocode = new KiloCodeSlashCommandConfigurator();
    const opencode = new OpenCodeSlashCommandConfigurator();
    const codex = new CodexSlashCommandConfigurator();
    const githubCopilot = new GitHubCopilotSlashCommandConfigurator();
    const amazonQ = new AmazonQSlashCommandConfigurator();

    this.configurators.set(claude.toolId, claude);
    this.configurators.set(cursor.toolId, cursor);
    this.configurators.set(windsurf.toolId, windsurf);
    this.configurators.set(kilocode.toolId, kilocode);
    this.configurators.set(opencode.toolId, opencode);
    this.configurators.set(codex.toolId, codex);
    this.configurators.set(githubCopilot.toolId, githubCopilot);
    this.configurators.set(amazonQ.toolId, amazonQ);
  }

  static register(configurator: SlashCommandConfigurator): void {
    this.configurators.set(configurator.toolId, configurator);
  }

  static get(toolId: string): SlashCommandConfigurator | undefined {
    return this.configurators.get(toolId);
  }

  static getAll(): SlashCommandConfigurator[] {
    return Array.from(this.configurators.values());
  }
}
