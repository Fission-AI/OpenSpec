/**
 * Lingma Command Adapter
 *
 * Formats commands for Lingma following its skill specification.
 */
 
import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Lingma adapter for command generation.
 * File path: .lingma/commands/opsx-<id>.md
 * Structure: Command markdown files with YAML frontmatter
 */
export const lingmaAdapter: ToolCommandAdapter = {
  toolId: 'lingma',

  getFilePath(commandId: string): string {
    return path.join('.lingma', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: /opsx-${content.id}
id: opsx-${content.id}
category: ${content.category}
description: ${content.description}
---

${content.body}
`;
  },
};