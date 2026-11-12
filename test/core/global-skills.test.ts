import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

// Every case runs the real CLI in a fresh process with its own throwaway home:
// the `skills` package settles some folders when it loads, so one process
// cannot stand in for two machines.

const CORE_SKILLS = [
  'openspec-apply-change',
  'openspec-archive-change',
  'openspec-explore',
  'openspec-propose',
  'openspec-sync-specs',
  'openspec-update-change',
];

describe('skills installed for this machine', () => {
  let box: string;
  let home: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    box = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-global-')));
    home = path.join(box, 'home');
    await fs.mkdir(home, { recursive: true });
    env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
      APPDATA: path.join(home, 'AppData', 'Roaming'),
      CODEX_HOME: path.join(home, '.codex'),
      CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    };
  });

  afterEach(async () => {
    await fs.rm(box, { recursive: true, force: true });
  });

  const project = async (name: string): Promise<string> => {
    const dir = path.join(box, name);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };
  const cli = (cwd: string, ...args: string[]) => runCLI(args, { cwd, env, timeoutMs: 60000 });
  const globalSkill = (name: string) => path.join(home, '.agents', 'skills', name, 'SKILL.md');
  const globalSkills = async (): Promise<string[]> => {
    try {
      return (await fs.readdir(path.join(home, '.agents', 'skills'))).sort();
    } catch {
      return [];
    }
  };
  const entries = async (dir: string): Promise<string[]> => (await fs.readdir(dir)).sort();

  it('keeps a scripted init in the project when nothing says otherwise', async () => {
    const dir = await project('app');
    const result = await cli(dir, 'init', '--tools', 'claude');

    expect(result.exitCode).toBe(0);
    expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(await globalSkills()).toEqual([]);
    expect(existsSync(path.join(home, '.claude'))).toBe(false);
  });

  it('installs the skills once for the machine and leaves the project with only openspec/', async () => {
    const dir = await project('app');
    const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'claude,codex');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('6 skills in ~/.agents/skills/ for every project on this machine');
    expect(await entries(dir)).toEqual(['openspec']);
    expect(await globalSkills()).toEqual(CORE_SKILLS);
    // Claude Code reads its own folder, so it gets each skill there too.
    expect(readFileSync(path.join(home, '.claude', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).toBe(
      readFileSync(globalSkill('openspec-propose'), 'utf8')
    );
    // The `skills` package tracks them in its own lock file.
    const lock = JSON.parse(readFileSync(path.join(home, '.agents', '.skill-lock.json'), 'utf8'));
    expect(Object.keys(lock.skills).sort()).toEqual(CORE_SKILLS);
  });

  it('installs the same text a project install writes', async () => {
    const inProject = await project('in-project');
    const usesGlobal = await project('uses-global');
    await cli(inProject, 'init', '--scope', 'project', '--tools', 'claude');
    await cli(usesGlobal, 'init', '--scope', 'global', '--tools', 'claude');

    for (const name of CORE_SKILLS) {
      expect(readFileSync(globalSkill(name), 'utf8')).toBe(
        readFileSync(path.join(inProject, '.agents', 'skills', name, 'SKILL.md'), 'utf8')
      );
    }
  });

  it('rejects a scope it does not know', async () => {
    const result = await cli(await project('app'), 'init', '--scope', 'everywhere', '--tools', 'claude');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Invalid --scope "everywhere". Use global or project.');
  });

  it('uses the global skills for the next project without being told again', async () => {
    await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'claude');
    const second = await project('second');
    const result = await cli(second, 'init', '--tools', 'claude');

    expect(result.exitCode).toBe(0);
    expect(await entries(second)).toEqual(['openspec']);
  });

  it('honours a saved choice of project over a global install', async () => {
    await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'claude');
    const saved = await cli(box, 'config', 'set', 'skillsScope', 'project');
    expect(saved.exitCode).toBe(0);
    const second = await project('second');
    await cli(second, 'init', '--tools', 'claude');

    expect(existsSync(path.join(second, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });

  it('puts the skills in the project when asked to, even with a global install', async () => {
    await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'claude');
    const second = await project('second');
    await cli(second, 'init', '--scope', 'project', '--tools', 'claude');

    expect(existsSync(path.join(second, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });

  it('adds tools to the global install and never drops the ones already there', async () => {
    await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'claude');
    await cli(await project('second'), 'init', '--scope', 'global', '--tools', 'qwen');

    expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(existsSync(path.join(home, '.qwen', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });

  it('says so when a tool has no machine-wide folder, and still sets up the rest', async () => {
    const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude,oh-my-pi');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Oh My Pi has no machine-wide skills folder, so it can't use the global skills.");
    expect(await globalSkills()).toEqual(CORE_SKILLS);
  });

  it('refuses Copilot cloud files, which need the skills in the project', async () => {
    const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'github-copilot', '--copilot-cloud');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Add --scope project.');
    expect(await globalSkills()).toEqual([]);
  });

  describe('update', () => {
    it('refreshes the global skills from a project that uses them', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const original = readFileSync(globalSkill('openspec-propose'), 'utf8');
      await fs.writeFile(globalSkill('openspec-propose'), 'stale');

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Updated the 6 skills for this machine in ~/.agents/skills');
      expect(result.stdout).not.toContain('No configured tools found');
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).toBe(original);
    });

    it('refreshes them from outside any project', async () => {
      await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude');
      await fs.writeFile(globalSkill('openspec-explore'), 'stale');

      const result = await cli(await project('not-a-project'), 'update');

      expect(result.exitCode).toBe(0);
      expect(readFileSync(globalSkill('openspec-explore'), 'utf8')).not.toBe('stale');
    });

    it('still asks for a project when there is no global install', async () => {
      const result = await cli(await project('not-a-project'), 'update');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No OpenSpec directory found. Run 'openspec init' first.");
    });

    it('follows the profile, and leaves skills that are not OpenSpec installs alone', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const mine = path.join(home, '.agents', 'skills', 'my-skill', 'SKILL.md');
      const sameName = globalSkill('openspec-verify-change');
      for (const file of [mine, sameName]) {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, '---\nname: mine\ndescription: mine\n---\n');
      }
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      await fs.mkdir(path.dirname(configFile), { recursive: true });
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore'] }));

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(await globalSkills()).toEqual(['my-skill', 'openspec-explore', 'openspec-propose', 'openspec-verify-change']);
      expect(readFileSync(sameName, 'utf8')).toContain('name: mine');
      expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-apply-change'))).toBe(false);
    });

    it('updates a project with its own skills too, and points out the double copy', async () => {
      const own = await project('own');
      await cli(own, 'init', '--scope', 'project', '--tools', 'claude');
      await cli(await project('other'), 'init', '--scope', 'global', '--tools', 'claude');

      const result = await cli(own, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('up to date');
      expect(result.stdout).toContain('Updated the 6 skills for this machine');
      expect(result.stdout).toContain('To use only the global ones here: openspec init --scope global');
      expect(existsSync(path.join(own, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    });

    it('lists the global refresh in a dry run and writes nothing', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const edited = `${readFileSync(globalSkill('openspec-propose'), 'utf8')}\nmy note\n`;
      await fs.writeFile(globalSkill('openspec-propose'), edited);

      const result = await cli(dir, 'update', '--dry-run', '--json');

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).notes).toEqual([
        {
          code: 'global-skills',
          message: 'Update will also refresh the 6 OpenSpec skills installed for this machine in ~/.agents/skills.',
        },
      ]);
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).toBe(edited);
    });

    it('changes nothing for a machine without the global skills', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--tools', 'claude');

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('for this machine');
      expect(await globalSkills()).toEqual([]);
    });
  });

  describe('moving a project to the global skills', () => {
    it('removes the project copies and installs the global ones', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--tools', 'claude');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
      expect(await globalSkills()).toEqual(CORE_SKILLS);
      // The next update treats it as a project that uses the global skills.
      const update = await cli(dir, 'update');
      expect(update.stdout).not.toContain('No configured tools found');
      expect(await entries(dir)).toEqual(['openspec']);
    });

    it('stops before removing anything when a project skill was edited', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--tools', 'claude');
      const edited = path.join(dir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      await fs.writeFile(edited, 'my own notes');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('These skills have your own changes, so the project keeps its copy: .agents/skills/openspec-explore');
      expect(readFileSync(edited, 'utf8')).toBe('my own notes');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(await globalSkills()).toEqual([]);
    });
  });
});
