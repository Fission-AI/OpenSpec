/**
 * Continue Command Adapter
 *
 * Formats commands for Continue following its .prompt specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * Continue adapter for command generation.
 * File path: .continue/prompts/opsx-<id>.prompt
 * Frontmatter: name, description, invokable
 */
export const continueAdapter: ToolCommandAdapter = {
  toolId: 'continue',

  getFilePath(commandId: string): string {
    return path.join('.continue', 'prompts', `opsx-${commandId}.prompt`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: ${escapeYamlValue(`opsx-${content.id}`)}
description: ${escapeYamlValue(content.description)}
invokable: true
---

${content.body}
`;
  },
};
