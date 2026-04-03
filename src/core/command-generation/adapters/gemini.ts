/**
 * Gemini CLI Command Adapter
 *
 * Formats commands for Gemini CLI following its TOML specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Gemini adapter for command generation.
 * File path: .gemini/commands/openspec/<id>.toml
 * Format: TOML with description and prompt fields
 */
export const geminiAdapter: ToolCommandAdapter = {
  toolId: 'gemini',

  getFilePath(commandId: string): string {
    return path.join('.gemini', 'commands', 'openspec', `${commandId}.toml`);
  },

  formatFile(content: CommandContent): string {
    return `description = "${content.description}"

prompt = """
${content.body}
"""
`;
  },
};
