/**
 * GSD Command Adapter
 *
 * Formats commands for GSD (Pi's project management system).
 * GSD agent files live in .gsd/agents/*.md with YAML frontmatter
 * containing name and description for the agent definition.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';

/**
 * Escapes a string value for safe YAML output.
 * Quotes the string if it contains special YAML characters.
 */
function escapeYamlValue(value: string): string {
  const needsQuoting = /[:\n\r#{}[\],&*!|>'"%@`]|^\s|\s$/.test(value);
  if (needsQuoting) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * GSD adapter for agent file generation.
 * File path: .gsd/agents/opsx-<id>.md
 * Frontmatter: name, description
 *
 * GSD uses the agent .md files as agent definitions that can be
 * invoked by the GSD subagent system. Command references in the
 * body use hyphen-based format (/opsx-*) for compatibility.
 */
export const gsdAdapter: ToolCommandAdapter = {
  toolId: 'gsd',

  getFilePath(commandId: string): string {
    return path.join('.gsd', 'agents', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: ${escapeYamlValue(content.name)}
description: ${escapeYamlValue(content.description)}
---

${content.body}
`;
  },
};
