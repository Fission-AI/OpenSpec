/**
 * Kurama Command Adapter
 *
 * Formats commands for Kurama following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Kurama adapter for command generation.
 * File path: .kurama/skills/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const kuramaAdapter: ToolCommandAdapter = {
  toolId: 'kurama',

  getFilePath(commandId: string): string {
    return path.join('.kurama', 'skills', `${commandId}.md`);
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
