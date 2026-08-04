import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// @ts-expect-error - plain ESM helper shared with the generator script
import { cleanSkillSubdirectories, prepareSkillDirectory } from '../../../scripts/skillssh-shared.mjs';

// Guards for scripts/generate-skillssh.mjs: cleanup must never follow a
// symlink, and writes must only ever land in a real directory inside skills/.
describe('skills.sh generator guards', () => {
  let outDir: string;
  let outsideDir: string;

  beforeEach(() => {
    const base = mkdtempSync(join(tmpdir(), 'skillssh-guards-'));
    outDir = join(base, 'skills');
    outsideDir = join(base, 'outside');
    mkdirSync(outDir, { recursive: true });
    mkdirSync(outsideDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(join(outDir, '..'), { recursive: true, force: true });
  });

  /** Dir symlinks need 'junction' to work unprivileged on Windows; skip if unsupported. */
  function trySymlinkDir(target: string, linkPath: string): boolean {
    try {
      symlinkSync(target, linkPath, 'junction');
      return true;
    } catch {
      return false;
    }
  }

  it('cleanup removes stale skill directories but preserves top-level files', () => {
    mkdirSync(join(outDir, 'openspec-renamed-away'));
    writeFileSync(join(outDir, 'openspec-renamed-away', 'SKILL.md'), 'stale', 'utf8');
    writeFileSync(join(outDir, 'README.md'), 'keep me', 'utf8');

    cleanSkillSubdirectories(outDir);

    expect(existsSync(join(outDir, 'openspec-renamed-away'))).toBe(false);
    expect(readFileSync(join(outDir, 'README.md'), 'utf8')).toBe('keep me');
  });

  it('cleanup refuses to run when the tree contains a symlink, deleting nothing at all', () => {
    writeFileSync(join(outsideDir, 'precious.md'), 'do not touch', 'utf8');
    // Sorts before the symlink: proves the scan rejects before any deletion.
    mkdirSync(join(outDir, 'openspec-aaa-real'));
    if (!trySymlinkDir(outsideDir, join(outDir, 'openspec-linked'))) return;

    expect(() => cleanSkillSubdirectories(outDir)).toThrow(/symlink/);
    expect(readFileSync(join(outsideDir, 'precious.md'), 'utf8')).toBe('do not touch');
    expect(existsSync(join(outDir, 'openspec-aaa-real'))).toBe(true);
  });

  it('prepareSkillDirectory rejects path-traversing or non-simple names', () => {
    for (const name of ['../escape', 'a/b', '..', '.hidden', 'UPPER', '']) {
      expect(() => prepareSkillDirectory(outDir, name), name).toThrow(/unsafe skill directory name/);
    }
    expect(existsSync(join(outDir, '..', 'escape'))).toBe(false);
  });

  it('prepareSkillDirectory refuses a pre-existing symlinked skill directory', () => {
    if (!trySymlinkDir(outsideDir, join(outDir, 'openspec-linked'))) return;

    expect(() => prepareSkillDirectory(outDir, 'openspec-linked')).toThrow(/not a real directory/);
  });

  it('prepareSkillDirectory returns a real contained directory for valid names', () => {
    const dir = prepareSkillDirectory(outDir, 'openspec-new-skill');
    expect(dir).toBe(join(outDir, 'openspec-new-skill'));
    expect(lstatSync(dir).isDirectory()).toBe(true);
    expect(lstatSync(dir).isSymbolicLink()).toBe(false);
  });
});
