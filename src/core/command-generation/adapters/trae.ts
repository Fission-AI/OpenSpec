/**
 * Trae Command Adapter
 *
 * Formats commands for Trae following its command frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';


/**
 * Escapes a string value for safe YAML output.
 * Quotes the string if it contains special YAML characters.
 */
function escapeYamlValue(value: string): string {
  const needsQuoting = /[:\n\r#{}[\],&*!|>'"%@`]|^\s|\s$/.test(value);
  if (needsQuoting) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Formats a tags array as a YAML array with proper escaping.
 */
function formatTagsArray(tags: string[]): string {
  const escapedTags = tags.map((tag) => escapeYamlValue(tag));
  return `[${escapedTags.join(', ')}]`;
}

/**
 * Trae adapter for command generation.
 * File path: .trae/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const traeAdapter: ToolCommandAdapter = {
  toolId: 'trae',

  getFilePath(commandId: string): string {
    return path.join('.trae', 'commands', 'opsx', `${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: ${escapeYamlValue(content.name)}
description: ${escapeYamlValue(content.description)}
category: ${escapeYamlValue(content.category)}
tags: ${formatTagsArray(content.tags)}
---

${content.body}
`;
  },
};

