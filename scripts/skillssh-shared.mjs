/**
 * Shared helpers for the skills.sh distribution generator and its parity test.
 */

import { lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/** Directory (repo-relative) that skills.sh scans for `SKILL.md` files. */
export const SKILLS_DIR = 'skills';

/**
 * Drop the per-release `generatedBy` frontmatter line so the committed
 * skills.sh copies stay byte-stable across OpenSpec version bumps. The line is
 * meaningful only for skills that `openspec init` writes into a project; in the
 * standalone distribution it would just churn the files on every release.
 */
export function stripVolatileFrontmatter(content) {
  return content.replace(/^ {2}generatedBy: .*\n/m, '');
}

/**
 * Remove existing skill subdirectories (clears any renamed/removed skills)
 * while preserving top-level files like README.md. Refuses to run if the tree
 * contains a symlink: deleting one would only unlink it, and a symlinked skill
 * directory would otherwise let later writes land outside the repo.
 */
export function cleanSkillSubdirectories(outDir) {
  mkdirSync(outDir, { recursive: true });
  const entries = readdirSync(outDir, { withFileTypes: true });
  // Reject before deleting anything so a bad tree is left fully intact.
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Refusing to generate: ${join(outDir, entry.name)} is a symlink. Remove it and re-run.`
      );
    }
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      rmSync(join(outDir, entry.name), { recursive: true, force: true });
    }
  }
}

/**
 * Create `<outDir>/<dirName>` and return its path, guaranteeing the write
 * target is a real directory contained in outDir — never a path-traversing
 * name and never a symlink that would redirect the write elsewhere.
 */
export function prepareSkillDirectory(outDir, dirName) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(dirName)) {
    throw new Error(`Refusing to generate: unsafe skill directory name ${JSON.stringify(dirName)}`);
  }
  const skillDir = join(outDir, dirName);
  mkdirSync(skillDir, { recursive: true });
  if (!lstatSync(skillDir).isDirectory()) {
    throw new Error(`Refusing to write through ${skillDir}: not a real directory.`);
  }
  return skillDir;
}
