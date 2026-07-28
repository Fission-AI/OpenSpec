/**
 * Devin Desktop Command Adapter
 *
 * Formats commands for Devin Desktop following its frontmatter specification.
 * Devin Desktop reads Cascade-style workflows from `.devin/workflows/`, the
 * same shape Windsurf uses.
 */

import path from 'path';
import { transformToHyphenCommands } from '../../../utils/command-references.js';
import type { CommandContent, ToolCommandAdapter } from '../types.js';
import { escapeYamlValue, formatTagsArray } from '../yaml.js';

/**
 * Devin Desktop adapter for command generation.
 * File path: .devin/workflows/opsx-<id>.md
 * Frontmatter: name, description, category, tags
 *
 * Devin discovers `.devin/workflows/opsx-apply.md` as `/opsx-apply`, so the
 * body's `/opsx:*` references are rewritten to the hyphen form the tool
 * actually registers.
 */
export const devinAdapter: ToolCommandAdapter = {
  toolId: 'devin',

  getFilePath(commandId: string): string {
    return path.join('.devin', 'workflows', `opsx-${commandId}.md`);
  },

  formatFile(content: CommandContent): string {
    const transformedBody = transformToHyphenCommands(content.body);

    return `---
name: ${escapeYamlValue(content.name)}
description: ${escapeYamlValue(content.description)}
category: ${escapeYamlValue(content.category)}
tags: ${formatTagsArray(content.tags)}
---

${transformedBody}
`;
  },
};
