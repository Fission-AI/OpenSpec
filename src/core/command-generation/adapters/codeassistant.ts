/**
 * SourceCraft Code Assistant Command Adapter
 *
 * Formats commands for SourceCraft Code Assistant following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * SourceCraft Code Assistant adapter for command generation.
 * File path: .codeassistant/commands/opsx-<id>.md
 * Format: Markdown header with description
 */
export const codeassistantAdapter: ToolCommandAdapter = {
  toolId: 'codeassistant',

  getFilePath(commandId: string): string {
    return path.join('.codeassistant', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `# ${content.name}

${content.description}

${content.body}
`;
  },
};
