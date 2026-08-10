/**
 * Command Code Command Adapter
 *
 * Command Code reads custom slash commands from `.commandcode/commands/`. The
 * command name is the markdown filename without its `.md` extension, so
 * `opsx-<id>.md` registers `/opsx-<id>` — the same flat naming Cursor and
 * OpenCode use. See https://commandcode.ai/docs/reference/slash-commands.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * Command Code adapter for command generation.
 * File path: .commandcode/commands/opsx-<id>.md
 * Frontmatter: description
 */
export const commandCodeAdapter: ToolCommandAdapter = {
  toolId: 'command-code',

  getFilePath(commandId: string): string {
    return path.join('.commandcode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
