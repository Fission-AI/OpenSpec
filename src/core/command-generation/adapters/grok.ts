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
 * Grok also reads `.agents/`, `.claude/`, and `.cursor/` command directories
 * for vendor compatibility. Those receive `opsx/<id>.md` from their own
 * adapters, which Grok's flat scan skips, so a project configured for both
 * Grok and Claude Code registers each command exactly once.
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
