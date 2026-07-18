import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  generateSkillContent,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
// @ts-expect-error - plain ESM helper shared with the generator script
import { SKILLS_DIR, stripVolatileFrontmatter } from '../../../scripts/skillssh-shared.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// The committed `skills/<name>/SKILL.md` tree is the skills.sh distribution
// (`npx skills add Fission-AI/OpenSpec`). It must match what the generator
// would produce from the live templates; regenerate with `pnpm generate:skills`.
describe('skills.sh distribution parity', () => {
  it('keeps committed skills/ in sync with the workflow templates', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const expected = stripVolatileFrontmatter(generateSkillContent(template, 'skills.sh'));
      const committedPath = join(repoRoot, SKILLS_DIR, dirName, 'SKILL.md');
      const committed = readFileSync(committedPath, 'utf8');
      expect(committed, `${dirName} is stale — run \`pnpm generate:skills\``).toBe(expected);
    }
  });

  // Guard against extra, renamed, or symlinked entries that the per-template
  // loop above would never visit: the committed tree must be exactly what the
  // generator owns — README.md plus one real directory per template, each
  // holding a single real SKILL.md.
  it('commits exactly the generated file set — no extra or symlinked entries', () => {
    const skillsRoot = join(repoRoot, SKILLS_DIR);
    const expectedDirs = getSkillTemplates()
      .map(({ dirName }) => dirName)
      .sort();

    const entries = readdirSync(skillsRoot, { withFileTypes: true });
    for (const entry of entries) {
      expect(entry.isSymbolicLink(), `skills/${entry.name} must not be a symlink`).toBe(false);
    }

    // Untracked OS droppings like .DS_Store would fail the exact-set check
    // without telling us anything about the published tree, so hidden *files*
    // are tolerated; hidden directories still fail the dirs assertion.
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const files = entries
      .filter((e) => e.isFile() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
    expect(dirs).toEqual(expectedDirs);
    expect(files).toEqual(['README.md']);

    for (const dir of dirs) {
      const inner = readdirSync(join(skillsRoot, dir), { withFileTypes: true }).filter(
        (e) => !(e.isFile() && e.name.startsWith('.'))
      );
      expect(
        inner.map((e) => e.name),
        `skills/${dir} must contain only SKILL.md`
      ).toEqual(['SKILL.md']);
      expect(inner[0]!.isFile(), `skills/${dir}/SKILL.md must be a regular file`).toBe(true);
    }
  });
});
