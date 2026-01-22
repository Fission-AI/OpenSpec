/**
 * Claude Code Command Adapter
 *
 * Formats commands for Claude Code following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Claude Code adapter for command generation.
 * File path: .claude/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const claudeAdapter: ToolCommandAdapter = {
  toolId: 'claude',

  getFilePath(commandId: string): string {
    return path.join('.claude', 'commands', 'opsx', `${commandId}.md`);
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
