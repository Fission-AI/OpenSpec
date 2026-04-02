/**
 * GitHub Copilot Command Adapter
 *
 * Formats commands for GitHub Copilot following its .prompt.md specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * GitHub Copilot adapter for command generation.
 * File path: .github/prompts/openspec-<id>.prompt.md
 * Frontmatter: description
 */
export const githubCopilotAdapter: ToolCommandAdapter = {
  toolId: 'github-copilot',

  getFilePath(commandId: string): string {
    return path.join('.github', 'prompts', `openspec-${commandId}.prompt.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${content.description}
---

${content.body}
`;
  },
};
