/**
 * Codex Legacy Prompt Adapter
 *
 * Codex custom prompts are deprecated and are no longer generated for new
 * setups. This adapter is kept so update/init can find and remove previously
 * generated opsx prompt files from the global Codex home.
 */

import os from 'os';
import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Returns the Codex home directory.
 * Respects the CODEX_HOME env var, defaulting to ~/.codex.
 */
function getCodexHome(): string {
  const envHome = process.env.CODEX_HOME?.trim();
  return path.resolve(envHome ? envHome : path.join(os.homedir(), '.codex'));
}

/**
 * Codex adapter for legacy prompt cleanup.
 * File path: <CODEX_HOME>/prompts/opsx-<id>.md (absolute, global)
 * Frontmatter: description, argument-hint
 */
export const codexAdapter: ToolCommandAdapter = {
  toolId: 'codex',

  getFilePath(commandId: string): string {
    return path.join(getCodexHome(), 'prompts', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
description: ${content.description}
argument-hint: command arguments
---

${content.body}
`;
  },
};
