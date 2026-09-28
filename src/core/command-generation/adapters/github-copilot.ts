/**
 * GitHub Copilot Command Adapter
 *
 * Formats commands for GitHub Copilot following its .prompt.md specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * GitHub Copilot adapter for command generation.
 * File path: .github/prompts/opsx-<id>.prompt.md
 * Frontmatter: description
 */
export const githubCopilotAdapter: ToolCommandAdapter = {
  toolId: 'github-copilot',

  getFilePath(commandId: string): string {
    return path.join('.github', 'prompts', `opsx-${commandId}.prompt.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
