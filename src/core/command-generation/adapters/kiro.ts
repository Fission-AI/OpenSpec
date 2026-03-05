/**
 * Kiro Command Adapter
 *
 * Formats commands for Kiro following its .prompt.md specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

function transformExploreBodyForKiro(content: CommandContent): string {
  if (content.id !== 'explore') {
    return content.body;
  }

  return content.body
    .replaceAll('`specs/<capability>/spec.md`', '`openspec/specs/<capability>/spec.md`')
    .replaceAll('Add it to specs?', 'Add it to `openspec/specs/<capability>/spec.md`?');
}

/**
 * Kiro adapter for command generation.
 * File path: .kiro/prompts/opsx-<id>.prompt.md
 * Frontmatter: description
 */
export const kiroAdapter: ToolCommandAdapter = {
  toolId: 'kiro',

  getFilePath(commandId: string): string {
    return path.join('.kiro', 'prompts', `opsx-${commandId}.prompt.md`);
  },

  formatFile(content: CommandContent): string {
    const transformedBody = transformExploreBodyForKiro(content);

    return `---
description: ${content.description}
---

${transformedBody}
`;
  },
};
