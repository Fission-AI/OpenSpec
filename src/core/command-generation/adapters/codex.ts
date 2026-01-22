/**
 * Codex Command Adapter
 *
 * Formats commands for Codex following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Codex adapter for command generation.
 * File path: .codex/prompts/opsx-<id>.md
 * Frontmatter: description, argument-hint
 */
export const codexAdapter: ToolCommandAdapter = {
  toolId: 'codex',

  getFilePath(commandId: string): string {
    return path.join('.codex', 'prompts', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${content.description}
argument-hint: command arguments
---

${content.body}
`;
  },
};
