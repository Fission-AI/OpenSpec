import {
  AGENT_SKILL_TOOL_IDS,
  AgentSkillConfigurator,
  SkillInstallLocation,
} from './base.js';

export class AgentSkillRegistry {
  private static configurators: Map<string, AgentSkillConfigurator> = new Map();

  static {
    for (const toolId of AGENT_SKILL_TOOL_IDS) {
      this.configurators.set(toolId, new AgentSkillConfigurator(toolId));
    }
  }

  static register(configurator: AgentSkillConfigurator): void {
    this.configurators.set(configurator.toolId, configurator);
  }

  static get(toolId: string): AgentSkillConfigurator | undefined {
    return this.configurators.get(toolId);
  }

  static getAll(): AgentSkillConfigurator[] {
    return Array.from(this.configurators.values());
  }

  static setInstallLocation(location: SkillInstallLocation): void {
    for (const configurator of this.configurators.values()) {
      configurator.setInstallLocation(location);
    }
  }
}
