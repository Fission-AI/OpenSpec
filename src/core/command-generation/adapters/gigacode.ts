/**
 * GigaCode Command Adapter
 *
 * Formats commands for GigaCode (Sber's CLI coding agent, a fork of Qwen
 * Code). GigaCode reuses Qwen Code's file formats: Markdown custom
 * commands with a `description` frontmatter field, read from
 * `.gigacode/commands/`.
 *
 * Note: GigaCode's public docs do not enumerate the custom-command file
 * format directly; this mirrors Qwen Code's current Markdown spec per the
 * fork relationship (Qwen Code deprecated TOML in favor of Markdown — see
 * qwen.ts). If GigaCode's own format ever diverges from Qwen Code's,
 * update this adapter to match.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue } from '../yaml.js';

/**
 * GigaCode adapter for command generation.
 * File path: .gigacode/commands/opsx-<id>.md
 * Format: Markdown with description frontmatter
 */
export const gigacodeAdapter: ToolCommandAdapter = {
  toolId: 'gigacode',

  getFilePath(commandId: string): string {
    return path.join('.gigacode', 'commands', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
