/**
 * Qoder Command Adapter
 *
 * Formats commands for Qoder following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Qoder adapter for command generation.
 * File path: .qoder/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const qoderAdapter: ToolCommandAdapter = {
  toolId: 'qoder',

  getFilePath(commandId: string): string {
    return path.join('.qoder', 'commands', 'opsx', `${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const tagsStr = content.tags.join(', ');
    return `---
name: ${content.name}
description: ${content.description}
category: ${content.category}
tags: [${tagsStr}]
---

${content.body}
`;
  },
};
