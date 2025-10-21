import { SlashCommandConfigurator } from './base.js';
import { ClaudeSlashCommandConfigurator } from './claude.js';
import { CodeBuddySlashCommandConfigurator } from './codebuddy.js';
import { CursorSlashCommandConfigurator } from './cursor.js';
import { WindsurfSlashCommandConfigurator } from './windsurf.js';
import { KiloCodeSlashCommandConfigurator } from './kilocode.js';
import { OpenCodeSlashCommandConfigurator } from './opencode.js';
import { CodexSlashCommandConfigurator } from './codex.js';
import { GitHubCopilotSlashCommandConfigurator } from './github-copilot.js';
import { AmazonQSlashCommandConfigurator } from './amazon-q.js';
import { FactorySlashCommandConfigurator } from './factory.js';
import { AuggieSlashCommandConfigurator } from './auggie.js';
import { ClineSlashCommandConfigurator } from './cline.js';
import { CrushSlashCommandConfigurator } from './crush.js';

export class SlashCommandRegistry {
  private static configurators: Map<string, SlashCommandConfigurator> = new Map();

  static {
    const claude = new ClaudeSlashCommandConfigurator();
    const codeBuddy = new CodeBuddySlashCommandConfigurator();
    const cursor = new CursorSlashCommandConfigurator();
    const windsurf = new WindsurfSlashCommandConfigurator();
    const kilocode = new KiloCodeSlashCommandConfigurator();
    const opencode = new OpenCodeSlashCommandConfigurator();
    const codex = new CodexSlashCommandConfigurator();
    const githubCopilot = new GitHubCopilotSlashCommandConfigurator();
    const amazonQ = new AmazonQSlashCommandConfigurator();
    const factory = new FactorySlashCommandConfigurator();
    const auggie = new AuggieSlashCommandConfigurator();
    const cline = new ClineSlashCommandConfigurator();
    const crush = new CrushSlashCommandConfigurator();

    this.configurators.set(claude.toolId, claude);
    this.configurators.set(codeBuddy.toolId, codeBuddy);
    this.configurators.set(cursor.toolId, cursor);
    this.configurators.set(windsurf.toolId, windsurf);
    this.configurators.set(kilocode.toolId, kilocode);
    this.configurators.set(opencode.toolId, opencode);
    this.configurators.set(codex.toolId, codex);
    this.configurators.set(githubCopilot.toolId, githubCopilot);
    this.configurators.set(amazonQ.toolId, amazonQ);
    this.configurators.set(factory.toolId, factory);
    this.configurators.set(auggie.toolId, auggie);
    this.configurators.set(cline.toolId, cline);
    this.configurators.set(crush.toolId, crush);
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
