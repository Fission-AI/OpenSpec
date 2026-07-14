/**
 * Shared helpers for the skills.sh distribution generator and its parity test.
 */

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
