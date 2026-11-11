/**
 * IDE restart hint
 *
 * Shared restart guidance for tools successfully configured by init or update.
 * The wording covers additions, updates, and removals, including an empty
 * workflow selection that removes every generated file.
 */

import { AI_TOOLS } from '../config.js';
import type { Delivery } from '../global-config.js';

/** The surface a restart hint names. Absent when no hint is due. */
export type IdeRestartSurface = 'commands' | 'skills';

function isIdeResident(toolId: string): boolean {
  return Boolean(
    AI_TOOLS.find((tool) => tool.value === toolId)?.requiresIdeRestart
  );
}

/**
 * A restart is due only for a tool whose skills are loaded by a long-running
 * editor process (a CLI picks them up immediately, so a restart line would be
 * wrong for it — see #1067). `delivery` no longer changes the answer: 2.0
 * installs skills only.
 */
export function resolveIdeRestartSurface(
  toolIds: readonly string[],
  _delivery: Delivery
): IdeRestartSurface | null {
  const ideTools = [...new Set(toolIds)].filter(isIdeResident);
  return ideTools.length > 0 ? 'skills' : null;
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
    ? `Restart your IDE to refresh ${surface}.`
    : null;
}
