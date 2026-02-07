/**
 * Kiro Command Adapter
 *
 * Formats commands for Kiro IDE following its steering file specification.
 * Kiro uses `.kiro/steering/*.md` files with YAML frontmatter for project-level guidance.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Kiro adapter for command generation.
 * File path: .kiro/steering/opsx-<id>.md
 * Frontmatter: inclusion (always), name, description
 *
 * Kiro steering files support:
 * - `inclusion: always` - Always included in context
 * - `inclusion: manual` - Included via context key (#)
 * - `inclusion: fileMatch` with `fileMatchPattern` - Conditional inclusion
 *
 * We use `inclusion: always` for OpenSpec workflow guidance.
 */
export const kiroAdapter: ToolCommandAdapter = {
  toolId: 'kiro',

  getFilePath(commandId: string): string {
    return path.join('.kiro', 'steering', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
inclusion: always
---

# ${content.name}

${content.description}

${content.body}
`;
  },
};
