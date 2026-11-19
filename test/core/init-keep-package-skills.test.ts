import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, promises as fs, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as globalSkills from '../../src/core/global-skills.js';
import { InitCommand } from '../../src/core/init.js';

describe('setting up machine skills beside `npx skills add` skills', () => {
  let box: string;
  let dir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    box = realpathSync(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-keep-package-')));
    dir = path.join(box, 'app');
    originalEnv = { ...process.env };
    process.env.HOME = path.join(box, 'home');
    process.env.USERPROFILE = path.join(box, 'home');
    process.env.XDG_CONFIG_HOME = path.join(box, 'home', '.config');
    process.env.OPENSPEC_SKILLS_SCOPE = '';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalSkills, 'readGlobalSkills').mockResolvedValue({ skills: [], agents: [] });
    vi.spyOn(globalSkills, 'installGlobalSkills').mockResolvedValue({
      skills: ['openspec-propose'],
      removedSkills: [],
      unchanged: false,
    });
    await fs.mkdir(path.join(dir, 'openspec', 'specs'), { recursive: true });
    await fs.mkdir(path.join(dir, '.agents', 'skills', 'openspec-propose'), { recursive: true });
    await fs.writeFile(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'my edited skill');
    await fs.mkdir(path.join(dir, '.claude', 'skills'), { recursive: true });
    await fs.symlink(
      path.join(dir, '.agents', 'skills', 'openspec-propose'),
      path.join(dir, '.claude', 'skills', 'openspec-propose'),
      'junction'
    );
    await fs.writeFile(
      path.join(dir, 'skills-lock.json'),
      JSON.stringify({ version: 1, skills: { 'openspec-propose': { source: 'Fission-AI/OpenSpec' } } })
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.env = originalEnv;
    await fs.rm(box, { recursive: true, force: true });
  });

  it('leaves the project copies and links in place', async () => {
    await new InitCommand({ scope: 'global', tools: 'claude', keepPackageSkills: true }).execute(dir);

    expect(await fs.readFile(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).toBe(
      'my edited skill'
    );
    expect(existsSync(path.join(dir, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(existsSync(path.join(box, 'home', '.config', 'openspec', 'config.json'))).toBe(false);
  });
});
