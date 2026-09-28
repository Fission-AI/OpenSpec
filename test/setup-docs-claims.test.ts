import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeAdapter } from '../src/core/command-generation/adapters/claude.js';
import { AI_TOOLS } from '../src/core/config.js';
import { CORE_WORKFLOWS } from '../src/core/profiles.js';
import { MAX_CONTEXT_SIZE } from '../src/core/project-config.js';

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
  it('documents the project.md migration boundaries', () => {
    expect(SETUP).toContain(
      'When interactive init creates a new `openspec/config.yaml` and finds `openspec/project.md`'
    );
    expect(SETUP).toContain(
      '? Copy openspec/project.md into the new config.yaml context? The project.md file will be kept. (Y/n)'
    );
    expect(SETUP).toContain(
      '**Accept**: init copies the content into `context:` and keeps `project.md`.'
    );
    expect(SETUP).toContain(
      '**Decline**: init creates `config.yaml` without copying the content.'
    );
    expect(SETUP).toContain('**Non-interactive runs**: init leaves the migration manual');
    expect(SETUP).toContain(
      '**Unreadable or oversized**: init skips content it cannot read or content'
    );
    expect(SETUP).toContain(
      `content that would exceed the ${MAX_CONTEXT_SIZE / 1024} KB context limit`
    );
    expect(SETUP).toContain('It keeps `project.md`.');
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
