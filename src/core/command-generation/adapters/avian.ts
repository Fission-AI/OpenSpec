/**
 * Avian Command Adapter
 *
 * Formats commands for Avian following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Avian adapter for command generation.
 * File path: .avian/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const avianAdapter: ToolCommandAdapter = {
  toolId: 'avian',

  getFilePath(commandId: string): string {
    return path.join('.avian', 'commands', 'opsx', `${commandId}.md`);
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
