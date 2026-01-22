/**
 * Windsurf Command Adapter
 *
 * Formats commands for Windsurf following its frontmatter specification.
 * Windsurf uses a similar format to Claude but may have different conventions.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Windsurf adapter for command generation.
 * File path: .windsurf/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const windsurfAdapter: ToolCommandAdapter = {
  toolId: 'windsurf',

  getFilePath(commandId: string): string {
    return path.join('.windsurf', 'commands', 'opsx', `${commandId}.md`);
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
