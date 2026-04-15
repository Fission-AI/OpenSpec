/**
 * OpenCode Command Adapter
 *
 * Formats commands for OpenCode following its frontmatter specification.
 * OpenCode custom commands live in the global home directory
 * (~/.config/opencode/commands/) and are not shared through the repository.
 * The OPENCODE_HOME env var can override the default ~/.config/opencode location.
 */

import os from 'os';
import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';

/**
 * Returns the OpenCode home directory.
 * Respects the OPENCODE_HOME env var, defaulting to ~/.config/opencode.
 */
function getOpenCodeHome(): string {
  const envHome = process.env.OPENCODE_HOME?.trim();
  return path.resolve(envHome ? envHome : path.join(os.homedir(), '.config', 'opencode'));
}

/**
 * OpenCode adapter for command generation.
 * File path: <OPENCODE_HOME>/commands/opsx-<id>.md (absolute, global)
 * Frontmatter: description
 */
export const opencodeAdapter: ToolCommandAdapter = {
  toolId: 'opencode',

  getFilePath(commandId: string): string {
    return path.join(getOpenCodeHome(), 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    // Transform command references from colon to hyphen format for OpenCode
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
description: ${content.description}
---

${transformedBody}
`;
  },
};
