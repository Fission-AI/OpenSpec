/**
 * Oh My Pi Command Adapter
 *
 * Formats commands for Oh My Pi (omp), which discovers file-based slash commands
 * from .omp/commands/*.md. Oh My Pi uses the filename (minus .md) as the slash
 * command name, so opsx-propose.md → /opsx-propose, and supports $@ / $ARGUMENTS
 * for inline args — the same shape as the Pi adapter.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';
import { escapeYamlValue } from '../yaml.js';

const OMP_INPUT_HEADING = /^\*\*Input\*\*:[^\n]*$/m;

function injectOmpArgs(body: string): string {
  if (body.includes('$@') || body.includes('$ARGUMENTS')) {
    return body;
  }

  return body.replace(
    OMP_INPUT_HEADING,
    (heading) => `${heading}\n**Provided arguments**: $@`
  );
}

/**
 * Oh My Pi adapter for slash command generation.
 * File path: .omp/commands/opsx-<id>.md
 * Frontmatter: description
 *
 * Command references in the body are transformed from /opsx: to /opsx- for
 * consistency with the filename-derived command names.
 */
export const ompAdapter: ToolCommandAdapter = {
  toolId: 'omp',

  getFilePath(commandId: string): string {
    return path.join('.omp', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Transform /opsx: references to /opsx- and inject $@ for template args
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${escapeYamlValue(content.description)}
---

${injectOmpArgs(transformedBody)}
`;
  },
};
