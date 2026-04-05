/**
 * Kiro Command Adapter
 *
 * Formats commands for Kiro following its .prompt.md specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Kiro adapter for command generation.
 * File path: .kiro/prompts/openspec-<id>.prompt.md
 * Frontmatter: description
 */
export const kiroAdapter: ToolCommandAdapter = {
  toolId: 'kiro',

  getFilePath(commandId: string): string {
    return path.join('.kiro', 'prompts', `openspec-${commandId}.prompt.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${content.description}
---

${content.body}
`;
  },
};
