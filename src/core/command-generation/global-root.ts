/**
 * Global Root Resolution
 *
 * Resolves the global installation root for a tool adapter,
 * respecting the OPENSPEC_GLOBAL_ROOT env var override.
 */

import path from 'path';
import type { ToolCommandAdapter } from './types.js';

/**
 * Resolves the global root path for a tool adapter.
 * If OPENSPEC_GLOBAL_ROOT is set, uses that as the base with the toolId as subdirectory.
 * Otherwise, falls back to the adapter's own getGlobalRoot().
 *
 * @param adapter - The tool command adapter
 * @returns Absolute path to the global root, or null if the tool has no global support
 */
export function resolveGlobalRoot(adapter: ToolCommandAdapter): string | null {
  const envOverride = process.env.OPENSPEC_GLOBAL_ROOT?.trim();
  if (envOverride) {
    return path.resolve(envOverride, adapter.toolId);
  }
  return adapter.getGlobalRoot?.() ?? null;
}
