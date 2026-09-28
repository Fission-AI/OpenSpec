/**
 * GigaCode Command Adapter
 *
 * Formats commands for GigaCode using its Markdown custom command format.
 * Project commands live in `.gigacode/commands/` and accept an optional
 * `description` field in YAML frontmatter.
 *
 * @see https://gitverse.ru/docs/ai/ai-assistant-gigacode/gigacode-cli/commands
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * GigaCode adapter for command generation.
 * File path: .gigacode/commands/opsx-<id>.md
 * Format: Markdown with description frontmatter
 */
export const gigacodeAdapter: ToolCommandAdapter = {
  toolId: 'gigacode',

  getFilePath(commandId: string): string {
    return path.join('.gigacode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
