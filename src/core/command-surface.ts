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

export const COMMAND_DEPRECATION_URL = 'https://github.com/Fission-AI/OpenSpec/issues/2022';

/**
 * The notice `openspec update` prints while it still generates command files,
 * which are deprecated in favor of skills. Returns no lines when none of the
 * given tools get command files under this delivery, so a skills-only project
 * is never told about a change that does not affect it.
 *
 * Worded "by default" so it holds both for users on the implicit default, whom
 * the next major moves to skills, and for users who set `delivery` explicitly,
 * whose setting the next major keeps.
 */
export function formatCommandDeprecationNotice(
  toolIds: readonly string[],
  delivery: Delivery
): string[] {
  if (!toolIds.some((toolId) => shouldGenerateCommandsForTool(toolId, delivery))) {
    return [];
  }

  return [
    'Command files are deprecated: the next major version of OpenSpec installs skills only by default.',
    '  Switch to skills now: openspec config set delivery skills && openspec update',
    '  Keep commands for now: openspec config set delivery both',
    `  Details: ${COMMAND_DEPRECATION_URL}`,
  ];
}
