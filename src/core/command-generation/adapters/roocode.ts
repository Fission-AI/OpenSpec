/**
 * Zoo Code Command Adapter
 *
 * Formats commands for Zoo Code following its workflow specification.
 * Zoo Code uses markdown headers instead of YAML frontmatter.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Zoo Code adapter for command generation.
 * File path: .roo/commands/opsx-<id>.md
 * Format: Markdown header with description
 */
export const roocodeAdapter: ToolCommandAdapter = {
  toolId: 'roocode',

  getFilePath(commandId: string): string {
    return path.join('.roo', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `# ${content.name}

${content.description}

${content.body}
`;
  },
};
