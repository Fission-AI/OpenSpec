/**
 * Crush Command Adapter
 *
 * Formats commands for Crush following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * Crush adapter for command generation.
 * File path: .crush/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const crushAdapter: ToolCommandAdapter = {
  toolId: 'crush',

  getFilePath(commandId: string): string {
    return path.join('.crush', 'commands', 'opsx', `${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const tagsStr = content.tags.map(escapeYamlValue).join(', ');
    return `---
name: ${escapeYamlValue(content.name)}
description: ${escapeYamlValue(content.description)}
category: ${escapeYamlValue(content.category)}
tags: [${tagsStr}]
---

${content.body}
`;
  },
};
