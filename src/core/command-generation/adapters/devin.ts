/**
 * Devin Desktop Command Adapter
 *
 * Formats commands for Devin Desktop following its frontmatter specification.
 * Devin Desktop reads Cascade-style workflows from `.devin/workflows/`, the
 * same shape Windsurf uses.
 */

import path from 'path';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue, formatTagsArray } from '../yaml.js';

/**
 * Devin Desktop adapter for command generation.
 * File path: .devin/workflows/opsx-<id>.md
 * Frontmatter: name, description, category, tags
 *
 * The `opsx-` filename prefix makes this a flat invocation, so the generator
 * rewrites the body's `/opsx:*` references to the `/opsx-*` form Devin
 * registers — see invocation.ts.
 */
export const devinAdapter: ToolCommandAdapter = {
  toolId: 'devin',

  getFilePath(commandId: string): string {
    return path.join('.devin', 'workflows', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    return `---
name: ${escapeYamlValue(content.name)}
description: ${escapeYamlValue(content.description)}
category: ${escapeYamlValue(content.category)}
tags: ${formatTagsArray(content.tags)}
---

${content.body}
`;
  },
};
