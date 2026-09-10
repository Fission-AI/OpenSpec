import { execFileSync } from 'node:child_process';
import { promises as fs, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  GIT_EXEC_OPTIONS,
  GIT_WRITE_EXEC_OPTIONS,
  gitHasUncommittedChanges,
  isProbeResourceFailure,
} from '../../../src/core/store/git.js';

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
    // to sit at the repo root. 125 chars per name × 12000 files ≈ 1.5 MB of
    // porcelain output. Names are kept short deliberately: a longer basename
    // would push the absolute path past Windows' 260-char MAX_PATH, which
    // neither `fs.writeFile` nor `git status` tolerates without opt-in
    // long-path support.
    // Written synchronously, one at a time: 12000 concurrent fs.writeFile
    // handles exhaust the file-descriptor limit (EMFILE) on the macOS and
    // Windows runners.
    const name = 'f'.repeat(120);
    for (let i = 0; i < 12_000; i += 1) {
      writeFileSync(path.join(repoRoot, `${name}${String(i).padStart(5, '0')}`), '');
    }
  }, 180_000);

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

/**
 * The timeout half of the same hardening. Actually wedging a git subprocess for
 * 15 seconds is not something a suite can afford, so the classifier that turns
 * a timed-out probe into a warning (rather than a silent "no git facts") is
 * pinned directly against the error shapes Node produces.
 */
describe('store git probe resource-failure classification', () => {
  it('bounds every probe with a timeout and a hard kill', () => {
    expect(GIT_EXEC_OPTIONS.timeout).toBe(15_000);
    expect(GIT_EXEC_OPTIONS.killSignal).toBe('SIGKILL');
  });

  it('never hard-kills a write, and gives it room for a signing prompt', () => {
    // git traps SIGTERM to remove .git/index.lock on its way out. A signal it
    // cannot catch leaves that lock behind, and every later git command in the
    // user's store then fails with "Another git process seems to be running" -
    // including the best-effort unstage that runs when a commit fails.
    expect('killSignal' in GIT_WRITE_EXEC_OPTIONS).toBe(false);
    // A signed commit can legitimately sit waiting on pinentry or a hardware
    // key, so the write budget is far longer than a probe's.
    expect(GIT_WRITE_EXEC_OPTIONS.timeout).toBeGreaterThanOrEqual(120_000);
  });

  it('classifies a timed-out or overflowing probe as a resource failure', () => {
    // `child_process` reports a timeout kill either as ETIMEDOUT or, once the
    // kill lands, as killed + the signal it sent.
    expect(isProbeResourceFailure(Object.assign(new Error('spawn'), { code: 'ETIMEDOUT' }))).toBe(
      true
    );
    expect(
      isProbeResourceFailure(
        Object.assign(new Error('killed'), { killed: true, signal: 'SIGKILL' })
      )
    ).toBe(true);
    expect(
      isProbeResourceFailure(
        Object.assign(new Error('stdout maxBuffer length exceeded'), {
          code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
        })
      )
    ).toBe(true);
  });

  it('leaves ordinary git answers unclassified', () => {
    // "not a repository" (128) and "git is absent" (ENOENT) are answers, not
    // degraded runs, and must stay silent.
    expect(isProbeResourceFailure(Object.assign(new Error('not a repo'), { code: 128 }))).toBe(
      false
    );
    expect(isProbeResourceFailure(Object.assign(new Error('no git'), { code: 'ENOENT' }))).toBe(
      false
    );
    // A SIGTERM from the user's own shell is not this hardening's business.
    expect(
      isProbeResourceFailure(
        Object.assign(new Error('interrupted'), { killed: true, signal: 'SIGTERM' })
      )
    ).toBe(false);
    expect(isProbeResourceFailure(null)).toBe(false);
    expect(isProbeResourceFailure('ETIMEDOUT')).toBe(false);
  });
});
