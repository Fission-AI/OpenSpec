import { CommandAdapterRegistry } from './command-generation/index.js';
import { getInvocationForAdapter, type CommandInvocation } from './command-generation/invocation.js';

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
 *
 * Every tool that had command files has the ones OpenSpec generated removed.
 * Edited ones are kept and listed (see `reconcileCommandFiles`).
 */
export function shouldReconcileCommandFilesForTool(toolId: string): boolean {
  return resolveCommandSurfaceCapability(toolId) === 'adapter-backed';
}
