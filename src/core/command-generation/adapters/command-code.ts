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

const COMMAND_CODE_INPUT_HEADING = /^\*\*Input\*\*:[^\n]*$/m;

function injectCommandCodeArgs(body: string): string {
  if (/^\*\*Provided arguments\*\*:\s*(?:\$(?:ARGUMENTS|@)|\$\{(?:ARGUMENTS|@)\})\s*$/m.test(body)) {
    return body;
  }

  return body.replace(
    COMMAND_CODE_INPUT_HEADING,
    (heading) => `${heading}\n**Provided arguments**: $ARGUMENTS`
  );
}

/**
 * Command Code adapter for command generation.
 * File path: .commandcode/commands/opsx-<id>.md
 * Format: plain Markdown with $ARGUMENTS injected after the input contract
 *
 * Command Code executes the full trimmed file body and substitutes invocation
 * arguments only where the body includes one of its argument placeholders.
 */
export const commandCodeAdapter: ToolCommandAdapter = {
  toolId: 'command-code',

  getFilePath(commandId: string): string {
    return path.join('.commandcode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `${injectCommandCodeArgs(content.body)}\n`;
  },
};
