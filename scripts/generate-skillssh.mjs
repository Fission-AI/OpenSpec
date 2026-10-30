#!/usr/bin/env node

/**
 * Generate the static skills.sh distribution of the OpenSpec workflow skills.
 *
 * skills.sh installs skills by reading committed `SKILL.md` files straight from
 * a GitHub repo (`npx skills add Fission-AI/OpenSpec`). This script writes the
 * `openspec` router skill and the thin workflow skills that `openspec setup`
 * installs into the committed `skills/` tree.
 *
 * The committed copies are kept honest by `test/core/templates/skillssh-parity.test.ts`,
 * which regenerates and diffs against disk. Run this after any skill-template
 * change: `pnpm build && pnpm generate:skills`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateOpenSpecSkillSet, workflowSkillName } from '../dist/core/shared/openspec-skill.js';
import { ALL_WORKFLOWS } from '../dist/core/profiles.js';
import {
  cleanSkillSubdirectories,
  prepareSkillDirectory,
  stripVolatileFrontmatter,
  SKILLS_DIR,
} from './skillssh-shared.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, SKILLS_DIR);

cleanSkillSubdirectories(outDir);

// The `openspec` router skill plus one thin skill per workflow, the same set
// `openspec setup` installs to ~/.agents/skills.
const skills = generateOpenSpecSkillSet({
  workflows: ALL_WORKFLOWS,
  version: 'skills.sh',
  skillName: workflowSkillName,
  invoke: (id) => `/${workflowSkillName(id)}`,
});
for (const skill of skills) {
  const skillDir = prepareSkillDirectory(outDir, skill.dirName);
  for (const file of skill.files) {
    const target = join(skillDir, file.relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, stripVolatileFrontmatter(file.content), 'utf8');
  }
}

console.log(`Generated ${skills.length} skills into ${SKILLS_DIR}/`);
