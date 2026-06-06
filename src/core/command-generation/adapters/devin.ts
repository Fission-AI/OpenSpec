/**
 * Devin Desktop Command Adapter
 *
 * Formats commands for Devin Desktop following its frontmatter specification.
 * Devin Desktop uses the same Cascade workflow system as Windsurf.
 */

import path from 'path';
import { transformToHyphenCommands } from '../../../utils/command-references.js';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Escapes a string value for safe YAML output.
 * Quotes the string if it contains special YAML characters or would be
 * interpreted as an implicit YAML scalar (boolean, null, number, etc).
 */
function escapeYamlValue(value: string): string {
  // Check if value needs quoting due to special YAML characters or whitespace
  const hasSpecialChars = /[:\n\r#{}[\],&*!|>'"%@`]|^\s|\s$/.test(value);
  
  // Check if value would be interpreted as an implicit YAML scalar
  // Matches: booleans (true/false/yes/no/on/off), null variants, numbers, hex/octal
  const isImplicitScalar = /^(true|false|yes|no|on|off|null|~|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0o[0-7]+|-|\.?)$/.test(value);
  
  if (hasSpecialChars || isImplicitScalar) {
    // Use double quotes and escape internal double quotes and backslashes
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
 * Devin Desktop adapter for command generation.
 * File path: .devin/workflows/opsx-<id>.md
 * Frontmatter: name, description, category, tags
 * 
 * Devin Desktop uses slash-hyphen syntax (/opsx-apply) instead of colon syntax (/opsx:apply).
 */
export const devinAdapter: ToolCommandAdapter = {
  toolId: 'devin',

  getFilePath(commandId: string): string {
    return path.join('.devin', 'workflows', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Transform command references from colon to hyphen syntax
    const transformedBody = transformToHyphenCommands(content.body);
    
    return `---
name: ${escapeYamlValue(content.name)}
description: ${escapeYamlValue(content.description)}
category: ${escapeYamlValue(content.category)}
tags: ${formatTagsArray(content.tags)}
---

${transformedBody}
`;
  },
};
