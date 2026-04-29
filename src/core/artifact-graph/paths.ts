import * as path from 'node:path';
import type { Artifact } from './types.js';

/**
 * Resolves the base directory for an artifact's outputs.
 *
 * - When `artifact.folder` is unset, returns `changeDir` unchanged.
 * - When `artifact.folder` is set, returns the project-root-relative path.
 *   Project root is derived from `changeDir` using the invariant that
 *   `changeDir` is `<projectRoot>/openspec/changes/<name>/`.
 */
export function resolveArtifactBaseDir(
  artifact: Pick<Artifact, 'folder'>,
  changeDir: string
): string {
  if (!artifact.folder) {
    return changeDir;
  }
  const projectRoot = path.resolve(changeDir, '..', '..', '..');
  return path.resolve(projectRoot, artifact.folder);
}
