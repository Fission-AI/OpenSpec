/**
 * Qoder Command Adapter
 *
 * Formats commands for Qoder following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

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
