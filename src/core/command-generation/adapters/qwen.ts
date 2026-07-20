/**
 * Qwen Code Command Adapter
 *
 * Formats commands for Qwen Code following its Markdown custom command
 * specification. Qwen Code has deprecated TOML commands in favor of
 * Markdown files with YAML frontmatter.
 *
 * @see https://qwenlm.github.io/qwen-code-docs/en/users/features/commands/#markdown-file-format-specification-recommended
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Escapes a string value for safe YAML output.
 * Quotes the string if it contains special YAML characters.
 */
function escapeYamlValue(value: string): string {
  // Check if value needs quoting (contains special YAML characters or starts/ends with whitespace)
  const needsQuoting = /[:\n\r#{}[\],&*!|>'"%@`]|^\s|\s$/.test(value);
  if (needsQuoting) {
    // Use double quotes and escape internal double quotes and backslashes
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Qwen adapter for command generation.
 * File path: .qwen/commands/opsx-<id>.md
 * Format: Markdown with description frontmatter
 */
export const qwenAdapter: ToolCommandAdapter = {
  toolId: 'qwen',

  getFilePath(commandId: string): string {
    return path.join('.qwen', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
