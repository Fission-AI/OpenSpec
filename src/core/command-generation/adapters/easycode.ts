/**
 * EasyCode Command Adapter
 *
 * Formats commands for OrionStarAI/EasyCode using its TOML command format.
 * https://github.com/OrionStarAI/EasyCode
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeTomlBasicString, escapeTomlMultilineBasicString } from '../toml.js';

/**
 * EasyCode adapter for command generation.
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
    const safeDesc = escapeTomlBasicString(content.description);
    const safeBody = escapeTomlMultilineBasicString(content.body);
    return `description = "${safeDesc}"\n\nprompt = """\n${safeBody}\n"""\n`;
  },
};
