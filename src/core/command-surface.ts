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
 * The notice `openspec update` prints while delivery gives a tool command files,
 * which are deprecated in favor of skills. It is shown only for a tool that
 * switching to skills-only delivery would change: one that gets command files
 * now and would not under `skills`. A skills-only project is never told about a
 * change that does not affect it, and a tool that keeps its commands under
 * every delivery is never advised to switch away from its only working surface.
 *
 * OpenSpec 2.0 stops generating command files under every delivery setting,
 * so the notice offers no way to keep them: only the switch, which removes
 * just the files OpenSpec generated and keeps any the user edited.
 */
export function formatCommandDeprecationNotice(
  toolIds: readonly string[],
  delivery: Delivery
): string[] {
  const switchingChangesSomething = toolIds.some(
    (toolId) =>
      shouldGenerateCommandsForTool(toolId, delivery) &&
      !shouldGenerateCommandsForTool(toolId, 'skills')
  );
  if (!switchingChangesSomething) {
    return [];
  }

  return [
    'Command files are deprecated and go away in OpenSpec 2.0. Your OpenSpec skills stay and do the same work.',
    '  Switch now: openspec config set delivery skills && openspec update',
    '  This removes only the command files OpenSpec generated; any you edited are kept and listed.',
    `  Details: ${COMMAND_DEPRECATION_URL}`,
  ];
}
