/**
 * Easy Code Command Adapter
 *
 * Formats commands for Easy Code using TOML format.
 * Easy Code stores commands as TOML files at .easycode/commands/opsx/<id>.toml
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeTOMLBasicString, escapeTOMLMultilineString } from '../toml.js';

/**
 * Easy Code adapter for command generation.
 * File path: .easycode/commands/opsx/<id>.toml
 *
 * Format:
 *   description = "<basic-string>"         single-line, backslash/quote-safe
 *   prompt = """<multiline-string>"""       multiline, backslash/triple-quote-safe
 */
export const easycodeAdapter: ToolCommandAdapter = {
  toolId: 'easycode',

  getFilePath(commandId: string): string {
    return path.join('.easycode', 'commands', 'opsx', `${commandId}.toml`);
  },

  formatFile(content: CommandContent): string {
    const safeDesc = escapeTOMLBasicString(content.description);
    const safeBody = escapeTOMLMultilineString(content.body);
    return `description = "${safeDesc}"\n\nprompt = """\n${safeBody}\n"""\n`;
  },
};
