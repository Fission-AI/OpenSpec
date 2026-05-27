/**
 * CoStrict Command Adapter
 *
 * Formats commands for CoStrict following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * CoStrict adapter for command generation.
 * File path: .cospec/pastelsdd/commands/pastel-<id>.md
 * Frontmatter: description, argument-hint
 */
export const costrictAdapter: ToolCommandAdapter = {
  toolId: 'costrict',

  getFilePath(commandId: string): string {
    return path.join('.cospec', 'pastelsdd', 'commands', `pastel-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: "${content.description}"
argument-hint: command arguments
---

${content.body}
`;
  },
};
