/**
 * AtomCode Command Adapter
 *
 * Formats commands for AtomCode following its frontmatter specification.
 * AtomCode is an open-source terminal AI coding assistant that uses the same
 * Agent Skills spec as Claude Code.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';

/**
 * AtomCode adapter for command generation.
 * File path: .atomcode/commands/opsx-<id>.md
 * Frontmatter: description
 *
 * AtomCode's frontmatter parser supports name, description, disable-model-invocation,
 * user-invocable, argument-hint, and allowed-tools. We provide description as the
 * primary field; other fields are optional and left to defaults.
 */
export const atomcodeAdapter: ToolCommandAdapter = {
  toolId: 'atomcode',

  getFilePath(commandId: string): string {
    return path.join('.atomcode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Transform command references from colon to hyphen format for AtomCode
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${content.description}
---

${transformedBody}
`;
  },
};
