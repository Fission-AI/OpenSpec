import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { gitHasUncommittedChanges } from '../../../src/core/store/git.js';

/**
 * `git status --porcelain` in a repo with a very large dirty tree used to blow
 * past execFile's default 1 MB maxBuffer. The probe's catch turned that into
 * `null` — "git facts unavailable" — so doctor silently stopped reporting
 * uncommitted changes on exactly the repos most likely to have them.
 */
describe('store git probe output limits', () => {
  let repoRoot: string;

  beforeAll(async () => {
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-git-probe-'));
    execFileSync('git', ['init', '-q'], { cwd: repoRoot });

    // Untracked directories collapse to one porcelain line, so the files have
    // to sit at the repo root. ~250 chars per name × 6000 files ≈ 1.5 MB.
    const name = 'f'.repeat(240);
    await Promise.all(
      Array.from({ length: 6000 }, (_, i) =>
        fs.writeFile(path.join(repoRoot, `${name}${String(i).padStart(5, '0')}`), '')
      )
    );
  }, 120_000);

  afterAll(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  it('reports uncommitted changes when status output exceeds 1 MB', async () => {
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    // Guard the guard: a smaller tree would make the assertion below vacuous.
    expect(status.length).toBeGreaterThan(1024 * 1024);

    await expect(gitHasUncommittedChanges(repoRoot)).resolves.toBe(true);
  }, 60_000);
});
