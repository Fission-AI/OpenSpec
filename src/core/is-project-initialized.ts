/**
 * Project Initialization Check
 *
 * Utility for checking whether a project has been initialized with OpenSpec.
 * Used to guard commands that require an already-initialized project.
 */

import { existsSync } from 'fs';
import path from 'path';

/**
 * Returns true if the project at the given path has been initialized with
 * OpenSpec (i.e., `openspec/config.yaml` or `openspec/config.yml` exists).
 */
export function isProjectInitialized(projectPath: string): boolean {
  const base = path.join(projectPath, 'openspec');
  return (
    existsSync(path.join(base, 'config.yaml')) ||
    existsSync(path.join(base, 'config.yml'))
  );
}
