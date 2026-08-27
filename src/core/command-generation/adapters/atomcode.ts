/**
 * AtomCode Command Adapter
 *
 * Formats project commands for AtomCode.
 * https://github.com/atomgit-atomcode/atomcode#custom-commands
 */

import path from 'path';
import { stringify } from 'yaml';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * AtomCode adapter for command generation.
 * File path: .atomcode/commands/opsx-<id>.md
 * Frontmatter: name, description, args
 *
 * AtomCode's custom-command parser reads name and args literally without YAML
 * unquoting, so these controlled identifiers must stay unquoted.
 * The command name matches the filename. Optional arguments let users supply
 * a change name or request, or invoke the workflow without one and be prompted.
 */
export const atomcodeAdapter: ToolCommandAdapter = {
  toolId: 'atomcode',

  getFilePath(commandId: string): string {
    return path.join('.atomcode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Keep ordinary descriptions plain for the literal custom-command parser,
    // while escaping special values for AtomCode's separate YAML skill loader.
    const description = stringify({ description: content.description }, { lineWidth: 0, blockQuote: false });
    return `---
name: opsx-${content.id}
${description}args: optional
---

**Provided arguments**: $ARGUMENTS

${content.body}
`;
  },
};
