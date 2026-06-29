/**
 * ZCode Command Adapter
 *
 * Formats commands for ZCode under its project-local command directory.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * ZCode adapter for command generation.
 * File path: .zcode/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const zcodeAdapter: ToolCommandAdapter = {
  toolId: 'zcode',

  getFilePath(commandId: string): string {
    return path.join('.zcode', 'commands', 'opsx', `${commandId}.md`);
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
