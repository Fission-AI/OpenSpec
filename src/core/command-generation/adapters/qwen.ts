/**
 * Qwen Code Command Adapter
 *
 * Formats commands for Qwen Code following its Markdown command specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';

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

export function getLegacyQwenTomlFilePath(commandId: string): string {
  return path.join('.qwen', 'commands', `opsx-${commandId}.toml`);
}

/**
 * Qwen adapter for command generation.
 * File path: .qwen/commands/opsx-<id>.md
 * Frontmatter: description
 */
export const qwenAdapter: ToolCommandAdapter = {
  toolId: 'qwen',

  getFilePath(commandId: string): string {
    return path.join('.qwen', 'commands', `opsx-${commandId}.md`);
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
