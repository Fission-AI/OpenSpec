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
 * Tools that load OpenSpec workflows only as command files, because nothing
 * they run reads a SKILL.md folder. Amazon Q Developer reads its prompts from
 * `.amazonq/prompts` but no skills directory, and AWS is retiring it in favor
 * of Kiro. Such a tool keeps its commands under every delivery setting: skills
 * alone would leave it with no way to start a workflow.
 */
const COMMANDS_ONLY_TOOLS: ReadonlySet<string> = new Set(['amazon-q']);

export function isCommandsOnlyTool(toolId: string): boolean {
  return COMMANDS_ONLY_TOOLS.has(toolId);
}

export function shouldGenerateSkillsForTool(toolId: string, delivery: Delivery): boolean {
  if (isCommandsOnlyTool(toolId)) return false;
  return delivery !== 'commands' || resolveCommandSurfaceCapability(toolId) === 'skills-invocable';
}

export function shouldRemoveSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return delivery === 'commands' && resolveCommandSurfaceCapability(toolId) !== 'skills-invocable';
}

export function shouldGenerateCommandsForTool(toolId: string, delivery: Delivery): boolean {
  return (
    resolveCommandSurfaceCapability(toolId) === 'adapter-backed' &&
    (delivery !== 'skills' || isCommandsOnlyTool(toolId))
  );
}

export function shouldReconcileCommandFilesForTool(toolId: string, delivery: Delivery): boolean {
  return (
    delivery === 'skills' &&
    resolveCommandSurfaceCapability(toolId) === 'adapter-backed' &&
    !isCommandsOnlyTool(toolId)
  );
}
