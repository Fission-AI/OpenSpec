/**
 * SourceCraft Code Assistant Command Adapter
 *
 * Formats commands for SourceCraft Code Assistant following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';

/**
 * Escapes a string value for safe YAML output.
 * Quotes the string if it contains special YAML characters.
 */
function escapeYamlValue(value: string): string {
  // Check if value needs quoting (contains special YAML characters or starts/ends with whitespace)
  const needsQuoting = /[:\n\r#{}[\],&*!|>'"%@`]|^\s|\s$/.test(value);
  if (needsQuoting) {
    // Use double quotes and escape internal double quotes and backslashes
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * SourceCraft Code Assistant adapter for command generation.
 * File path: .codeassistant/commands/opsx-<id>.md
 * Format: YAML frontmatter with description
 */
export const codeassistantAdapter: ToolCommandAdapter = {
  toolId: 'codeassistant',

  getFilePath(commandId: string): string {
    return path.join('.codeassistant', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${escapeYamlValue(content.description)}
---

${transformedBody}
`;
  },
};
