import { ToolConfigurator } from './base.js';
import { ClaudeConfigurator } from './claude.js';
import { ClineConfigurator } from './cline.js';
import { CodeBuddyConfigurator } from './codebuddy.js';
import { CostrictConfigurator } from './costrict.js';
import { QoderConfigurator } from './qoder.js';
import { IflowConfigurator } from './iflow.js';
import { AgentsStandardConfigurator } from './agents.js';
import { QwenConfigurator } from './qwen.js';

export class ToolRegistry {
  private static tools: Map<string, ToolConfigurator> = new Map();

  static {
    const claudeConfigurator = new ClaudeConfigurator();
    const clineConfigurator = new ClineConfigurator();
    const codeBuddyConfigurator = new CodeBuddyConfigurator();
    const costrictConfigurator = new CostrictConfigurator();
    const qoderConfigurator = new QoderConfigurator();
    const iflowConfigurator = new IflowConfigurator();
    const agentsConfigurator = new AgentsStandardConfigurator();
    const qwenConfigurator = new QwenConfigurator();
    // Register with the ID that matches the checkbox value
    this.tools.set('claude', claudeConfigurator);
    this.tools.set('cline', clineConfigurator);
    this.tools.set('codebuddy', codeBuddyConfigurator);
    this.tools.set('costrict', costrictConfigurator);
    this.tools.set('qoder', qoderConfigurator);
    this.tools.set('iflow', iflowConfigurator);
    this.tools.set('agents', agentsConfigurator);
    this.tools.set('qwen', qwenConfigurator);
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
