/**
 * IDE restart hint
 *
 * `init` and `update` decide this the same way — an IDE/editor-resident tool
 * actually received a generated surface — but said it differently. `init` names
 * what was generated ("the new commands" / "the new skills"); `update` fell back
 * to a generic "changes", so the same event read as two different outcomes
 * depending on which command produced it. One rule, one sentence, resolved here.
 */

import { AI_TOOLS } from '../config.js';
import {
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
} from '../command-surface.js';
import type { Delivery } from '../global-config.js';

/** The surface a restart hint names. Absent when no hint is due. */
export type IdeRestartSurface = 'commands' | 'skills';

function isIdeResident(toolId: string): boolean {
  return Boolean(
    AI_TOOLS.find((tool) => tool.value === toolId)?.requiresIdeRestart
  );
}

/**
 * Both conditions stay coupled to the SAME tool: its surfaces are loaded by a
 * long-running editor process (a CLI picks them up immediately, so a restart
 * line would be wrong for it — see #1067), and a surface was actually generated
 * for it under the active delivery. An IDE tool that generated nothing has
 * nothing a restart would pick up, even when a co-configured CLI tool did
 * generate. Commands win the wording when both were generated.
 */
export function resolveIdeRestartSurface(
  toolIds: readonly string[],
  delivery: Delivery
): IdeRestartSurface | null {
  const ideTools = [...new Set(toolIds)].filter(isIdeResident);

  if (ideTools.some((toolId) => shouldGenerateCommandsForTool(toolId, delivery))) {
    return 'commands';
  }

  if (ideTools.some((toolId) => shouldGenerateSkillsForTool(toolId, delivery))) {
    return 'skills';
  }

  return null;
}

/**
 * The restart line to print, or null when no restart is needed. Deliberately
 * not "slash commands": Amazon Q's generated files are prompt-library entries
 * invoked with `@`, so promising slash commands would be wrong for it.
 */
export function formatIdeRestart(
  toolIds: readonly string[],
  delivery: Delivery
): string | null {
  const surface = resolveIdeRestartSurface(toolIds, delivery);
  return surface
    ? `Restart your IDE for the new ${surface} to take effect.`
    : null;
}
