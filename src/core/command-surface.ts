import { CommandAdapterRegistry } from './command-generation/index.js';
import { getInvocationForAdapter, type CommandInvocation } from './command-generation/invocation.js';
import type { Delivery } from './global-config.js';

export type CommandSurfaceCapability = 'adapter-backed' | 'skills-invocable' | 'none';

/**
 * How the tool spells its OpenSpec commands: the name from the command files
 * its adapter writes, the prefix the adapter declares. Returns undefined for
 * tools with no command adapter, which have no command names to spell.
 */
export function resolveCommandInvocation(toolId: string): CommandInvocation | undefined {
  const adapter = CommandAdapterRegistry.get(toolId);
  return adapter ? getInvocationForAdapter(adapter) : undefined;
}

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
