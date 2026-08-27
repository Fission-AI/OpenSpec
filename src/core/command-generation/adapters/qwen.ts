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
import { escapeYamlValue } from '../yaml.js';

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
