/**
 * SourceCraft Code Assistant Command Adapter
 *
 * Formats commands for the SourceCraft Code Assistant VS Code extension.
 *
 * @see https://sourcecraft.dev/portal/docs/en/code-assistant/operations/agent/slash-commands
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * SourceCraft Code Assistant adapter for command generation.
 * File path: .codeassistant/commands/opsx-<id>.md
 * Format: YAML frontmatter with description
 */
export const codeassistantAdapter: ToolCommandAdapter = {
  toolId: 'codeassistant',

  getFilePath(commandId: string): string {
    return path.join('.codeassistant', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
