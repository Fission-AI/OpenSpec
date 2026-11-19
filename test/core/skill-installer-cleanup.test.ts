import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs, existsSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { version } from '../../package.json';
import { installReleaseSkills } from '../../src/core/skill-installer.js';

describe('the temporary folder behind a skill install', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fail a working install when it cannot be removed', async () => {
    const dir = realpathSync(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-cleanup-')));
    const rm = fs.rm.bind(fs);
    vi.spyOn(fs, 'rm').mockImplementation((target, options) =>
      String(target).includes('openspec-skills-') ? Promise.reject(new Error('EBUSY')) : rm(target, options)
    );

    const failures = await installReleaseSkills(
      { scope: 'project', cwd: dir, agents: ['universal'] } as Parameters<typeof installReleaseSkills>[0],
      ['openspec-explore'],
      version
    );

    expect([...failures.keys()]).toEqual([]);
    expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    vi.restoreAllMocks();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
