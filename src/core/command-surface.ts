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

  if (toolId === 'codex' || toolId === 'warp') {
    return 'skills-invocable';
  }

  return 'none';
}

/**
 * OpenSpec 2.0 installs skills only. Generated command files are gone for
 * every tool and every `delivery` setting, which older configs may still
 * hold; it is read but no longer changes what is installed. The command
 * adapters stay, so cleanup can find the files earlier releases wrote.
 */
export function shouldGenerateSkillsForTool(_toolId: string, _delivery: Delivery): boolean {
  return true;
}

/** Skills are never removed for a delivery setting: they are all there is. */
export function shouldRemoveSkillsForTool(_toolId: string, _delivery: Delivery): boolean {
  return false;
}

/** No tool gets command files in 2.0. */
export function shouldGenerateCommandsForTool(_toolId: string, _delivery: Delivery): boolean {
  return false;
}

/**
 * Every tool that had command files has the ones OpenSpec generated removed.
 * Edited ones are kept and listed (see `reconcileCommandFiles`).
 */
export function shouldReconcileCommandFilesForTool(toolId: string, _delivery: Delivery): boolean {
  return resolveCommandSurfaceCapability(toolId) === 'adapter-backed';
}
