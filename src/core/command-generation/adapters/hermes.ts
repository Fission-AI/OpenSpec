/**
 * Hermes Agent Command Adapter
 *
 * Formats commands for Hermes Agent following its frontmatter specification.
 *
 * Hermes Agent is an open-source CLI AI agent that supports custom slash
 * commands and Agent Skills. Skills are placed in ~/.hermes/skills/ and
 * project-level commands go in .hermes/commands/opsx/.
 *
 * https://github.com/NousResearch/hermes-agent
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Hermes Agent adapter for command generation.
 * File path: .hermes/commands/opsx/<id>.md
 * Frontmatter: name, description, category, tags
 */
export const hermesAdapter: ToolCommandAdapter = {
  toolId: 'hermes',

  getFilePath(commandId: string): string {
    return path.join('.hermes', 'commands', 'opsx', `${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const tagsStr = content.tags.join(', ');
    return `---
name: ${content.name}
description: ${content.description}
category: ${content.category}
tags: [${tagsStr}]
---

${content.body}
`;
  },
};
