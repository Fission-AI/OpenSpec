import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * `npx skills add <repo>` and the skills.sh directory walk every container
 * folder in a repository, `.agents/skills/` among them, so this repo's own
 * maintainer skills are published alongside the ones meant for users unless
 * each is marked. `metadata.internal: true` is the documented way to hide one:
 * it drops out of discovery and installs only under INSTALL_INTERNAL_SKILLS=1.
 * Four of them reached the directory with thousands of installs before the
 * marker was added, so this guard fails the moment a new one is added without
 * it, rather than after it ships.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const maintainerSkills = path.join(repoRoot, '.agents', 'skills');

describe('maintainer skills stay out of the skills.sh directory', () => {
  const names = fs.existsSync(maintainerSkills)
    ? fs
        .readdirSync(maintainerSkills, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  it('finds the maintainer skills', () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it.each(names)('%s is marked internal', (name) => {
    const skill = path.join(maintainerSkills, name, 'SKILL.md');
    expect(fs.existsSync(skill), `${name}/SKILL.md`).toBe(true);
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(skill, 'utf8'))?.[1] ?? '';
    expect(frontmatter, `${name} needs "metadata:\\n  internal: true"`).toMatch(
      /^metadata:\n(?:[ \t]+.*\n)*?[ \t]+internal:[ \t]*true\s*$/m
    );
  });
});
