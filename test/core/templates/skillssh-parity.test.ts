import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  generateSkillFiles,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { transformToSharedSkillReferences } from '../../../src/utils/command-references.js';
// @ts-expect-error - plain ESM helper shared with the generator script
import { SKILLS_DIR, stripVolatileFrontmatter } from '../../../scripts/skillssh-shared.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// The committed `skills/<name>/SKILL.md` tree is the skills.sh distribution
// (`npx skills add Fission-AI/OpenSpec`). It must match what the generator
// would produce from the live templates; regenerate with `pnpm generate:skills`.
describe('skills.sh distribution parity', () => {
  it('keeps committed skills/ in sync with the workflow templates', () => {
    for (const entry of getSkillTemplates()) {
      for (const [file, content] of generateSkillFiles(entry, 'skills.sh', transformToSharedSkillReferences)) {
        const committed = readFileSync(join(repoRoot, SKILLS_DIR, entry.dirName, file), 'utf8');
        expect(committed, `${entry.dirName}/${file} is stale — run \`pnpm generate:skills\``).toBe(
          stripVolatileFrontmatter(content)
        );
      }
    }
  });

  // Guard against extra, renamed, or symlinked entries that the per-template
  // loop above would never visit: the committed tree must be exactly what the
  // generator owns — README.md plus one real directory per template, each
  // holding exactly its generated files.
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

    for (const entry of getSkillTemplates()) {
      const generated = [...generateSkillFiles(entry, 'skills.sh').keys()].sort();
      const committed = readdirSync(join(skillsRoot, entry.dirName), { withFileTypes: true, recursive: true })
        .filter((e) => !e.isDirectory() && !e.name.startsWith('.'));
      for (const e of committed) {
        expect(e.isFile(), `skills/${entry.dirName}/${e.name} must be a regular file`).toBe(true);
      }
      expect(
        committed.map((e) => relative(join(skillsRoot, entry.dirName), join(e.parentPath, e.name)).split(sep).join('/')).sort(),
        `skills/${entry.dirName} must contain only its generated files`
      ).toEqual(generated);
    }
  });
});
