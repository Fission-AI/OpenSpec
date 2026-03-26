/**
 * Code Studio Command Adapter
 *
 * Formats commands for Syncfusion Code Studio following its .prompt.md specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Code Studio adapter for command generation.
 * File path: .code-studio/prompts/opsx-<id>.prompt.md
 * Frontmatter: description
 */
export const codeStudioAdapter: ToolCommandAdapter = {
  toolId: 'code-studio',

  getFilePath(commandId: string): string {
    return path.join('.code-studio', 'prompts', `opsx-${commandId}.prompt.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${content.description}
---

${content.body}
`;
  },
};
