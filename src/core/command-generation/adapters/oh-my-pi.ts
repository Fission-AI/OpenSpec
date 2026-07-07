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
 * Oh My Pi adapter for command generation.
 * File path: .omp/commands/opsx-<id>.md
 * Frontmatter: description
 *
 * OMP uses the filename (minus .md) as the slash command name, so
 * opsx-propose.md → /opsx-propose. Command references in the body
 * are transformed from /opsx: to /opsx- for consistency, and
 * $@ is injected after **Input**: headings so user-supplied arguments
 * (e.g. /opsx-propose my-feature) are visible to the agent.
 */
export const ohMyPiAdapter: ToolCommandAdapter = {
  toolId: 'oh-my-pi',

  getFilePath(commandId: string): string {
    return path.join('.omp', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${escapeYamlValue(content.description)}
---

${injectOmpArgs(transformedBody)}
`;
  },
};
