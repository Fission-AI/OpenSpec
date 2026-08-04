/**
 * Kiro Command Adapter
 *
 * Formats commands for Kiro following its .prompt.md specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * Kiro adapter for command generation.
 * File path: .kiro/prompts/opsx-<id>.prompt.md
 * Frontmatter: description
 */
export const kiroAdapter: ToolCommandAdapter = {
  toolId: 'kiro',

  getFilePath(commandId: string): string {
    return path.join('.kiro', 'prompts', `opsx-${commandId}.prompt.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
