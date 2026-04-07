/**
 * iFlow Command Adapter
 *
 * Formats commands for iFlow following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { COMMAND_NAMESPACE } from '../namespace.js';

/**
 * iFlow adapter for command generation.
 * File path: .iflow/commands/opsx-<id>.md
 * Frontmatter: name, id, category, description
 */
export const iflowAdapter: ToolCommandAdapter = {
  toolId: 'iflow',

  getFilePath(commandId: string): string {
    return path.join('.iflow', 'commands', `${COMMAND_NAMESPACE}-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: /${COMMAND_NAMESPACE}-${content.id}
id: ${COMMAND_NAMESPACE}-${content.id}
category: ${content.category}
description: ${content.description}
---

${content.body}
`;
  },
};
