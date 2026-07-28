/**
 * Gemini CLI Command Adapter
 *
 * Formats commands for Gemini CLI following its TOML specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Control characters (C0 except tab/newline/carriage return, plus DEL) are
 * invalid inside TOML strings and must be written as escapes.
 */
const TOML_CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]', 'g');

/**
 * TOML basic strings are escape-active: a backslash or double quote in the
 * value breaks the file if written raw. Newlines cannot appear in a
 * single-line basic string at all, so they are escaped too.
 */
function escapeTomlBasicString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(TOML_CONTROL_CHARS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * Multiline basic strings keep raw newlines and tabs, but backslashes are
 * still escape-active, any run of three quotes would end the string, and the
 * same control characters are invalid as in single-line basic strings.
 * Control chars are escaped last so their introduced backslashes are not
 * re-doubled.
 */
function escapeTomlMultilineBasicString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '""\\"')
    .replace(TOML_CONTROL_CHARS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * Gemini adapter for command generation.
 * File path: .gemini/commands/opsx/<id>.toml
 * Format: TOML with description and prompt fields
 */
export const geminiAdapter: ToolCommandAdapter = {
  toolId: 'gemini',

  getFilePath(commandId: string): string {
    return path.join('.gemini', 'commands', 'opsx', `${commandId}.toml`);
  },

  formatFile(content: CommandContent): string {
    return `description = "${escapeTomlBasicString(content.description)}"

prompt = """
${escapeTomlMultilineBasicString(content.body)}
"""
`;
  },
};
