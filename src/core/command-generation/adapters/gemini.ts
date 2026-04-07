/**
 * Gemini CLI Command Adapter
 *
 * Formats commands for Gemini CLI following its TOML specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { COMMAND_NAMESPACE } from '../namespace.js';

/**
 * Gemini adapter for command generation.
 * File path: .gemini/commands/opsx/<id>.toml
 * Format: TOML with description and prompt fields
 */
export const geminiAdapter: ToolCommandAdapter = {
  toolId: 'gemini',

  getFilePath(commandId: string): string {
    return path.join('.gemini', 'commands', COMMAND_NAMESPACE, `${commandId}.toml`);
  },

  formatFile(content: CommandContent): string {
    return `description = "${content.description}"

prompt = """
${content.body}
"""
`;
  },
};
