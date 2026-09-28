import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeAdapter } from '../src/core/command-generation/adapters/claude.js';
import { AI_TOOLS } from '../src/core/config.js';
import { formatProjectMdMigrationHint } from '../src/core/legacy-cleanup.js';
import { CORE_WORKFLOWS } from '../src/core/profiles.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SETUP = fs.readFileSync(
  path.join(REPO_ROOT, 'docs-lab', 'start', 'setup.md'),
  'utf-8'
);
const PROFILES = fs.readFileSync(
  path.join(REPO_ROOT, 'docs-lab', 'customize', 'profiles.md'),
  'utf-8'
);
const CORE_SECTION = PROFILES.split('## The core set')[1].split(
  '## Expanding the set: optional workflows'
)[0];

describe('setup documentation', () => {
  it('matches the AI-assisted project.md migration guidance', () => {
    const hint = formatProjectMdMigrationHint();
    const claims = [
      'Review openspec/project.md and migrate its useful content to',
      'Keep context concise',
      'only project-wide',
      'every planning request',
      'rules for the matching artifacts',
      'Leave out generic',
      'outdated, or verbose material',
      'Do not delete project.md',
    ];

    expect(SETUP).toContain('Init does not copy legacy `openspec/project.md`');
    for (const claim of claims) {
      expect(hint).toContain(claim);
      expect(SETUP).toContain(claim);
    }
    expect(hint).toContain('Review config.yaml, then delete project.md when ready.');
    expect(SETUP).toContain('Review `config.yaml`, then delete `project.md` when ready.');
  });

  it('keeps the Claude Code paths and recovery commands aligned with OpenSpec', () => {
    const claude = AI_TOOLS.find((tool) => tool.value === 'claude');
    const claudeCommandPath = claudeAdapter.getFilePath('<id>').split(path.sep).join('/');

    expect(claude?.skillsDir).toBeDefined();
    expect(SETUP).toContain(`\`${claude?.skillsDir}/skills/openspec-*/SKILL.md\``);
    expect(SETUP).toContain(`\`${claudeCommandPath}\``);
    expect(SETUP).toContain('openspec config set delivery both');
    expect(SETUP).toContain('openspec update');
    expect(SETUP).toContain('`/openspec-propose`');
  });

  it('lists every workflow in the core profile', () => {
    for (const workflow of CORE_WORKFLOWS) {
      expect(CORE_SECTION).toContain(`\`${workflow}\``);
    }
  });
});
