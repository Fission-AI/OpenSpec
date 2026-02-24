/**
 * OpenCode Command Adapter
 *
 * Formats commands for OpenCode following its frontmatter specification.
 */

import os from 'os';
import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { transformToHyphenCommands } from '../../../utils/command-references.js';

/**
 * OpenCode adapter for command generation.
 * File path: .opencode/command/opsx-<id>.md
 * Frontmatter: description
 */
export const opencodeAdapter: ToolCommandAdapter = {
  toolId: 'opencode',

  getFilePath(commandId: string): string {
    return path.join('.opencode', 'command', `opsx-${commandId}.md`);
  },

  getGlobalRoot(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || os.homedir(), 'opencode');
    }
    const xdgConfig = process.env.XDG_CONFIG_HOME?.trim();
    return xdgConfig
      ? path.join(xdgConfig, 'opencode')
      : path.join(os.homedir(), '.config', 'opencode');
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
