import { ToolConfigurator } from './base.js';
import { ClaudeConfigurator } from './claude.js';
import { ClineConfigurator } from './cline.js';
import { CodeBuddyConfigurator } from './codebuddy.js';
import { AgentsStandardConfigurator } from './agents.js';

export class ToolRegistry {
  private static tools: Map<string, ToolConfigurator> = new Map();

  static {
    const claudeConfigurator = new ClaudeConfigurator();
    const clineConfigurator = new ClineConfigurator();
    const codeBuddyConfigurator = new CodeBuddyConfigurator();
    const agentsConfigurator = new AgentsStandardConfigurator();
    // Register with the ID that matches the checkbox value
    this.tools.set('claude', claudeConfigurator);
    this.tools.set('cline', clineConfigurator);
    this.tools.set('codebuddy', codeBuddyConfigurator);
    this.tools.set('agents', agentsConfigurator);
  }

  static register(tool: ToolConfigurator): void {
    this.tools.set(tool.name.toLowerCase().replace(/\s+/g, '-'), tool);
  }

  static get(toolId: string): ToolConfigurator | undefined {
    return this.tools.get(toolId);
  }

  static getAll(): ToolConfigurator[] {
    return Array.from(this.tools.values());
  }

  static getAvailable(): ToolConfigurator[] {
    return this.getAll().filter(tool => tool.isAvailable);
  }
}
