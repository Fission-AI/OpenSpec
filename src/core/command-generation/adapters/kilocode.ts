/**
 * Kilo Code Command Adapter
 *
 * Formats commands for Kilo Code following its workflow specification.
 * Kilo Code workflows don't use frontmatter.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { COMMAND_NAMESPACE } from '../namespace.js';

/**
 * Kilo Code adapter for command generation.
 * File path: .kilocode/workflows/opsx-<id>.md
 * Format: Plain markdown without frontmatter
 */
export const kilocodeAdapter: ToolCommandAdapter = {
  toolId: 'kilocode',

  getFilePath(commandId: string): string {
    return path.join('.kilocode', 'workflows', `${COMMAND_NAMESPACE}-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `${content.body}
`;
  },
};
