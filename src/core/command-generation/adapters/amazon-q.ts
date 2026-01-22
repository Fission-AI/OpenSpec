/**
 * Amazon Q Developer Command Adapter
 *
 * Formats commands for Amazon Q Developer following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Amazon Q adapter for command generation.
 * File path: .amazonq/prompts/opsx-<id>.md
 * Frontmatter: description
 */
export const amazonQAdapter: ToolCommandAdapter = {
  toolId: 'amazon-q',

  getFilePath(commandId: string): string {
    return path.join('.amazonq', 'prompts', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${content.description}
---

${content.body}
`;
  },
};
