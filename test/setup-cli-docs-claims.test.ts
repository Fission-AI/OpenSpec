import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * `docs/cli.md`'s `openspec setup` section shows a sample run. Its summary is
 * generated, so the sample drifts the moment the wording changes - it already
 * had, showing a header and a file count setup no longer prints. These pin the
 * lines that come from code, the way the other docs-claims tests do.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI_DOC = fs.readFileSync(path.join(repoRoot, 'docs', 'cli.md'), 'utf8');
const SETUP_SECTION = CLI_DOC.split('## `openspec setup`')[1]?.split('\n## ')[0] ?? '';

describe('docs/cli.md setup section', () => {
  it('has a setup section to check', () => {
    expect(SETUP_SECTION.length).toBeGreaterThan(0);
  });

  it('shows the header the summary really prints', () => {
    expect(SETUP_SECTION).toContain('Moved 24 files out of the way, from:');
    expect(SETUP_SECTION).not.toContain('older OpenSpec files to a backup');
  });

  it('shows where the backup went and how to undo it, as the summary does', () => {
    expect(SETUP_SECTION).toContain('into ~/.local/share/openspec/backups/');
    expect(SETUP_SECTION).toContain('`openspec setup --revert` puts them back');
  });

  it('does not claim setup leaves npx copies of its own names alone', () => {
    expect(SETUP_SECTION).not.toContain("not setup's to remove");
  });
});
