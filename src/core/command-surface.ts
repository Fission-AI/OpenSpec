import { CommandAdapterRegistry } from './command-generation/index.js';
import type { Delivery } from './global-config.js';

export type CommandSurfaceCapability = 'adapter-backed' | 'skills-invocable' | 'none';

export function resolveCommandSurfaceCapability(toolId: string): CommandSurfaceCapability {
  if (CommandAdapterRegistry.has(toolId)) {
    return 'adapter-backed';
  }

  if (toolId === 'codex') {
    return 'skills-invocable';
  }

  return 'none';
}

export function shouldGenerateSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery !== 'commands' || resolveCommandSurfaceCapability(toolId) === 'skills-invocable';
}

export function shouldRemoveSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'commands' && resolveCommandSurfaceCapability(toolId) !== 'skills-invocable';
}

export function shouldGenerateCommandsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery !== 'skills' && resolveCommandSurfaceCapability(toolId) === 'adapter-backed';
}

export function shouldReconcileCommandFilesForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'skills' && resolveCommandSurfaceCapability(toolId) === 'adapter-backed';
}
