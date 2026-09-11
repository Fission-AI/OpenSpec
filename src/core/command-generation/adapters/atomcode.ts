/**
 * AtomCode Command Adapter
 *
 * Formats project commands for AtomCode.
 * https://github.com/atomgit-atomcode/atomcode#custom-commands
 */

import path from 'path';
import { stringify } from 'yaml';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/** A workflow declares its invocation input with an `**Input**:` heading. */
const INPUT_HEADING = /^\*\*Input\*\*:/m;

/**
 * AtomCode adapter for command generation.
 * File path: .atomcode/commands/opsx-<id>.md
 * Frontmatter: name, description, args
 *
 * AtomCode's custom-command parser reads name and args literally without YAML
 * unquoting, so these controlled identifiers must stay unquoted.
 * The command name matches the filename.
 *
 * `args` mirrors what the workflow actually accepts. AtomCode executes an
 * `args: none` command straight from the slash menu, while `optional` completes
 * to `/name ` and waits for a second Enter. Advertising arguments a workflow
 * never reads would cost every user that extra keystroke, so only workflows
 * carrying an `**Input**:` contract declare `optional` and receive $ARGUMENTS.
 */
export const atomcodeAdapter: ToolCommandAdapter = {
  toolId: 'atomcode',

  getFilePath(commandId: string): string {
    return path.join('.atomcode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Keep ordinary descriptions plain for the literal custom-command parser,
    // while keeping special values valid YAML for frontmatter consumers.
    const description = stringify({ description: content.description }, { lineWidth: 0, blockQuote: false });
    const acceptsInput = INPUT_HEADING.test(content.body);
    const argumentsBlock = acceptsInput ? '\n**Provided arguments**: $ARGUMENTS\n' : '';
    return `---
name: opsx-${content.id}
${description}args: ${acceptsInput ? 'optional' : 'none'}
---
${argumentsBlock}
${content.body}
`;
  },
};
