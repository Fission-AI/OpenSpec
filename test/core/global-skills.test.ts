import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import os from 'os';
import path from 'path';
import { cliProjectRoot, runCLI } from '../helpers/run-cli.js';
import { CommandAdapterRegistry, generateCommands } from '../../src/core/command-generation/index.js';
import { getCommandContents } from '../../src/core/shared/skill-generation.js';
import { stripVolatileFrontmatter } from '../../scripts/skillssh-shared.mjs';

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

describe('the skills package', () => {
  // One module talks to the package, so a change in its API, lock file or
  // paths lands in one place.
  it('is imported by src/core/global-skills.ts and nothing else', async () => {
    const importers: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name.endsWith('.ts') && /(?:from|import\()\s*['"]skills['"]/.test(await fs.readFile(full, 'utf8'))) {
          importers.push(path.relative(cliProjectRoot, full).split(path.sep).join('/'));
        }
      }
    };
    await walk(path.join(cliProjectRoot, 'src'));

    expect(importers).toEqual(['src/core/global-skills.ts']);
  });
});

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
      // The `skills` package keeps its global lock file here when this is set.
      XDG_STATE_HOME: path.join(home, '.local', 'state'),
      LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
      APPDATA: path.join(home, 'AppData', 'Roaming'),
      CODEX_HOME: path.join(home, '.codex'),
      CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
      // The published skills, read from this checkout instead of cloned from GitHub.
      OPENSPEC_SKILLS_SOURCE: path.join(cliProjectRoot, 'skills'),
      // The suite pins project installs; here the default itself is under test.
      OPENSPEC_SKILLS_SCOPE: '',
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
  const globalLock = () => path.join(home, '.local', 'state', 'skills', '.skill-lock.json');
  const globalSkill = (name: string) => path.join(home, '.agents', 'skills', name, 'SKILL.md');
  const globalSkills = async (): Promise<string[]> => {
    try {
      return (await fs.readdir(path.join(home, '.agents', 'skills'))).sort();
    } catch {
      return [];
    }
  };
  const entries = async (dir: string): Promise<string[]> => (await fs.readdir(dir)).sort();

  it('installs for the machine when a scripted init is told nothing else', async () => {
    const dir = await project('app');
    const result = await cli(dir, 'init', '--tools', 'claude');

    expect(result.exitCode).toBe(0);
    expect(await entries(dir)).toEqual(['openspec']);
    expect(await globalSkills()).toEqual(CORE_SKILLS);
  });

  it('does not save a default nobody chose, so a later run can still install in the project', async () => {
    await cli(await project('first'), 'init', '--tools', 'claude');
    const configFile = path.join(home, '.config', 'openspec', 'config.json');
    const saved = existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : {};
    expect(saved.skillsScope).toBeUndefined();

    // A tool the global skills don't cover still gets its skills, in its project.
    const other = await project('other');
    const result = await cli(other, 'init', '--tools', 'oh-my-pi');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Installing the skills in this project: Oh My Pi isn't covered by the global skills.");
    expect(existsSync(path.join(other, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });

  it('keeps a scripted init in the project when OPENSPEC_SKILLS_SCOPE says so', async () => {
    const dir = await project('app');
    const result = await runCLI(['init', '--tools', 'claude'], {
      cwd: dir,
      env: { ...env, OPENSPEC_SKILLS_SCOPE: 'project' },
      timeoutMs: 60000,
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(await globalSkills()).toEqual([]);
    expect(existsSync(path.join(home, '.claude'))).toBe(false);

    const bad = await runCLI(['init', '--tools', 'claude'], {
      cwd: await project('other'),
      env: { ...env, OPENSPEC_SKILLS_SCOPE: 'everywhere' },
      timeoutMs: 60000,
    });
    expect(bad.exitCode).toBe(1);
    expect(bad.stderr).toContain('Invalid OPENSPEC_SKILLS_SCOPE "everywhere". Use global or project.');
  });

  it('falls back to the project, and says why, when the default cannot serve what was asked', async () => {
    // A tool the global skills don't cover.
    const uncovered = await project('uncovered');
    const first = await cli(uncovered, 'init', '--tools', 'claude,oh-my-pi');
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toContain("Installing the skills in this project: Oh My Pi isn't covered by the global skills.");
    expect(existsSync(path.join(uncovered, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

    // The Copilot cloud files, which need the skills in the project.
    const cloud = await project('cloud');
    const second = await cli(cloud, 'init', '--tools', 'github-copilot', '--copilot-cloud');
    expect(second.exitCode).toBe(0);
    expect(second.stdout).toContain('the Copilot cloud files need the skills in the project');
    expect(existsSync(path.join(cloud, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

    // No git to fetch them with.
    const empty = await project('no-programs-here');
    const noGit = await project('no-git');
    const third = await runCLI(['init', '--tools', 'claude'], {
      cwd: noGit,
      env: { ...env, OPENSPEC_SKILLS_SOURCE: '', PATH: empty, Path: empty },
      timeoutMs: 60000,
    });
    expect(third.exitCode).toBe(0);
    expect(third.stdout).toContain("Installing the skills in this project: git isn't on your PATH.");
    expect(existsSync(path.join(noGit, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

    expect(await globalSkills()).toEqual([]);
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
    const lock = JSON.parse(readFileSync(globalLock(), 'utf8'));
    expect(Object.keys(lock.skills).sort()).toEqual(CORE_SKILLS);
  });

  it('installs the same text a project install writes', async () => {
    const inProject = await project('in-project');
    const usesGlobal = await project('uses-global');
    await cli(inProject, 'init', '--scope', 'project', '--tools', 'claude');
    await cli(usesGlobal, 'init', '--scope', 'global', '--tools', 'claude');

    // The published skills carry no version stamp; everything else is the same text.
    for (const name of CORE_SKILLS) {
      expect(readFileSync(globalSkill(name), 'utf8')).toBe(
        stripVolatileFrontmatter(readFileSync(path.join(inProject, '.agents', 'skills', name, 'SKILL.md'), 'utf8'))
      );
    }
  });

  it('says plainly that git is needed when the skills have to be fetched and git is missing', async () => {
    const empty = await project('no-programs-here');
    const dir = await project('app');
    const result = await runCLI(['init', '--scope', 'global', '--tools', 'claude'], {
      cwd: dir,
      env: { ...env, OPENSPEC_SKILLS_SOURCE: '', PATH: empty, Path: empty },
      timeoutMs: 60000,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("needs git, and it isn't on your PATH");
    // The command to run next, as it can be pasted into a script.
    expect(result.stdout).toContain('openspec init --scope project --tools claude');
    expect(await globalSkills()).toEqual([]);
  });

  // Fetches from GitHub, so it only runs when asked: OPENSPEC_NETWORK_TESTS=1.
  it.skipIf(!process.env.OPENSPEC_NETWORK_TESTS)('clones the published skills from the repository', async () => {
    const dir = await project('app');
    const result = await runCLI(['init', '--scope', 'global', '--tools', 'claude'], {
      cwd: dir,
      env: { ...env, OPENSPEC_SKILLS_SOURCE: '' },
      timeoutMs: 120000,
    });

    expect(result.exitCode).toBe(0);
    expect(await globalSkills()).toEqual(CORE_SKILLS);
    const lock = JSON.parse(readFileSync(globalLock(), 'utf8'));
    expect(lock.skills['openspec-propose'].source).toBe('Fission-AI/OpenSpec');
    expect(lock.skills['openspec-propose'].sourceType).toBe('github');

    const update = await runCLI(['update'], { cwd: dir, env: { ...env, OPENSPEC_SKILLS_SOURCE: '' }, timeoutMs: 120000 });
    expect(update.exitCode).toBe(0);
    expect(update.stdout).toContain('Updated the 6 skills for this machine');
  }, 240000);

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
    expect(result.stdout).toContain("Oh My Pi isn't covered by the global skills.");
    expect(await globalSkills()).toEqual(CORE_SKILLS);
  });

  it('sets nothing up when no selected tool can use the global skills', async () => {
    const dir = await project('app');
    const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'oh-my-pi');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('None of the selected tools are covered by the global skills');
    expect(result.stderr).toContain('openspec init --scope project --tools oh-my-pi');
    expect(await globalSkills()).toEqual([]);
  });

  it('stops for a tool the global skills do not cover, asked for by name, on a machine that already has them', async () => {
    await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'claude');
    const result = await cli(await project('second'), 'init', '--tools', 'oh-my-pi');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('openspec init --scope project --tools oh-my-pi');
  });

  it('refuses Copilot cloud files, which need the skills in the project', async () => {
    const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'github-copilot', '--copilot-cloud');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Add --scope project.');
    expect(await globalSkills()).toEqual([]);
  });

  it('never treats the home folder as a project of its own', async () => {
    await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude');

    const init = await cli(home, 'init', '--scope', 'global', '--tools', 'claude');
    expect(init.exitCode).toBe(1);
    expect(init.stderr).toContain('This is your home folder, where the global skills live.');
    expect(await globalSkills()).toEqual(CORE_SKILLS);

    await fs.mkdir(path.join(home, 'openspec'), { recursive: true });
    const update = await cli(home, 'update');
    expect(update.exitCode).toBe(0);
    expect(existsSync(path.join(home, '.agents', 'skills', '.openspec-target'))).toBe(false);
    expect(await globalSkills()).toEqual(CORE_SKILLS);
  });

  it('leaves MiniMax Code, which already keeps its skills in the home folder, to the project install', async () => {
    const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude,minimax-code');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("MiniMax Code isn't covered by the global skills.");
    expect(existsSync(path.join(home, '.minimax'))).toBe(false);
  });

  describe('update', () => {
    it('refreshes the global skills from a project that uses them', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const original = readFileSync(globalSkill('openspec-propose'), 'utf8');
      await fs.writeFile(globalSkill('openspec-propose'), `${original}\nan older line\n`);

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Updated the 6 skills for this machine in ~/.agents/skills');
      expect(result.stdout).not.toContain('No configured tools found');
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).toBe(original);
    });

    it('refreshes them from outside any project', async () => {
      await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude');
      await fs.appendFile(globalSkill('openspec-explore'), '\nstale\n');

      const result = await cli(await project('not-a-project'), 'update');

      expect(result.exitCode).toBe(0);
      expect(readFileSync(globalSkill('openspec-explore'), 'utf8')).not.toContain('\nstale\n');
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

    it('clears the global skills when the profile has no workflows', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      const saved = JSON.parse(readFileSync(configFile, 'utf8'));
      expect(saved.skillsScope).toBe('global');
      await fs.writeFile(configFile, JSON.stringify({ ...saved, profile: 'custom', workflows: [] }));

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Removed the skills for this machine: your profile has no workflows.');
      expect(await globalSkills()).toEqual([]);

      // The machine still counts as global: the next init does not fall back to the project.
      await fs.writeFile(configFile, JSON.stringify({ ...JSON.parse(readFileSync(configFile, 'utf8')), profile: 'core' }));
      const next = await project('next');
      await cli(next, 'init', '--tools', 'claude');
      expect(await entries(next)).toEqual(['openspec']);
      expect(await globalSkills()).toEqual(CORE_SKILLS);
    });

    it('leaves OpenSpec skills that came from somewhere else to whoever installed them', async () => {
      // What `npx skills add -g` from another source leaves: tracked in the lock, with its own source.
      const theirs = path.join(box, 'their-source', 'openspec-verify-change');
      await fs.mkdir(theirs, { recursive: true });
      await fs.writeFile(path.join(theirs, 'SKILL.md'), '---\nname: openspec-verify-change\ndescription: theirs\n---\ntheirs\n');
      const script =
        "const { installSkills } = await import('skills');" +
        "await installSkills(process.argv[1], { scope: 'global', agents: ['universal'], telemetry: false });";
      execFileSync(process.execPath, ['--input-type=module', '-e', script, path.dirname(theirs)], {
        cwd: cliProjectRoot,
        env: { ...process.env, ...env },
      });
      expect(await globalSkills()).toEqual(['openspec-verify-change']);

      const dir = await project('app');
      // No global install of OpenSpec's own: update has nothing to refresh and init stays in the project.
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

      await cli(await project('other'), 'init', '--scope', 'global', '--tools', 'claude');
      await cli(dir, 'update');

      expect(readFileSync(globalSkill('openspec-verify-change'), 'utf8')).toContain('theirs');
    });

    it('never replaces a skill of the same name that OpenSpec did not install', async () => {
      const mine = globalSkill('openspec-propose');
      await fs.mkdir(path.dirname(mine), { recursive: true });
      await fs.writeFile(mine, '---\nname: openspec-propose\ndescription: mine\n---\nmine\n');
      await fs.writeFile(path.join(path.dirname(mine), 'notes.md'), 'my notes');
      const inClaude = path.join(home, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(inClaude, { recursive: true });
      await fs.writeFile(path.join(inClaude, 'SKILL.md'), '---\nname: openspec-explore\ndescription: mine\n---\nmine\n');

      const dir = await project('app');
      const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("they hold text or files that aren't OpenSpec's");
      expect(readFileSync(mine, 'utf8')).toContain('mine');
      expect(readFileSync(path.join(path.dirname(mine), 'notes.md'), 'utf8')).toBe('my notes');
      expect(readFileSync(path.join(inClaude, 'SKILL.md'), 'utf8')).toContain('mine');
      expect(existsSync(globalSkill('openspec-apply-change'))).toBe(true);

      await cli(dir, 'update');
      expect(readFileSync(mine, 'utf8')).toContain('mine');
    });

    it('still refreshes the global skills when the project update fails', async () => {
      const own = await project('own');
      await cli(own, 'init', '--scope', 'project', '--tools', 'claude');
      await cli(await project('other'), 'init', '--scope', 'global', '--tools', 'claude');
      const edited = `${readFileSync(globalSkill('openspec-propose'), 'utf8')}\nold\n`;
      await fs.writeFile(globalSkill('openspec-propose'), edited);
      // A file where a skill folder belongs makes the project update fail.
      await fs.rm(path.join(own, '.agents', 'skills', 'openspec-propose'), { recursive: true });
      await fs.rm(path.join(own, '.agents', 'skills'), { recursive: true });
      await fs.writeFile(path.join(own, '.agents', 'skills'), 'not a folder');

      const result = await cli(own, 'update', '--force');

      expect(result.exitCode).toBe(1);
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).not.toBe(edited);
    });

    it('updates a project with its own skills too, and points out the double copy', async () => {
      const own = await project('own');
      await cli(own, 'init', '--scope', 'project', '--tools', 'claude');
      await cli(await project('other'), 'init', '--scope', 'global', '--tools', 'claude');

      const result = await cli(own, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('All 1 tool(s) up to date');
      expect(result.stdout).toContain('The 6 skills for this machine are up to date');
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
          message: 'Update will also refresh the OpenSpec skills installed for this machine in ~/.agents/skills.',
        },
        {
          code: 'edited-skills',
          message: expect.stringContaining(
            'Update will replace your edits in 1 skill OpenSpec installs for this machine: openspec-propose.'
          ),
        },
      ]);
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).toBe(edited);
    });

    it('says which edited global skills it replaced, as a project update does', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      await fs.appendFile(globalSkill('openspec-propose'), '\nmy note\n');

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(
        'Replaced your edits in 1 skill OpenSpec installs for this machine: openspec-propose.'
      );
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).not.toContain('my note');

      // Nothing was edited this time, so nothing is reported.
      await fs.rm(path.join(home, '.claude', 'skills', 'openspec-explore'), { recursive: true, force: true });
      const again = await cli(dir, 'update');
      expect(again.stdout).not.toContain('Replaced your edits');
    });

    it('does not call a skill that an earlier `npx skills add` installed an edit', async () => {
      // What `npx skills add Fission-AI/OpenSpec -g` put there under 1.17.0 and 2.0.0.
      const published = path.join(cliProjectRoot, 'test', 'fixtures', 'released-output', 'published-skills');
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const current = readFileSync(globalSkill('openspec-explore'), 'utf8');

      for (const release of ['v1.17.0', 'v2.0.0']) {
        const old = readFileSync(path.join(published, `${release}-openspec-explore.md`), 'utf8');
        expect(old).not.toBe(current);
        await fs.writeFile(globalSkill('openspec-explore'), old);

        const plan = await cli(dir, 'update', '--dry-run', '--json');
        expect(JSON.parse(plan.stdout).notes.map((note: { code: string }) => note.code)).toEqual(['global-skills']);

        const result = await cli(dir, 'update');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Updated the 6 skills for this machine');
        expect(result.stdout).not.toContain('Replaced your edits');
        expect(readFileSync(globalSkill('openspec-explore'), 'utf8')).toBe(current);
      }
    });

    describe('copies in a tool folder of its own', () => {
      // `npx skills add --global` for one tool: real folders in ~/.claude/skills, none in ~/.agents/skills.
      const npxForClaudeOnly = async (): Promise<string> => {
        const skillsCli = path.join(cliProjectRoot, 'node_modules', 'skills', 'bin', 'cli.mjs');
        const elsewhere = await project('elsewhere');
        execFileSync(
          process.execPath,
          [skillsCli, 'add', path.join(cliProjectRoot, 'skills'), '--global', '--agent', 'claude-code', '--yes'],
          { cwd: elsewhere, env: { ...env, PATH: process.env.PATH, DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1' }, stdio: 'ignore' }
        );
        expect(await entries(path.join(home, '.claude', 'skills'))).toHaveLength(12);
        expect(await globalSkills()).toEqual([]);
        return elsewhere;
      };
      const claude = () => path.join(home, '.claude', 'skills');
      const isLink = async (file: string) => (await fs.lstat(file)).isSymbolicLink();
      const oldText = () =>
        readFileSync(
          path.join(cliProjectRoot, 'test', 'fixtures', 'released-output', 'published-skills', 'v2.0.0-openspec-explore.md'),
          'utf8'
        );
      const MINE = '---\nname: openspec-explore\ndescription: mine\n---\nmine\n';

      it('takes over what `npx skills add --global` installed for one tool, and names an edit it replaces', async () => {
        const elsewhere = await npxForClaudeOnly();
        const own = path.join(claude(), 'openspec-propose', 'SKILL.md');
        await fs.appendFile(own, '\nmy note\n');
        await fs.writeFile(path.join(claude(), 'openspec-explore', 'SKILL.md'), oldText());

        const plan = await cli(elsewhere, 'update', '--dry-run');
        expect(plan.stdout).toContain('Update will replace your edits in 1 skill OpenSpec installs for this machine: openspec-propose.');
        expect(readFileSync(own, 'utf8')).toContain('my note');
        const result = await cli(elsewhere, 'update');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Replaced your edits in 1 skill OpenSpec installs for this machine: openspec-propose.');
        // One copy, which Claude Code links to; the skills outside the profile are gone.
        expect(await globalSkills()).toEqual(CORE_SKILLS);
        expect(await entries(claude())).toEqual(CORE_SKILLS);
        for (const name of CORE_SKILLS) {
          expect(readFileSync(path.join(claude(), name, 'SKILL.md'), 'utf8')).toBe(readFileSync(globalSkill(name), 'utf8'));
        }
        const again = await cli(elsewhere, 'update');
        expect(again.stdout).toContain('The 6 skills for this machine are up to date');
        expect(again.stdout).not.toContain('Replaced your edits');
      }, 120000);

      it('gives the machine its one shared copy even when the tool copies already hold the current text', async () => {
        // A tool that reads only the shared folder, such as Codex, would otherwise find nothing.
        const elsewhere = await npxForClaudeOnly();
        const configFile = path.join(home, '.config', 'openspec', 'config.json');
        await fs.mkdir(path.dirname(configFile), { recursive: true });
        await fs.writeFile(
          configFile,
          JSON.stringify({
            profile: 'custom',
            workflows: ['propose', 'explore', 'new', 'continue', 'apply', 'update', 'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard'],
          })
        );

        const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'codex');

        expect(result.exitCode).toBe(0);
        expect(await globalSkills()).toHaveLength(12);
        expect(await isLink(path.join(claude(), 'openspec-propose'))).toBe(true);
        expect((await cli(elsewhere, 'update')).stdout).toContain('The 12 skills for this machine are up to date');
      }, 120000);

      it('leaves a tool alone, and claims nothing, when every copy there was edited', async () => {
        const elsewhere = await npxForClaudeOnly();
        for (const name of await entries(claude())) await fs.appendFile(path.join(claude(), name, 'SKILL.md'), '\nmy note\n');

        const plan = await cli(elsewhere, 'update', '--dry-run');
        const result = await cli(elsewhere, 'update');

        expect(result.exitCode).toBe(0);
        expect(plan.stdout).not.toContain('replace your edits');
        expect(result.stdout).not.toContain('Replaced your edits');
        expect(await entries(claude())).toHaveLength(12);
        for (const name of await entries(claude())) {
          expect(readFileSync(path.join(claude(), name, 'SKILL.md'), 'utf8')).toContain('my note');
        }
      }, 120000);

      it("replaces a tool's older copy even when the shared copy is current", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        const copy = path.join(claude(), 'openspec-explore');
        await fs.rm(copy, { recursive: true, force: true });
        await fs.mkdir(copy, { recursive: true });
        await fs.writeFile(path.join(copy, 'SKILL.md'), oldText());

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Updated the 6 skills for this machine');
        expect(result.stdout).not.toContain('Replaced your edits');
        expect(readFileSync(path.join(copy, 'SKILL.md'), 'utf8')).toBe(readFileSync(globalSkill('openspec-explore'), 'utf8'));
        expect((await cli(dir, 'update')).stdout).toContain('The 6 skills for this machine are up to date');
      });

      it("never sets a tool up because a folder there has a skill's name", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'codex');
        // A tool with a folder of its own that this machine was never set up for.
        const notes = path.join(home, '.qwen', 'skills', 'openspec-explore', 'notes.md');
        const mine = path.join(home, '.qwen', 'skills', 'openspec-propose', 'SKILL.md');
        for (const [file, text] of [[notes, 'my notes'], [mine, MINE]]) {
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, text);
        }

        const result = await cli(dir, 'update', '--force');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(notes, 'utf8')).toBe('my notes');
        expect(readFileSync(mine, 'utf8')).toBe(MINE);
        expect(await entries(path.join(home, '.qwen', 'skills'))).toEqual(['openspec-explore', 'openspec-propose']);
        expect(await entries(path.join(home, '.qwen', 'skills', 'openspec-explore'))).toEqual(['notes.md']);
      });

      it("keeps the user's own folder in a tool that is set up by copies", async () => {
        const elsewhere = await npxForClaudeOnly();
        // Not the package's install of that skill: the user's own, under the same name.
        const notes = path.join(claude(), 'openspec-explore', 'notes.md');
        await fs.rm(path.join(claude(), 'openspec-explore'), { recursive: true });
        await fs.mkdir(path.dirname(notes), { recursive: true });
        await fs.writeFile(notes, 'my notes');
        await fs.writeFile(path.join(claude(), 'openspec-propose', 'SKILL.md'), oldText());

        const result = await cli(elsewhere, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(notes, 'utf8')).toBe('my notes');
        expect(await entries(path.join(claude(), 'openspec-explore'))).toEqual(['notes.md']);
        // The rest of the tool is still brought up to date.
        expect(readFileSync(path.join(claude(), 'openspec-propose', 'SKILL.md'), 'utf8')).toBe(
          readFileSync(globalSkill('openspec-propose'), 'utf8')
        );
      }, 120000);

      it("never replaces the user's own skill because the lock file lists that name", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'codex');
        // The shared copies are deleted by hand; the lock file still lists them.
        await fs.rm(path.join(home, '.agents', 'skills'), { recursive: true });
        const mine = path.join(claude(), 'openspec-explore', 'SKILL.md');
        await fs.mkdir(path.dirname(mine), { recursive: true });
        await fs.writeFile(mine, MINE);

        const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');

        expect(readFileSync(mine, 'utf8')).toBe(MINE);
        expect(result.stdout + result.stderr).not.toContain('Replaced your edits');
      });

      it('leaves a tool whose folder is the shared folder itself alone', async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'codex');
        await fs.mkdir(path.join(home, '.claude'), { recursive: true });
        await fs.symlink(path.join(home, '.agents', 'skills'), claude(), 'junction');
        await fs.writeFile(globalSkill('openspec-explore'), oldText());

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(await isLink(claude())).toBe(true);
        expect(await globalSkills()).toEqual(CORE_SKILLS);
        expect(await isLink(path.join(home, '.agents', 'skills', 'openspec-explore'))).toBe(false);
        expect(readFileSync(globalSkill('openspec-explore'), 'utf8')).not.toBe(oldText());
        expect((await cli(dir, 'update')).stdout).toContain('The 6 skills for this machine are up to date');
      });

      describe('Antigravity, which the package gives a folder of its own', () => {
        const antigravity = () => path.join(home, '.gemini', 'config', 'skills');

        it('gets the skills when it is the only tool, and they are refreshed on update', async () => {
          const dir = await project('app');
          const init = await cli(dir, 'init', '--scope', 'global', '--tools', 'antigravity');
          expect(init.exitCode).toBe(0);
          expect(await entries(antigravity())).toEqual(CORE_SKILLS);
          await fs.writeFile(path.join(antigravity(), 'openspec-explore', 'SKILL.md'), oldText());

          const result = await cli(dir, 'update');

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain('Updated the 6 skills for this machine');
          expect(readFileSync(path.join(antigravity(), 'openspec-explore', 'SKILL.md'), 'utf8')).toBe(
            readFileSync(globalSkill('openspec-explore'), 'utf8')
          );
          expect((await cli(dir, 'update')).stdout).toContain('The 6 skills for this machine are up to date');
        });

        it('gets the skills when it is added to a machine whose skills are current', async () => {
          await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'claude');

          const result = await cli(await project('second'), 'init', '--scope', 'global', '--tools', 'antigravity');

          expect(result.exitCode).toBe(0);
          expect(await entries(antigravity())).toEqual(CORE_SKILLS);
          expect(existsSync(path.join(antigravity(), 'openspec-explore', 'SKILL.md'))).toBe(true);
        });

        it("leaves the user's own skill there alone, says so, and still refreshes the rest", async () => {
          const dir = await project('app');
          await cli(dir, 'init', '--scope', 'global', '--tools', 'antigravity');
          const mine = path.join(antigravity(), 'openspec-explore', 'SKILL.md');
          await fs.writeFile(mine, MINE);
          await fs.appendFile(path.join(antigravity(), 'openspec-propose', 'SKILL.md'), '\nmy note\n');
          await fs.writeFile(path.join(antigravity(), 'openspec-apply-change', 'SKILL.md'), oldText().replace('openspec-explore', 'openspec-apply-change'));

          const result = await cli(dir, 'update', '--force');

          expect(result.exitCode).toBe(0);
          expect(readFileSync(mine, 'utf8')).toBe(MINE);
          // An edited copy can't be told from a skill of the user's own, so it is kept and named too.
          expect(readFileSync(path.join(antigravity(), 'openspec-propose', 'SKILL.md'), 'utf8')).toContain('my note');
          expect(result.stdout).toContain('Left openspec-');
          expect(result.stdout).toContain('openspec-explore');
          expect(result.stdout).toContain('openspec-propose');
          expect(readFileSync(path.join(antigravity(), 'openspec-sync-specs', 'SKILL.md'), 'utf8')).toBe(
            readFileSync(globalSkill('openspec-sync-specs'), 'utf8')
          );
        });
      });

      it("keeps the user's own skill where a link was, even when the shared copy of it is gone", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        // The lock file still lists the skill; the only folder of that name is now the user's.
        await fs.rm(path.join(home, '.agents', 'skills', 'openspec-explore'), { recursive: true });
        const mine = path.join(claude(), 'openspec-explore', 'SKILL.md');
        await fs.rm(path.dirname(mine), { recursive: true, force: true });
        await fs.mkdir(path.dirname(mine), { recursive: true });
        await fs.writeFile(mine, MINE);

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(mine, 'utf8')).toBe(MINE);
        expect(result.stdout).not.toContain('Replaced your edits');
        expect(result.stdout).toContain('Left openspec-explore in your home folder alone');
      });

      it("keeps a tool's copy that has the user's files beside the skill, and settles", async () => {
        const elsewhere = await npxForClaudeOnly();
        const notes = path.join(claude(), 'openspec-explore', 'notes.md');
        await fs.writeFile(notes, 'my notes');
        await fs.writeFile(path.join(claude(), 'openspec-propose', 'SKILL.md'), oldText());

        const result = await cli(elsewhere, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(notes, 'utf8')).toBe('my notes');
        expect(result.stdout).toContain('Left openspec-explore in your home folder alone');
        expect(await isLink(path.join(claude(), 'openspec-propose'))).toBe(true);
        const again = await cli(elsewhere, 'update');
        expect(again.stdout).toContain('The 6 skills for this machine are up to date');
        expect(readFileSync(notes, 'utf8')).toBe('my notes');
      }, 120000);

      it("keeps a folder in the shared folder that holds the user's files, through a forced update and a dropped skill", async () => {
        const configFile = path.join(home, '.config', 'openspec', 'config.json');
        const setWorkflows = async (workflows: string[]) => {
          await fs.mkdir(path.dirname(configFile), { recursive: true });
          await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows }));
        };
        // Before anything is installed: a folder with a skill's name and only notes in it.
        const early = path.join(home, '.agents', 'skills', 'openspec-explore', 'notes.md');
        await fs.mkdir(path.dirname(early), { recursive: true });
        await fs.writeFile(early, 'early notes');
        await setWorkflows(['propose', 'explore', 'apply', 'verify']);
        const dir = await project('app');

        const init = await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        expect(init.stdout).toContain('Left openspec-explore in your home folder alone');
        expect(await entries(path.dirname(early))).toEqual(['notes.md']);

        // Notes beside two skills OpenSpec did install: one stays in the profile, one is dropped.
        const kept = path.join(home, '.agents', 'skills', 'openspec-propose', 'notes.md');
        const dropped = path.join(home, '.agents', 'skills', 'openspec-verify-change', 'notes.md');
        await fs.writeFile(kept, 'kept notes');
        await fs.writeFile(dropped, 'dropped notes');
        await setWorkflows(['propose', 'explore', 'apply']);

        const result = await cli(dir, 'update', '--force');

        expect(result.exitCode, result.stdout + result.stderr).toBe(0);
        expect(result.stdout).toContain('Left openspec-explore, openspec-propose, openspec-verify-change in your home folder alone');
        expect(result.stdout).not.toContain('Removed');
        // The dropped skill is gone from the tool, and its folder stays for the notes in it.
        expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-verify-change'))).toBe(false);
        expect(readFileSync(early, 'utf8')).toBe('early notes');
        expect(readFileSync(kept, 'utf8')).toBe('kept notes');
        expect(readFileSync(dropped, 'utf8')).toBe('dropped notes');
      });

      it("never takes MiniMax Code's folder over because one entry there is a link", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'project', '--tools', 'claude,minimax-code');
        await cli(dir, 'init', '--scope', 'global');
        const minimax = path.join(home, '.minimax', 'skills');
        await fs.rm(path.join(minimax, 'openspec-explore'), { recursive: true });
        await fs.symlink(path.join(home, '.agents', 'skills', 'openspec-explore'), path.join(minimax, 'openspec-explore'), 'junction');
        const copy = path.join(minimax, 'openspec-propose');
        const before = readFileSync(path.join(copy, 'SKILL.md'), 'utf8');

        const result = await cli(dir, 'update', '--force');

        expect(result.exitCode).toBe(0);
        expect(await isLink(copy)).toBe(false);
        expect(readFileSync(path.join(copy, 'SKILL.md'), 'utf8')).toBe(before);
      });

      it("refreshes Antigravity's copies when the package reports its folder under the CLI's name", async () => {
        // With only the Antigravity CLI's folder on the machine, the package names ~/.gemini/config/skills after it.
        await fs.mkdir(path.join(home, '.gemini', 'antigravity-cli'), { recursive: true });
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'antigravity');
        const copy = path.join(home, '.gemini', 'config', 'skills', 'openspec-explore', 'SKILL.md');
        await fs.writeFile(copy, oldText());

        const plan = await cli(dir, 'update', '--dry-run');
        expect(plan.stdout).toContain('refresh the OpenSpec skills installed for this machine');
        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(copy, 'utf8')).toBe(readFileSync(globalSkill('openspec-explore'), 'utf8'));
        expect((await cli(dir, 'update')).stdout).toContain('The 6 skills for this machine are up to date');
      });

      it('publishes skills that are one file each, which is how a folder with more is known to be the user\'s', async () => {
        const root = path.join(cliProjectRoot, 'skills');
        for (const name of (await fs.readdir(root)).filter((entry) => entry.startsWith('openspec-'))) {
          expect(await entries(path.join(root, name)), name).toEqual(['SKILL.md']);
        }
      });

      it("leaves a link the user pointed somewhere of their own alone, and says so", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        const mine = path.join(home, 'dotfiles', 'my-explore');
        await fs.mkdir(mine, { recursive: true });
        await fs.writeFile(path.join(mine, 'SKILL.md'), MINE);
        const link = path.join(claude(), 'openspec-explore');
        await fs.rm(link, { recursive: true, force: true });
        await fs.symlink(mine, link, 'junction');

        const result = await cli(dir, 'update', '--force');

        expect(result.exitCode).toBe(0);
        expect(await fs.realpath(link)).toBe(await fs.realpath(mine));
        expect(readFileSync(path.join(mine, 'SKILL.md'), 'utf8')).toBe(MINE);
        expect(result.stdout).toContain('Left openspec-explore in your home folder alone');
      });

      it("keeps MiniMax Code's copy of a skill the profile drops, and a copy in a folder the install never writes to", async () => {
        const configFile = path.join(home, '.config', 'openspec', 'config.json');
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'project', '--tools', 'minimax-code');
        await cli(await project('other'), 'init', '--scope', 'global', '--tools', 'claude');
        const minimax = path.join(home, '.minimax', 'skills', 'openspec-sync-specs', 'SKILL.md');
        // Cursor reads the shared folder, so the global install never writes to its own.
        const stray = path.join(home, '.cursor', 'skills', 'openspec-sync-specs', 'SKILL.md');
        await fs.mkdir(path.dirname(stray), { recursive: true });
        await fs.copyFile(globalSkill('openspec-sync-specs'), stray);
        const before = [readFileSync(minimax, 'utf8'), readFileSync(stray, 'utf8')];
        await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'apply'] }));

        const result = await cli(await project('elsewhere'), 'update');

        expect(result.exitCode).toBe(0);
        expect(await globalSkills()).toEqual(['openspec-apply-change', 'openspec-propose']);
        expect([readFileSync(minimax, 'utf8'), readFileSync(stray, 'utf8')]).toEqual(before);
      });

      it('puts back a folder an earlier run had set aside, on any later run', async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        const aside = path.join(home, '.qwen', 'skills', '.openspec-explore.kept-4242');
        await fs.mkdir(aside, { recursive: true });
        await fs.writeFile(path.join(aside, 'SKILL.md'), MINE);

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(path.join(home, '.qwen', 'skills', 'openspec-explore', 'SKILL.md'), 'utf8')).toBe(MINE);
        expect(existsSync(aside)).toBe(false);
      });

      it('agrees with the skills package about which tools get a folder of their own', async () => {
        // Every tool the global install covers, set up at once: the package
        // writes into a tool's own folder exactly when OpenSpec expects it to.
        const all = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'all');
        expect(all.exitCode, all.stderr).toBe(0);
        const { getSupportedAgents } = await import('skills');
        const shared = path.join(home, '.agents', 'skills');
        const real = (process.env.HOME ?? os.homedir()).replace(/[\\/]+$/, '');
        const written: string[] = [];
        const expected: string[] = [];
        for (const agent of getSupportedAgents()) {
          if (!agent.globalSkillsDir) continue;
          // This process has its own home; the CLI ran in the test's.
          const dir = path.join(home, path.relative(real, agent.globalSkillsDir));
          if (dir === shared) continue;
          if (existsSync(path.join(dir, 'openspec-explore'))) written.push(agent.id);
          if (!agent.universal || ['antigravity', 'antigravity-cli'].includes(agent.id)) expected.push(agent.id);
        }
        // Every tool written to is one OpenSpec treats as having its own folder.
        expect(written.filter((id) => !expected.includes(id))).toEqual([]);
        expect(written).toContain('claude-code');
        expect(written).toContain('antigravity');
      }, 120000);
    });

    it("never takes MiniMax Code's copies in the home folder for part of the global install", async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude,minimax-code');
      await cli(dir, 'init', '--scope', 'global');
      const minimax = path.join(home, '.minimax', 'skills');
      const snapshot = async () =>
        Promise.all(
          (await entries(minimax)).map(async (name) => {
            const stat = await fs.lstat(path.join(minimax, name));
            return [name, stat.isSymbolicLink(), readFileSync(path.join(minimax, name, 'SKILL.md'), 'utf8')];
          })
        );
      const before = await snapshot();
      expect(before.length).toBeGreaterThan(0);

      const result = await cli(dir, 'update', '--force');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('in your home folder alone');
      expect(await snapshot()).toEqual(before);
    });

    describe('when the profile drops a skill', () => {
      const configFile = () => path.join(home, '.config', 'openspec', 'config.json');
      const setWorkflows = async (workflows: string[]) => {
        await fs.mkdir(path.dirname(configFile()), { recursive: true });
        await fs.writeFile(configFile(), JSON.stringify({ profile: 'custom', workflows }));
      };
      const MINE = '---\nname: openspec-verify-change\ndescription: mine\n---\nmine\n';
      const ownFolder = async (...segments: string[]): Promise<string> => {
        const file = path.join(home, ...segments, 'openspec-verify-change', 'SKILL.md');
        await fs.rm(path.dirname(file), { recursive: true, force: true });
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, MINE);
        return file;
      };

      it('names an edit in it before it goes', async () => {
        await setWorkflows(['propose', 'explore', 'verify']);
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        await fs.appendFile(globalSkill('openspec-verify-change'), '\nmy note\n');
        await setWorkflows(['propose', 'explore']);

        const plan = await cli(dir, 'update', '--dry-run');
        expect(plan.stdout).toContain('Update will replace your edits in 1 skill OpenSpec installs for this machine: openspec-verify-change.');
        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Replaced your edits in 1 skill OpenSpec installs for this machine: openspec-verify-change.');
        expect(await globalSkills()).toEqual(['openspec-explore', 'openspec-propose']);
        expect((await cli(dir, 'update')).stdout).toContain('The 2 skills for this machine are up to date');
      });

      it("keeps a folder of that name with the user's own text, in a tool that is set up and in one that isn't", async () => {
        await setWorkflows(['propose', 'explore', 'verify']);
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        // Where Claude Code's link was, and in a tool this install never touched.
        const inSetUpTool = await ownFolder('.claude', 'skills');
        const inOtherTool = await ownFolder('.cursor', 'skills');
        await setWorkflows(['propose', 'explore']);

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(inSetUpTool, 'utf8')).toBe(MINE);
        expect(readFileSync(inOtherTool, 'utf8')).toBe(MINE);
        expect(await globalSkills()).toEqual(['openspec-explore', 'openspec-propose']);
        // Nothing is left under another name.
        expect(await entries(path.join(home, '.cursor', 'skills'))).toEqual(['openspec-verify-change']);
        expect((await entries(path.join(home, '.claude', 'skills'))).filter((name) => name.startsWith('.'))).toEqual([]);
      });

      it('puts back a folder that an earlier run, cut short, had set aside', async () => {
        await setWorkflows(['propose', 'explore', 'verify']);
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        const mine = await ownFolder('.cursor', 'skills');
        const aside = path.join(home, '.cursor', 'skills', '.openspec-verify-change.kept-4242');
        await fs.rename(path.dirname(mine), aside);
        await setWorkflows(['propose', 'explore']);

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(readFileSync(mine, 'utf8')).toBe(MINE);
        expect(existsSync(aside)).toBe(false);
      });
    });

    describe('a skill in the shared folder that the skills package cannot read', () => {
      // The package lists a skill by the name in its header, and skips one whose header it can't parse.
      const break_ = {
        'openspec-propose': (text: string) => text.replace(/^description: /m, 'description: Team note: ask first. '),
        'openspec-explore': (text: string) => text.replace(/^name: .*/m, 'name: my-explore'),
        'openspec-apply-change': () => 'a plain rewrite, with no header\n',
      } as const;

      it('is left alone and named when it is an edit that broke the header, and a readable edit is still replaced and named', async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        const edited: Record<string, string> = {};
        for (const [name, change] of Object.entries(break_)) {
          edited[name] = `${change(readFileSync(globalSkill(name), 'utf8'))}\nMY EDIT\n`;
          await fs.writeFile(globalSkill(name), edited[name]);
        }
        await fs.appendFile(globalSkill('openspec-archive-change'), '\nMY EDIT\n');

        const plan = await cli(dir, 'update', '--dry-run');
        for (const output of [plan.stdout, (await cli(dir, 'update')).stdout]) {
          expect(output).toMatch(/(Left|Update will leave) openspec-explore, openspec-apply-change, openspec-propose in your home folder alone/);
          expect(output).toMatch(/[Rr]eplaced? your edits in 1 skill OpenSpec installs for this machine: openspec-archive-change\./);
        }
        for (const name of Object.keys(break_)) expect(readFileSync(globalSkill(name), 'utf8')).toBe(edited[name]);
        expect(readFileSync(globalSkill('openspec-archive-change'), 'utf8')).not.toContain('MY EDIT');
      });

      it('is left alone and named when the user wrote it before OpenSpec was installed for the machine', async () => {
        const mine = { 'openspec-propose': '---\nname: team-propose\ndescription: ours\n---\nours\n', 'openspec-explore': 'user wrote this\n' };
        for (const [name, text] of Object.entries(mine)) {
          await fs.mkdir(path.dirname(globalSkill(name)), { recursive: true });
          await fs.writeFile(globalSkill(name), text);
        }

        const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Left openspec-explore, openspec-propose in your home folder alone');
        for (const [name, text] of Object.entries(mine)) expect(readFileSync(globalSkill(name), 'utf8')).toBe(text);
        expect(existsSync(globalSkill('openspec-sync-specs'))).toBe(true);
      });
    });

    it('names the skills it removes because the profile leaves them out, before and after', async () => {
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      await fs.mkdir(path.dirname(configFile), { recursive: true });
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'verify', 'onboard'] }));
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore'] }));
      const NAMES = "2 skills your workflow profile doesn't include: openspec-onboard, openspec-verify-change.";

      const plan = await cli(dir, 'update', '--dry-run');
      expect(plan.stdout).toContain(`Update will remove ${NAMES}`);
      expect(plan.stdout).not.toContain('skills are up to date');
      const json = JSON.parse((await cli(dir, 'update', '--dry-run', '--json')).stdout);
      expect(json.notes.map((note: { code: string }) => note.code)).toEqual(['global-skills', 'removed-skills']);
      const result = await cli(dir, 'update');

      expect(result.stdout).toContain(`Removed ${NAMES}`);
      expect(result.stdout).toContain('openspec config profile');
      expect(await globalSkills()).toEqual(['openspec-explore', 'openspec-propose']);
      expect((await cli(dir, 'update')).stdout).not.toContain('Removed');

      // A new project on a machine that holds more than the profile asks for says so too.
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose'] }));
      const init = await cli(await project('next'), 'init');
      expect(init.stdout).toContain("Removed 1 skill your workflow profile doesn't include: openspec-explore.");
    });

    it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
      'still names a replaced edit when the install fails after writing, because the lock file cannot be written',
      async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        await fs.appendFile(globalSkill('openspec-apply-change'), '\nMY EDIT\n');
        await fs.chmod(globalLock(), 0o444);
        await fs.chmod(path.dirname(globalLock()), 0o555);

        const result = await cli(dir, 'update');
        await fs.chmod(path.dirname(globalLock()), 0o755);

        expect(result.exitCode).toBe(1);
        expect(readFileSync(globalSkill('openspec-apply-change'), 'utf8')).not.toContain('MY EDIT');
        expect(result.stdout).toContain('Replaced your edits in 1 skill OpenSpec installs for this machine: openspec-apply-change.');
      }
    );

    describe('several runs at once', () => {
      const lockDir = () => path.join(home, '.local', 'share', 'openspec', 'global-skills.lock');
      const MINE = 'MY OWN TEXT\n';

      it("take turns, so none removes the user's folders in a tool the install never writes to", async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude,codex');
        const dropped = ['openspec-sync-specs', 'openspec-apply-change', 'openspec-update-change', 'openspec-archive-change'];
        const mine: string[] = [];
        for (const tool of [['.cursor', 'skills'], ['.minimax', 'skills'], ['.config', 'agents', 'skills']]) {
          for (const name of dropped) {
            const folder = path.join(home, ...tool, name);
            await fs.mkdir(folder, { recursive: true });
            await fs.writeFile(path.join(folder, 'SKILL.md'), MINE);
            await fs.writeFile(path.join(folder, 'notes.md'), 'notes');
            mine.push(folder);
          }
        }
        const configFile = path.join(home, '.config', 'openspec', 'config.json');
        await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'verify'] }));
        const elsewhere = await project('elsewhere');

        const runs = await Promise.all([1, 2, 3, 4].map(() => cli(elsewhere, 'update')));

        expect(runs.map((run) => run.exitCode)).toEqual([0, 0, 0, 0]);
        for (const folder of mine) {
          expect(readFileSync(path.join(folder, 'SKILL.md'), 'utf8'), folder).toBe(MINE);
          expect(readFileSync(path.join(folder, 'notes.md'), 'utf8'), folder).toBe('notes');
        }
        expect(await globalSkills()).toEqual(['openspec-explore', 'openspec-propose', 'openspec-verify-change']);
        expect(existsSync(lockDir())).toBe(false);
        // Nothing left set aside anywhere.
        for (const tool of ['.cursor', '.minimax']) {
          expect((await entries(path.join(home, tool, 'skills'))).filter((name) => name.startsWith('.'))).toEqual([]);
        }
      }, 120000);

      it('takes over a lock left by a run that is gone', async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        await fs.mkdir(lockDir(), { recursive: true });
        // No process has this id.
        await fs.writeFile(path.join(lockDir(), 'pid'), '2147483646');
        await fs.appendFile(globalSkill('openspec-explore'), '\nold\n');

        const result = await cli(dir, 'update');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Updated the 6 skills for this machine');
        expect(existsSync(lockDir())).toBe(false);
      });
    });

    it("keeps a link or a file of the user's under a skill's name, in the shared folder and in a tool's", async () => {
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      await fs.mkdir(path.dirname(configFile), { recursive: true });
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'apply', 'verify', 'sync'] }));
      // Before OpenSpec is installed: a link out of the shared folder, and a plain file.
      const dotfiles = path.join(home, 'dot', 'mine');
      await fs.mkdir(dotfiles, { recursive: true });
      await fs.writeFile(path.join(dotfiles, 'SKILL.md'), 'all mine\n');
      await fs.mkdir(path.join(home, '.agents', 'skills'), { recursive: true });
      await fs.symlink(dotfiles, path.join(home, '.agents', 'skills', 'openspec-propose'), 'junction');
      await fs.writeFile(path.join(home, '.agents', 'skills', 'openspec-explore'), 'a file of mine\n');
      const dir = await project('app');

      const init = await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      expect(init.exitCode).toBe(0);
      expect(init.stdout).toContain('Left openspec-explore, openspec-propose in your home folder alone');
      expect(readFileSync(path.join(dotfiles, 'SKILL.md'), 'utf8')).toBe('all mine\n');
      expect((await fs.lstat(path.join(home, '.agents', 'skills', 'openspec-propose'))).isSymbolicLink()).toBe(true);
      expect(readFileSync(path.join(home, '.agents', 'skills', 'openspec-explore'), 'utf8')).toBe('a file of mine\n');

      // In a tool that is set up: the user's own link and file where OpenSpec's links were, for skills the profile then drops.
      const claude = path.join(home, '.claude', 'skills');
      await fs.rm(path.join(claude, 'openspec-verify-change'), { recursive: true, force: true });
      await fs.symlink(dotfiles, path.join(claude, 'openspec-verify-change'), 'junction');
      await fs.rm(path.join(claude, 'openspec-sync-specs'), { recursive: true, force: true });
      await fs.writeFile(path.join(claude, 'openspec-sync-specs'), 'a file of mine\n');
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'apply'] }));

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(await fs.realpath(path.join(claude, 'openspec-verify-change'))).toBe(await fs.realpath(dotfiles));
      expect(readFileSync(path.join(claude, 'openspec-sync-specs'), 'utf8')).toBe('a file of mine\n');
      expect(readFileSync(path.join(dotfiles, 'SKILL.md'), 'utf8')).toBe('all mine\n');
    });

    it('repairs a skill file that a cut-short write left empty', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const current = readFileSync(globalSkill('openspec-explore'), 'utf8');
      await fs.writeFile(globalSkill('openspec-explore'), '');

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('in your home folder alone');
      expect(readFileSync(globalSkill('openspec-explore'), 'utf8')).toBe(current);
    });

    it('says in a dry run what it would leave alone, even when nothing else would change', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      await fs.writeFile(path.join(path.dirname(globalSkill('openspec-explore')), 'notes.md'), 'mine');

      const plan = await cli(dir, 'update', '--dry-run');
      const result = await cli(dir, 'update');

      expect(plan.stdout).toContain('Update will leave openspec-explore in your home folder alone');
      expect(result.stdout).toContain('Left openspec-explore in your home folder alone');
    });

    it('says the global skills are up to date and fetches nothing when they are', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const lock = globalLock();
      const before = readFileSync(lock, 'utf8');

      const result = await cli(dir, 'update');
      const dryRun = await cli(dir, 'update', '--dry-run', '--json');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('The 6 skills for this machine are up to date');
      // An install would stamp a new time into the lock file.
      expect(readFileSync(lock, 'utf8')).toBe(before);
      expect(JSON.parse(dryRun.stdout).notes).toEqual([]);
    });

    it('puts back a link that was deleted, even though the text is current', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const link = path.join(home, '.claude', 'skills', 'openspec-explore');
      await fs.rm(link, { recursive: true, force: true });

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(existsSync(path.join(link, 'SKILL.md'))).toBe(true);
    });

    it("leaves a tool's own skill alone when that tool is added later", async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'codex');
      const mine = path.join(home, '.claude', 'skills', 'openspec-propose');
      await fs.mkdir(mine, { recursive: true });
      await fs.writeFile(path.join(mine, 'SKILL.md'), '---\nname: openspec-propose\ndescription: mine\n---\nmine\n');

      const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Left openspec-propose in your home folder alone");
      expect(readFileSync(path.join(mine, 'SKILL.md'), 'utf8')).toContain('mine');
      // Claude Code still gets the skills it has no copy of.
      expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
    });

    it('reports a global install that would fail in a dry run, without failing the plan', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      const saved = JSON.parse(readFileSync(configFile, 'utf8'));
      await fs.writeFile(configFile, JSON.stringify({ ...saved, profile: 'custom', workflows: ['verify'] }));
      const theirs = globalSkill('openspec-verify-change');
      await fs.mkdir(path.dirname(theirs), { recursive: true });
      await fs.writeFile(theirs, '---\nname: openspec-verify-change\ndescription: mine\n---\nmine\n');

      const result = await cli(dir, 'update', '--dry-run', '--json');

      expect(result.exitCode).toBe(0);
      const plan = JSON.parse(result.stdout);
      expect(plan.failures).toEqual([
        expect.objectContaining({ tool: 'global-skills', error: expect.stringContaining('openspec-verify-change') }),
      ]);
    });

    it('lists a global failure in a dry run from outside any project', async () => {
      await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude');
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      const saved = JSON.parse(readFileSync(configFile, 'utf8'));
      await fs.writeFile(configFile, JSON.stringify({ ...saved, profile: 'custom', workflows: ['verify'] }));
      const theirs = globalSkill('openspec-verify-change');
      await fs.mkdir(path.dirname(theirs), { recursive: true });
      await fs.writeFile(theirs, '---\nname: openspec-verify-change\ndescription: mine\n---\nmine\n');

      const result = await cli(await project('not-a-project'), 'update', '--dry-run', '--json');

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).failures).toEqual([
        expect.objectContaining({ tool: 'global-skills', error: expect.stringContaining('openspec-verify-change') }),
      ]);
    });

    it("never replaces a real folder the user put where a tool's link was", async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const mine = path.join(home, '.claude', 'skills', 'openspec-propose');
      await fs.rm(mine, { recursive: true, force: true });
      await fs.mkdir(mine, { recursive: true });
      await fs.writeFile(path.join(mine, 'SKILL.md'), '---\nname: openspec-propose\ndescription: mine\n---\nmine\n');
      // Something to refresh, so the update really installs.
      await fs.appendFile(globalSkill('openspec-explore'), '\nold\n');

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(readFileSync(path.join(mine, 'SKILL.md'), 'utf8')).toContain('mine');
      expect(readFileSync(globalSkill('openspec-explore'), 'utf8')).not.toContain('\nold\n');
    });

    it('changes nothing for a machine without the global skills', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');

      const result = await cli(dir, 'update');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('for this machine');
      expect(await globalSkills()).toEqual([]);
    });
  });

  describe('moving a project to the global skills', () => {
    it('removes the project copies and installs the global ones', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
      expect(await globalSkills()).toEqual(CORE_SKILLS);
      // The next update treats it as a project that uses the global skills.
      const update = await cli(dir, 'update');
      expect(update.stdout).not.toContain('No configured tools found');
      expect(await entries(dir)).toEqual(['openspec']);
    });

    it('keeps the project skills when the global install fails', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      await fs.mkdir(path.join(home, '.agents'), { recursive: true });
      await fs.writeFile(path.join(home, '.agents', 'skills'), 'not a folder');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('OpenSpec Setup Incomplete');
      expect(result.stdout).not.toContain('for every project on this machine');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

      // Once the home folder is fixed, the same command finishes the move.
      await fs.rm(path.join(home, '.agents', 'skills'));
      const again = await cli(dir, 'init', '--scope', 'global');
      expect(again.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
    });

    it('moves a project that also uses MiniMax Code, whose skills already sit in the home folder', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--tools', 'claude,minimax-code');
      const minimax = path.join(home, '.minimax', 'skills', 'openspec-propose', 'SKILL.md');
      const before = readFileSync(minimax, 'utf8');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(await globalSkills()).toEqual(CORE_SKILLS);
      expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(readFileSync(minimax, 'utf8')).toBe(before);
      expect(await entries(dir)).toEqual(['openspec']);
    });

    it('refuses to move a project set up for a tool the global skills do not cover', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--tools', 'claude,oh-my-pi');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("This project is set up for Oh My Pi, which the global skills don't cover");
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(await globalSkills()).toEqual([]);
    });

    it("carries the project's tools over even when the run names none", async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');

      const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'none');

      expect(result.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
      expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    });

    it("links the moved project's tools, even when the machine was set up for another tool", async () => {
      await cli(await project('first'), 'init', '--scope', 'global', '--tools', 'codex');
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
      expect(existsSync(path.join(home, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    });

    it('keeps the project skills when one of them has no replacement on the machine', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      const theirs = globalSkill('openspec-propose');
      await fs.mkdir(path.dirname(theirs), { recursive: true });
      await fs.writeFile(theirs, '---\nname: openspec-propose\ndescription: mine\n---\nmine\n');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Not every skill could be installed for this machine, so the project keeps its own.');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(readFileSync(theirs, 'utf8')).toContain('mine');
    });

    it('refuses to move a project that has the Copilot cloud files, unless they are turned off', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'github-copilot', '--copilot-cloud');

      const refused = await cli(dir, 'init', '--scope', 'global');
      expect(refused.exitCode).toBe(1);
      expect(refused.stderr).toContain('This project has the GitHub Copilot cloud files set up');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(await globalSkills()).toEqual([]);

      const moved = await cli(dir, 'init', '--scope', 'global', '--no-copilot-cloud');
      expect(moved.exitCode).toBe(0);
      expect(existsSync(path.join(dir, '.agents'))).toBe(false);
      expect(existsSync(path.join(dir, '.github', 'workflows', 'copilot-setup-steps.yml'))).toBe(false);
      expect(await globalSkills()).toEqual(CORE_SKILLS);
    });

    it.skipIf(process.platform === 'win32')('stops the move when the Copilot cloud files cannot be removed', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'github-copilot', '--copilot-cloud');
      const workflows = path.join(dir, '.github', 'workflows');
      await fs.chmod(workflows, 0o555);
      let result;
      try {
        result = await cli(dir, 'init', '--scope', 'global', '--no-copilot-cloud');
      } finally {
        await fs.chmod(workflows, 0o755);
      }

      expect(result.exitCode).toBe(1);
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(existsSync(path.join(workflows, 'copilot-setup-steps.yml'))).toBe(true);
      expect(await globalSkills()).toEqual([]);
    });

    it('leaves no empty lock file behind for a project whose only tool reads the shared folder', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'codex');
      expect(existsSync(path.join(dir, 'skills-lock.json'))).toBe(true);

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
    });

    it('stops while skills sit where an older release kept them, and moves once an update has brought them over', async () => {
      // What 1.0 to 1.6 left for Codex: its skills in .codex/skills.
      const dir = await project('app');
      await fs.mkdir(path.join(dir, 'openspec'), { recursive: true });
      const old = path.join(dir, '.codex', 'skills', 'openspec-explore', 'SKILL.md');
      await fs.mkdir(path.dirname(old), { recursive: true });
      await fs.copyFile(
        path.join(cliProjectRoot, 'test', 'fixtures', 'released-output', 'published-skills', 'v1.17.0-openspec-explore.md'),
        old
      );

      const refused = await cli(dir, 'init', '--scope', 'global', '--tools', 'codex');
      expect(refused.exitCode).toBe(1);
      expect(refused.stderr).toContain('(.codex/skills). Run openspec update here first');
      expect(existsSync(old)).toBe(true);

      expect((await cli(dir, 'update')).exitCode).toBe(0);
      const moved = await cli(dir, 'init', '--scope', 'global', '--tools', 'codex');

      expect(moved.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
      expect((await cli(dir, 'update')).stdout).not.toContain('has its own copy');
    });

    it('removes the command files 1.x wrote as well', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      const commands = generateCommands(getCommandContents(['propose', 'apply']), CommandAdapterRegistry.get('claude')!);
      for (const command of commands) {
        await fs.mkdir(path.dirname(path.join(dir, command.path)), { recursive: true });
        await fs.writeFile(path.join(dir, command.path), command.fileContent);
      }

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
    });

    it('stops before removing anything when a command file was edited', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      const [command] = generateCommands(getCommandContents(['propose']), CommandAdapterRegistry.get('claude')!);
      await fs.mkdir(path.dirname(path.join(dir, command.path)), { recursive: true });
      await fs.writeFile(path.join(dir, command.path), `${command.fileContent}\nmy own step\n`);

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(command.path.split(path.sep).join('/'));
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(await globalSkills()).toEqual([]);
    });

    it('stops before removing anything when a project skill was edited', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      const edited = path.join(dir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      await fs.writeFile(edited, 'my own notes');

      const result = await cli(dir, 'init', '--scope', 'global');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('These files have your own changes, so the project keeps its copy: .agents/skills/openspec-explore');
      expect(readFileSync(edited, 'utf8')).toBe('my own notes');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(await globalSkills()).toEqual([]);
    });
  });
});
