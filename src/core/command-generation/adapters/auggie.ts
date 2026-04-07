/**
 * Auggie (Augment CLI) Command Adapter
 *
 * Formats commands for Auggie following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { COMMAND_NAMESPACE } from '../namespace.js';

/**
 * Auggie adapter for command generation.
 * File path: .augment/commands/opsx-<id>.md
 * Frontmatter: description, argument-hint
 */
export const auggieAdapter: ToolCommandAdapter = {
  toolId: 'auggie',

  getFilePath(commandId: string): string {
    return path.join('.augment', 'commands', `${COMMAND_NAMESPACE}-${commandId}.md`);
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
