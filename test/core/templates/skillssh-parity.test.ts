import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generateOpenSpecSkillSet, workflowSkillName } from '../../../src/core/shared/openspec-skill.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';
// @ts-expect-error - plain ESM helper shared with the generator script
import { SKILLS_DIR, stripVolatileFrontmatter } from '../../../scripts/skillssh-shared.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const generated = generateOpenSpecSkillSet({
  workflows: ALL_WORKFLOWS,
  version: 'skills.sh',
  skillName: workflowSkillName,
  invoke: (id) => `/${workflowSkillName(id)}`,
});

// The committed `skills/` tree is the skills.sh distribution
// (`npx skills add Fission-AI/OpenSpec`). It must match what the generator
// would produce from the live templates; regenerate with `pnpm generate:skills`.
describe('skills.sh distribution parity', () => {
  it('keeps committed skills/ in sync with the workflow templates', () => {
    for (const skill of generated) {
      for (const file of skill.files) {
        const committed = readFileSync(join(repoRoot, SKILLS_DIR, skill.dirName, file.relativePath), 'utf8');
        expect(committed, `${skill.dirName}/${file.relativePath} is stale — run \`pnpm generate:skills\``).toBe(
          stripVolatileFrontmatter(file.content)
        );
      }
    }
  });

  // The committed tree must be exactly what the generator owns: README.md plus
  // one directory per generated skill, each holding exactly its files.
  it('commits exactly the generated file set — no extra or symlinked entries', () => {
    const skillsRoot = join(repoRoot, SKILLS_DIR);
    const entries = readdirSync(skillsRoot, { withFileTypes: true });
    for (const entry of entries) {
      expect(entry.isSymbolicLink(), `skills/${entry.name} must not be a symlink`).toBe(false);
    }
    // Hidden files like .DS_Store are tolerated; hidden directories are not.
    expect(entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()).toEqual(
      generated.map((skill) => skill.dirName).sort()
    );
    expect(entries.filter((e) => e.isFile() && !e.name.startsWith('.')).map((e) => e.name)).toEqual(['README.md']);

    for (const skill of generated) {
      const skillDir = join(skillsRoot, skill.dirName);
      const listed: string[] = [];
      for (const entry of readdirSync(skillDir, { withFileTypes: true, recursive: true })) {
        if (entry.isFile() && entry.name.startsWith('.')) continue;
        const relative = join(entry.parentPath, entry.name).slice(skillDir.length + 1);
        expect(entry.isSymbolicLink(), `skills/${skill.dirName}/${relative} must not be a symlink`).toBe(false);
        if (entry.isFile()) listed.push(relative.split('\\').join('/'));
      }
      expect(listed.sort(), skill.dirName).toEqual(skill.files.map((file) => file.relativePath).sort());
    }
  });
});
