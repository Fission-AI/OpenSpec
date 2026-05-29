/**
 * Oh My Pi (OMP) Command Adapter
 *
 * Formats commands for Oh My Pi following its slash command specification.
 * OMP loads slash commands from .omp/commands/*.md with YAML frontmatter.
 * The filename (minus .md) becomes the slash command name.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';

/**
 * Oh My Pi adapter for command generation.
 * File path: .omp/commands/opsx-<id>.md
 * Frontmatter: description
 *
 * OMP uses the filename (minus .md) as the slash command name, so
 * opsx-propose.md → /opsx-propose. Command references in the body
 * are transformed from /opsx: to /opsx- for consistency.
 */
export const ohMyPiAdapter: ToolCommandAdapter = {
  toolId: 'oh-my-pi',

  getFilePath(commandId: string): string {
    return path.join('.omp', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Transform /opsx: references to /opsx- for filename-based command naming
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${content.description}
---

${transformedBody}
`;
  },
};
