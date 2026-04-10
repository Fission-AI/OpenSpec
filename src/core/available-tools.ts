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
 * For tools with `detectionPaths`, checks those specific paths (files or
 * directories). Otherwise checks for the tool's `skillsDir` directory at
 * the project root. Only tools with a `skillsDir` property are considered.
 */
export function getAvailableTools(projectPath: string): AIToolOption[] {
  return AI_TOOLS.filter((tool) => {
    if (!tool.skillsDir) return false;

    if (tool.detectionPaths && tool.detectionPaths.length > 0) {
      // statSync without .isDirectory() — detection paths can be files or directories
      return tool.detectionPaths.some((p) => {
        try {
          fs.statSync(path.join(projectPath, p));
          return true;
        } catch {
          return false;
        }
      });
    }

    const dirPath = path.join(projectPath, tool.skillsDir);
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  });
}
