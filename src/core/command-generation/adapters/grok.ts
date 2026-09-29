/**
 * Grok Command Adapter
 *
 * Formats commands for xAI's Grok Build CLI (`grok`).
 *
 * Grok has no separate "commands" subsystem: its skill loader also scans
 * `<vendor-dir>/commands/` and turns each Markdown file there into a slash
 * command. Two properties of that loader shape this adapter:
 *
 * - The scan is flat. `find_command_paths` reads `commands/` with a single
 *   `read_dir` and keeps only files, so a nested `commands/opsx/<id>.md`
 *   is silently ignored rather than namespaced. Commands must be written
 *   directly in `commands/`, which makes the filename the command name —
 *   the `flat` invocation style, `/opsx-<id>`.
 * - The name comes from frontmatter `name` when present and from the file
 *   stem otherwise, and either is normalized to `[a-z0-9-]`. `CommandContent`
 *   carries a display name ("OPSX: New"), not a command id, so emitting it
 *   would hand Grok a name to normalize instead of the stem OpenSpec
 *   controls. This adapter emits `description` only and lets the stem name
 *   the command, which keeps the generated name identical to the one
 *   advertised in skills, docs, and the getting-started hint.
 *
 * Grok also scans `.agents/`, `.claude/`, and `.cursor/` for skills and
 * commands. Nothing writes `.agents/commands/`, and Claude Code nests its
 * commands under `opsx/`, which the flat scan skips — but Cursor writes them
 * flat as `opsx-<id>.md`, and every one of those roots can hold an identical
 * `skills/openspec-<name>/SKILL.md`. So a project configured for Grok alongside
 * Cursor or Claude Code can present Grok with the same name from two roots.
 * The copies differ only in the frontmatter each tool needs, so whichever one
 * Grok resolves to runs the same workflow. OpenSpec writes `.grok/`
 * unconditionally rather than trying to predict that resolution: the user may
 * drop the other tool at any time, and a missing `.grok/` tree would then
 * leave Grok with nothing.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * Grok adapter for command generation.
 * File path: .grok/commands/opsx-<id>.md
 * Frontmatter: description
 */
export const grokAdapter: ToolCommandAdapter = {
  toolId: 'grok',

  getFilePath(commandId: string): string {
    return path.join('.grok', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
