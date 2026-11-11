import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKFLOW_TO_SKILL_DIR } from '../src/core/profile-sync-drift.js';
import { DELIVERY_RETIRED_NOTE } from '../src/commands/config.js';
import { ALL_WORKFLOWS } from '../src/core/profiles.js';
import { formatKeptSkills } from '../src/core/shared/shared-skill-install.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf-8');
const UPGRADE = read('docs-lab', 'help', 'upgrade-to-2.md');

// The 2.0 docs and the CLI describe the same move to skills. Pin them to each
// other so neither can drift (#2022).
describe('OpenSpec 2.0 documentation', () => {
  it('maps every 1.x command to the skill that replaces it, by the real skill names', () => {
    for (const workflow of ALL_WORKFLOWS) {
      expect(UPGRADE, workflow).toContain(`| \`/opsx:${workflow}\` | \`${WORKFLOW_TO_SKILL_DIR[workflow]}\` |`);
    }
  });

  it('warns that an edit inside a skill OpenSpec installs is replaced, quoting the real notice', () => {
    // The guide must not promise that every edit is kept (#2223 review).
    expect(UPGRADE).not.toMatch(/never removed/i);
    expect(UPGRADE).toContain('> [!WARNING]');
    const [notice] = formatKeptSkills([], [], ['.agents/skills/openspec-propose/SKILL.md']);
    expect(UPGRADE).toContain(notice);
    expect(read('.changeset', 'share-skills-in-agents-folder.md')).not.toMatch(/Nothing you edited is deleted/i);
  });

  it('shows the note the CLI prints for the retired delivery setting', () => {
    expect(read('docs-lab', 'reference', 'cli.md')).toContain(DELIVERY_RETIRED_NOTE);
  });

  it('no longer tells anyone to type a command, outside the pages about 1.x', () => {
    // Pages that name /opsx:* only to explain the move away from it.
    const aboutOneX = new Set([
      'docs-lab/help/upgrade-to-2.md',
      'docs-lab/help/legacy/migration.md',
      'docs-lab/reference/glossary.md',
      'docs-lab/start/setup.md',
      'docs-lab/sources.md',
      'docs-lab/README.md',
    ]);
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (entry.name.endsWith('.md')) pages.push(rel);
      }
    };
    walk('docs-lab');
    for (const page of [...pages, 'install.md'].filter((p) => !aboutOneX.has(p))) {
      expect(read(page), page).not.toMatch(/[/@]opsx[:-][a-z]/);
    }
  });

  it('is linked from the pages that mention the change', () => {
    for (const page of [
      ['docs-lab', 'reference', 'supported-tools.md'],
      ['docs-lab', 'start', 'setup.md'],
      ['docs-lab', 'customize', 'profiles.md'],
      ['README.md'],
    ]) {
      expect(read(...page), page.join('/')).toMatch(/upgrade-to-2/);
    }
  });
});
