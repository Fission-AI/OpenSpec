import { version } from '../../package.json';
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

describe("the repository's own maintainer skills", () => {
  // `npx skills add Fission-AI/OpenSpec` scans the whole repository. The skills
  // in .agents/skills are for working on OpenSpec, so each is marked internal,
  // which is how the skills package knows to leave it out.
  it('are hidden from anyone installing the published skills', async () => {
    const root = path.join(cliProjectRoot, '.agents', 'skills');
    const names = (await fs.readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory());
    expect(names.length).toBeGreaterThan(0);
    for (const { name } of names) {
      const text = (await fs.readFile(path.join(root, name, 'SKILL.md'), 'utf8')).replace(/\r\n/g, '\n');
      const header = text.slice(0, text.indexOf('\n---\n', 4));
      expect(header, name).toMatch(/\nmetadata:\n {2}internal: true(\n|$)/);
    }
  });
});

// Each case runs the CLI several times, and every install is a Git fetch.
describe('skills installed for this machine', { timeout: 60_000 }, () => {
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
    expect(lock.skills['openspec-propose']).toMatchObject({
      ref: `v${version}`,
      skillPath: 'skills/openspec-propose/SKILL.md',
    });
  });

  it('says so when skills already on the machine keep a new project from getting its own', async () => {
    const notice = 'OpenSpec skills were already installed on this machine, so none were added to this project.';
    const first = await cli(await project('first'), 'init', '--tools', 'claude');
    expect(first.exitCode).toBe(0);
    expect(first.stdout).not.toContain(notice);

    const dir = await project('second');
    const second = await cli(dir, 'init', '--tools', 'claude');
    expect(second.exitCode).toBe(0);
    expect(second.stdout).toContain(notice);
    expect(second.stdout).toContain('openspec init --scope project --tools claude');
    expect(await entries(dir)).toEqual(['openspec']);

    const noTools = await cli(await project('no-tools'), 'init');
    expect(noTools.exitCode).toBe(0);
    expect(noTools.stdout).toContain(notice);
    expect(noTools.stdout).toContain('run: openspec init --scope project\n');

    const elsewhere = await project('target dir');
    const fromAnotherFolder = await cli(await project('another'), 'init', elsewhere, '--tools', 'claude');
    expect(fromAnotherFolder.exitCode).toBe(0);
    expect(fromAnotherFolder.stdout.replace(/\s*\n\s*/g, ' ')).toContain('--scope project --tools claude');
    expect(fromAnotherFolder.stdout).toContain('target dir" --scope project');
    expect(noTools.stdout).not.toContain('<ids>');

    const chosen = await cli(await project('third'), 'init', '--scope', 'global', '--tools', 'claude');
    expect(chosen.exitCode).toBe(0);
    expect(chosen.stdout).not.toContain(notice);
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

  it('refreshes a previous global install to the same skills a fresh installation exposes', async () => {
    const dir = await project('app');
    await cli(dir, 'init', '--scope', 'global', '--tools', 'claude,cursor');
    const canonical = path.join(home, '.agents/skills');
    const toolDir = path.join(home, '.claude/skills');
    const read = () => [canonical, toolDir].map(folder => CORE_SKILLS.map(name => readFileSync(path.join(folder, name, 'SKILL.md'), 'utf8')));
    const fresh = read();
    const old = path.join(cliProjectRoot, 'test/fixtures/released-output/published-skills/v2.0.0-openspec-explore.md');
    await fs.copyFile(old, globalSkill('openspec-explore'));
    await fs.appendFile(globalSkill('openspec-apply-change'), '\nEdited');
    const custom = path.join(canonical, 'team-workflow/SKILL.md');
    await fs.mkdir(path.dirname(custom));
    await fs.writeFile(custom, 'Team instructions');
    const excluded = path.join(canonical, 'openspec-onboard');
    await fs.mkdir(excluded);
    await fs.copyFile(path.join(cliProjectRoot, 'skills/openspec-onboard/SKILL.md'), path.join(excluded, 'SKILL.md'));
    const result = await cli(dir, 'update');
    expect(result.exitCode, result.stderr).toBe(0);
    expect(read()).toEqual(fresh);
    expect(existsSync(excluded)).toBe(false);
    expect(readFileSync(custom, 'utf8')).toBe('Team instructions');
    expect((await cli(dir, 'update')).stdout).toContain('up to date');
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
    const result = await cli(await project('app'), 'init', '--scope', 'global', '--tools', 'claude,eve');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Eve isn't covered by the global skills.");
    expect(await globalSkills()).toEqual(CORE_SKILLS);
  });

  it('sets nothing up when no selected tool can use the global skills', async () => {
    const dir = await project('app');
    const result = await cli(dir, 'init', '--scope', 'global', '--tools', 'eve');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('None of the selected tools are covered by the global skills');
    expect(result.stderr).toContain('openspec init --scope project --tools eve');
    expect(await globalSkills()).toEqual([]);
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

    it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
      "fails when a tool's copy of a removed skill is still there",
      async () => {
        const dir = await project('app');
        await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
        // A plain copy the package can't delete, where Claude Code's link was.
        const stuck = path.join(home, '.claude', 'skills', 'openspec-propose');
        const text = await fs.readFile(globalSkill('openspec-propose'), 'utf8');
        await fs.rm(stuck, { recursive: true, force: true });
        await fs.mkdir(stuck, { recursive: true });
        await fs.writeFile(path.join(stuck, 'SKILL.md'), text);
        await fs.chmod(stuck, 0o500);
        const configFile = path.join(home, '.config', 'openspec', 'config.json');
        await fs.mkdir(path.dirname(configFile), { recursive: true });
        await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: [] }));

        try {
          const result = await cli(dir, 'update');

          expect(result.exitCode).toBe(1);
          expect(result.stdout + result.stderr).toContain(`Could not remove ${stuck}`);
          expect(result.stdout).not.toContain('Removed the skills for this machine');
        } finally {
          await fs.chmod(stuck, 0o700);
        }
      }
    );

    it('clears the global skills when the profile has no workflows', async () => {
      const dir = await project('app');
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      await fs.mkdir(path.dirname(configFile), { recursive: true });
      await fs.writeFile(configFile, JSON.stringify({ profile: 'custom', workflows: [] }));

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
      ]);
      expect(readFileSync(globalSkill('openspec-propose'), 'utf8')).toBe(edited);
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
      expect(result.stdout).not.toContain('for every project on this machine');
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

      // Once the home folder is fixed, the same command finishes the move.
      await fs.rm(path.join(home, '.agents', 'skills'));
      const again = await cli(dir, 'init', '--scope', 'global');
      expect(again.exitCode).toBe(0);
      expect(await entries(dir)).toEqual(['openspec']);
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

    it('keeps Copilot and project skills when one of the requested global targets fails, and retries', async () => {
      const dir = await project('partial');
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude,github-copilot', '--copilot-cloud');
      const files = ['openspec/config.yaml', '.github/workflows/copilot-setup-steps.yml', '.github/agents/openspec.agent.md',
        '.agents/skills/.openspec-target', ...CORE_SKILLS.map(name => `.agents/skills/${name}/SKILL.md`)];
      const before = files.map(file => readFileSync(path.join(dir, file), 'utf8'));
      await fs.mkdir(path.join(home, '.claude'));
      const blocked = path.join(home, '.claude', 'skills');
      await fs.writeFile(blocked, 'not a folder');
      const failed = await cli(dir, 'init', '--scope', 'global', '--no-copilot-cloud');
      expect(failed.exitCode).toBe(1);
      expect(files.map(file => readFileSync(path.join(dir, file), 'utf8'))).toEqual(before);
      expect((await globalSkills()).length).toBeGreaterThan(0);
      await fs.rm(blocked);
      const retried = await cli(dir, 'init', '--scope', 'global', '--no-copilot-cloud');
      expect(retried.exitCode, retried.stderr).toBe(0);
      expect(existsSync(path.join(dir, '.agents/skills'))).toBe(false);
      expect(readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8')).toContain('cloudAgent: false');
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
      const workflows = path.join(dir, '.github', 'agents');
      await fs.chmod(workflows, 0o555);
      let result;
      try {
        result = await cli(dir, 'init', '--scope', 'global', '--no-copilot-cloud');
      } finally {
        await fs.chmod(workflows, 0o755);
      }

      expect(result.exitCode).toBe(1);
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
      expect(existsSync(path.join(workflows, 'openspec.agent.md'))).toBe(true);
      expect(existsSync(path.join(dir, '.github/workflows/copilot-setup-steps.yml'))).toBe(true);
      expect(readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8')).toContain('cloudAgent: true');
      expect(await globalSkills()).toEqual(CORE_SKILLS);
      expect((await cli(dir, 'init', '--scope', 'global', '--no-copilot-cloud')).exitCode).toBe(0);
      expect(readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8')).toContain('cloudAgent: false');
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
  });
});
