/**
 * Bob Shell Command Adapter
 *
 * Formats commands for Bob Shell following its markdown specification.
 * Commands are stored in .bob/commands/ directory.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * Bob Shell adapter for command generation.
 * File path: .bob/commands/opsx-<id>.md
 * Frontmatter: description
 *
 * Bob uses the filename (minus .md) as the slash command name, so
 * opsx-propose.md → /opsx-propose. Command references in the body
 * are transformed from /opsx: to /opsx- for consistency.
 */
export const bobAdapter: ToolCommandAdapter = {
  toolId: 'bob',

  getFilePath(commandId: string): string {
    return path.join('.bob', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${escapeYamlValue(content.description)}
argument-hint: command arguments
---

${transformedBody}
`;
  },
};
