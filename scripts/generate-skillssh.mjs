#!/usr/bin/env node

/**
 * Generate the static skills.sh distribution of the OpenSpec workflow skills.
 *
 * skills.sh installs skills by reading committed `SKILL.md` files straight from
 * a GitHub repo (`npx skills add Fission-AI/OpenSpec`). OpenSpec normally
 * *generates* these skills into a user's project via `openspec init`, so this
 * script mirrors that same output into a committed `skills/<name>/SKILL.md`
 * tree that skills.sh can discover.
 *
 * The committed copies are kept honest by `test/core/templates/skillssh-parity.test.ts`,
 * which regenerates and diffs against disk. Run this after any skill-template
 * change: `pnpm build && pnpm generate:skills`.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSkillTemplates, generateSkillContent } from '../dist/core/shared/skill-generation.js';
import {
  cleanSkillSubdirectories,
  prepareSkillDirectory,
  stripVolatileFrontmatter,
  SKILLS_DIR,
} from './skillssh-shared.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, SKILLS_DIR);

cleanSkillSubdirectories(outDir);

let count = 0;
for (const { template, dirName } of getSkillTemplates()) {
  const content = stripVolatileFrontmatter(generateSkillContent(template, 'skills.sh'));
  const skillDir = prepareSkillDirectory(outDir, dirName);
  writeFileSync(join(skillDir, 'SKILL.md'), content, 'utf8');
  count++;
}

console.log(`Generated ${count} skills into ${SKILLS_DIR}/`);
