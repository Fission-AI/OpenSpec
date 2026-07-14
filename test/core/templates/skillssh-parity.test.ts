import { readFileSync } from 'node:fs';
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
});
