/**
 * OpenCode Command Adapter
 *
 * Formats commands for OpenCode following its frontmatter specification.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';
import { getOpenCodeSharedRoot } from '../../shared/command-paths.js';

const OPENCODE_INPUT_BLOCK = /^\*\*Input\*\*:[^\r\n]*(?:\r?\n(?!\r?\n)[^\r\n]*)*/m;
const OPENCODE_NO_INPUT = /^\*\*Input\*\*:\s*None required\b/im;
const OPENCODE_ARGUMENT_PLACEHOLDER = /\$(?:ARGUMENTS\b|[1-9]\d*\b)/;

function injectOpenCodeArgs(body: string): string {
  if (OPENCODE_ARGUMENT_PLACEHOLDER.test(body) || OPENCODE_NO_INPUT.test(body)) {
    return body;
  }

  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  return body.replace(
    OPENCODE_INPUT_BLOCK,
    (input) => `${input}${eol}**Provided arguments**: $ARGUMENTS`
  );
}

/**
 * OpenCode adapter for command generation.
 * File path: .opencode/commands/opsx-<id>.md by default, or
 * <OPENCODE_CONFIG_DIR>/commands/opsx-<id>.md when OPENSPEC_OPENCODE_SHARED_COMMANDS=1.
 * Frontmatter: description. $ARGUMENTS is injected after the complete input
 * contract because OpenCode only passes arguments through explicit placeholders.
 */
export const opencodeAdapter: ToolCommandAdapter = {
  toolId: 'opencode',

  getFilePath(commandId: string): string {
    const root = getOpenCodeSharedRoot() ?? '.opencode';
    return path.join(root, 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${injectOpenCodeArgs(content.body)}
`;
  },
};
