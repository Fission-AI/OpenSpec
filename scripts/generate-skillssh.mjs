#!/usr/bin/env node

/**
 * Generate the static skills.sh distribution of the OpenSpec workflow skills.
 *
 * skills.sh installs skills by reading committed `SKILL.md` files straight from
 * a GitHub repo. This script builds the committed `skills/<name>/SKILL.md`
 * files used by both `openspec init` and `npx skills add Fission-AI/OpenSpec`.
 *
 * The committed copies are kept honest by `test/core/templates/skillssh-parity.test.ts`,
 * which regenerates and diffs against disk. Run this after any skill-template
 * change: `pnpm build && pnpm generate:skills`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getSkillTemplates, generateSkillFiles } from '../dist/core/shared/skill-generation.js';
import { transformToSharedSkillReferences } from '../dist/utils/command-references.js';
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
  // skills.sh installs skill folders only — no /opsx:* commands exist in
  // that channel, so references must point at the skills themselves.
  const skillDir = prepareSkillDirectory(outDir, dirName);
  for (const [file, content] of generateSkillFiles(template, 'skills.sh', transformToSharedSkillReferences)) {
    mkdirSync(dirname(join(skillDir, file)), { recursive: true });
    writeFileSync(join(skillDir, file), stripVolatileFrontmatter(content), 'utf8');
  }
  count++;
}

console.log(`Generated ${count} skills into ${SKILLS_DIR}/`);
