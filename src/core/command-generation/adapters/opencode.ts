/**
 * OpenCode Command Adapter
 *
 * Formats commands for OpenCode following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

const OPENCODE_INPUT_HEADING = /^\*\*Input\*\*:[^\n]*$/m;

function injectOpenCodeArgs(body: string): string {
  if (body.includes('$ARGUMENTS')) {
    return body;
  }

  return body.replace(
    OPENCODE_INPUT_HEADING,
    (heading) => `${heading}\n**Provided arguments**: $ARGUMENTS`
  );
}

/**
 * OpenCode adapter for command generation.
 * File path: .opencode/commands/opsx-<id>.md
 * Frontmatter: description. $ARGUMENTS is injected after the input contract
 * because OpenCode only passes command arguments through explicit placeholders.
 */
export const opencodeAdapter: ToolCommandAdapter = {
  toolId: 'opencode',

  getFilePath(commandId: string): string {
    return path.join('.opencode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${injectOpenCodeArgs(content.body)}
`;
  },
};
