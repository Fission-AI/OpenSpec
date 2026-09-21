import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeAdapter } from '../src/core/command-generation/adapters/claude.js';
import { CORE_WORKFLOWS } from '../src/core/profiles.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TROUBLESHOOTING = fs.readFileSync(
  path.join(REPO_ROOT, 'docs', 'troubleshooting.md'),
  'utf-8'
);
const COMMANDS_SECTION = TROUBLESHOOTING.split("## Commands don't show up")[1].split(
  '## Working with changes'
)[0];

describe('command troubleshooting documentation', () => {
  it('keeps the Claude Code paths and recovery commands aligned with OpenSpec', () => {
    const claudeCommandPath = claudeAdapter.getFilePath('<id>').split(path.sep).join('/');

    expect(COMMANDS_SECTION).toContain(`\`${claudeCommandPath}\``);
    expect(COMMANDS_SECTION).toContain('openspec config set delivery both');
    expect(COMMANDS_SECTION).toContain('openspec update');
    expect(COMMANDS_SECTION).toContain('`/openspec-propose`');
  });

  it('lists every workflow in the core profile', () => {
    for (const workflow of CORE_WORKFLOWS) {
      expect(COMMANDS_SECTION).toContain(`\`${workflow}\``);
    }
  });
});
