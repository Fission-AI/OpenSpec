/**
 * Easy Code Command Adapter
 *
 * Formats commands for Easy Code using TOML format.
 * Easy Code stores commands as TOML files at .easycode/commands/opsx/<id>.toml
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Easy Code adapter for command generation.
 * File path: .easycode/commands/opsx/<id>.toml
 * Format: TOML with description string and prompt multiline literal string
 */
export const easycodeAdapter: ToolCommandAdapter = {
  toolId: 'easycode',

  getFilePath(commandId: string): string {
    return path.join('.easycode', 'commands', 'opsx', `${commandId}.toml`);
  },

  formatFile(content: CommandContent): string {
    const safeDesc = content.description.replace(/"/g, '\\"');
    return `description = "${safeDesc}"\n\nprompt = '''\n${content.body}\n'''\n`;
  },
};
