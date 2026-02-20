/**
 * Available Tools Detection
 *
 * Detects which AI tools are available in a project by scanning
 * for their configuration directories.
 */

import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS, type AIToolOption } from './config.js';

/**
 * Scans the project path for AI tool configuration directories and returns
 * the tools that are present.
 *
 * Checks for each tool's `skillsDir` (e.g., `.claude/`, `.cursor/`) at the
 * project root. Only tools with a `skillsDir` property are considered.
 */
export function getAvailableTools(projectPath: string): AIToolOption[] {
  return AI_TOOLS.filter((tool) => {
    if (!tool.skillsDir) return false;
    const dirPath = path.join(projectPath, tool.skillsDir);
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  });
}
