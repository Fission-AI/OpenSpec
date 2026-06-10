/**
 * Trae Command Adapter
 *
 * Formats commands for Trae following its command specification.
 * Similar to Claude but uses bare command ID as the name.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Trae adapter for command generation.
 * File path: .trae/commands/opsx/<id>.md
 * Frontmatter: name (bare id), description
 */
export const traeAdapter: ToolCommandAdapter = {
  toolId: 'trae',

  getFilePath(commandId: string): string {
    return path.join('.trae', 'commands', 'opsx', `${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: ${content.id}
description: "${content.description}"
---

${content.body}
`;
  },
};
