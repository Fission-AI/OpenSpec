/**
 * Command Invocation Styles
 *
 * How a tool spells an OpenSpec slash command is decided by the file the
 * adapter writes, not by a list maintained by hand:
 *
 * - `.../commands/opsx/<id>.md` — the directory namespaces the command, so the
 *   tool registers `/opsx:<id>` (Claude Code, Gemini, Crush, ...).
 * - `.../commands/opsx-<id>.md` — the filename *is* the command name, so the
 *   tool registers `/opsx-<id>` (Cursor, GitHub Copilot, OpenCode, ...).
 *
 * Deriving the style from `getFilePath` keeps generated cross-references and
 * onboarding hints in step with the files OpenSpec actually writes. A
 * hand-maintained list drifted before: only OpenCode was rewritten when the
 * hyphen form was introduced (#727), and Cursor still advertised `/opsx:`
 * commands its palette never registered (#1307).
 */

import path from 'path';
import type { ToolCommandAdapter } from './types.js';

export type CommandInvocationStyle = 'namespaced' | 'flat';

/**
 * Classifies a generated command file by the name the tool will answer to.
 *
 * The test is the filename, not the directory: an `opsx-` prefix means the
 * filename is the command. Every other shape is treated as namespaced, which
 * is what all seven `opsx/<id>.*` adapters need. An adapter that neither
 * prefixes the filename nor nests under `opsx/` would land here too — none
 * does, and the registry-wide test in invocation.test.ts fails if one appears.
 *
 * @param commandFilePath - Path returned by an adapter's `getFilePath`
 * @returns 'flat' when the filename carries the `opsx-` prefix, otherwise
 *          'namespaced'
 */
export function getInvocationStyleForPath(commandFilePath: string): CommandInvocationStyle {
  return path.basename(commandFilePath).startsWith('opsx-') ? 'flat' : 'namespaced';
}

/**
 * Classifies an adapter by the command files it writes.
 *
 * @param adapter - The tool-specific command adapter
 * @returns The invocation style the tool's command files produce
 */
export function getInvocationStyleForAdapter(adapter: ToolCommandAdapter): CommandInvocationStyle {
  // Any command id works: every adapter applies one naming rule to all of them.
  return getInvocationStyleForPath(adapter.getFilePath('explore'));
}
