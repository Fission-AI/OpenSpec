/**
 * Cline Command Adapter
 *
 * Formats commands for Cline following its workflow specification.
 * Cline uses markdown headers instead of YAML frontmatter.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Cline adapter for command generation.
 * File path: .clinerules/workflows/openspec-<id>.md
 * Format: Markdown header with description
 */
export const clineAdapter: ToolCommandAdapter = {
  toolId: 'cline',

  getFilePath(commandId: string): string {
    return path.join('.clinerules', 'workflows', `openspec-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `# ${content.name}

${content.description}

${content.body}
`;
  },
};
