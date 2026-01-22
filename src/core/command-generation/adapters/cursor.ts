/**
 * Cursor Command Adapter
 *
 * Formats commands for Cursor following its frontmatter specification.
 * Cursor uses a different frontmatter format and file naming convention.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Cursor adapter for command generation.
 * File path: .cursor/commands/opsx-<id>.md
 * Frontmatter: name (as /opsx-<id>), id, category, description
 */
export const cursorAdapter: ToolCommandAdapter = {
  toolId: 'cursor',

  getFilePath(commandId: string): string {
    return path.join('.cursor', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: /opsx-${content.id}
id: opsx-${content.id}
category: ${content.category}
description: ${content.description}
---

${content.body}
`;
  },
};
