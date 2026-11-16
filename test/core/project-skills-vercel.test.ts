import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readdirSync, readlinkSync } from 'fs';
import os from 'os';
import { execFileSync } from 'node:child_process';
import path from 'path';
import { cliProjectRoot, runCLI } from '../helpers/run-cli.js';

// A project's own skills are installed by the `skills` package, from the
// repository's published skills/ folder. Every case runs the real CLI in a
// fresh process with its own throwaway home, as the global install's tests do.

const CORE_SKILLS = [
  'openspec-apply-change',
  'openspec-archive-change',
  'openspec-explore',
  'openspec-propose',
  'openspec-sync-specs',
  'openspec-update-change',
];
const CORE_WORKFLOWS = ['propose', 'explore', 'apply', 'update', 'sync', 'archive'];

describe("a project's skills, installed through the skills package", () => {
  let box: string;
  let home: string;
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    box = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-project-skills-')));
    home = path.join(box, 'home');
    dir = path.join(box, 'app');
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(dir, { recursive: true });
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

    };
  });

  afterEach(async () => {
    await fs.rm(box, { recursive: true, force: true });
  });

  const cli = (...args: string[]) => runCLI(args, { cwd: dir, env, timeoutMs: 60000 });
  const init = async () => {
    const result = await cli('init', '--scope', 'project', '--tools', 'claude');
    expect(result.exitCode, result.stderr).toBe(0);
    return result;
  };
  const skillFile = (name: string) => path.join(dir, '.agents', 'skills', name, 'SKILL.md');
  const published = (name: string) => readFileSync(path.join(cliProjectRoot, 'skills', name, 'SKILL.md'), 'utf8');
  const lockPath = () => path.join(dir, 'skills-lock.json');
  const setWorkflows = async (workflows: string[]) => {
    const file = path.join(home, '.config', 'openspec', 'config.json');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ profile: 'custom', delivery: 'both', workflows }));
  };
  /** A skill as 2.0 wrote it: the same text, with that release's version stamp. */
  const stamped = (name: string) =>
    published(name).replace(/(\n {2}version: "[^"]+"\n)/, '$1  generatedBy: "2.0.0"\n');
  /** Every file and link under the project: its text or link target, and when it was last written. */
  const snapshot = (options: { times?: boolean } = {}): Record<string, string> => {
    const out: Record<string, string> = {};
    const walk = (folder: string) => {
      const entries = readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const full = path.join(folder, entry.name);
        const rel = path.relative(dir, full).split(path.sep).join('/');
        if (entry.isSymbolicLink()) out[rel] = `link:${readlinkSync(full)}`;
        else if (entry.isDirectory()) walk(full);
        else {
          // One handle for the text and its time, so both describe the same file.
          const handle = openSync(full, 'r');
          try {
            out[rel] = readFileSync(handle, 'utf8') + (options.times ? `@${fstatSync(handle).mtimeMs}` : '');
          } finally {
            closeSync(handle);
          }
        }
      }
    };
    walk(dir);
    return out;
  };

  it('installs the bundled skills for the selected agents without a project lock', async () => {
    await init();
    for (const name of CORE_SKILLS) {
      expect(readFileSync(skillFile(name), 'utf8')).toBe(published(name));
      expect(readFileSync(path.join(dir, '.claude/skills', name, 'SKILL.md'), 'utf8')).toBe(published(name));
    }
    expect(existsSync(lockPath())).toBe(false);
  });

  it('installs AiderDesk into a second Git checkout and refreshes it without a lock file', async () => {
    const result = await cli('init', '--scope', 'project', '--tools', 'aider-desk,claude,cursor');
    expect(result.exitCode, result.stderr).toBe(0);
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env: { ...process.env, ...env }, stdio: 'pipe' });
    git('init', '--quiet');
    git('add', '-A');
    git('-c', 'user.name=OpenSpec', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Project skills');
    const clone = path.join(box, 'clone');
    git('clone', '--quiet', dir, clone);
    await fs.rename(dir, path.join(box, 'original-moved'));
    dir = clone;
    const skill = 'openspec-propose';
    for (const folder of ['.claude/skills', '.aider-desk/skills', '.agents/skills']) {
      expect(readFileSync(path.join(dir, folder, skill, 'SKILL.md'), 'utf8').replaceAll('\r\n', '\n')).toBe(published(skill).replaceAll('\r\n', '\n'));
    }
    const marker = path.join(dir, '.agents/skills/.openspec-target');
    expect(readFileSync(marker, 'utf8')).toContain('aider-desk own-files');
    await fs.writeFile(path.join(dir, '.aider-desk/skills', skill, 'SKILL.md'), 'stale');
    expect((await cli('update')).exitCode).toBe(0);
    expect(readFileSync(path.join(dir, '.aider-desk/skills', skill, 'SKILL.md'), 'utf8')).toBe(published(skill));
    expect((await cli('update')).stdout).toContain('up to date');
    expect(existsSync(lockPath())).toBe(false);
  });

  it('repairs an edited Eve skill and leaves a fresh Eve install alone', async () => {
    const result = await cli('init', '--scope', 'project', '--tools', 'eve');
    expect(result.exitCode, result.stderr).toBe(0);
    const file = path.join(dir, 'agent/skills/openspec-propose/SKILL.md');
    const installed = await fs.readFile(file, 'utf8');
    const fresh = snapshot({ times: true });

    const current = await cli('update');
    expect(current.stdout).toContain('up to date');
    expect(snapshot({ times: true })).toEqual(fresh);
    expect(JSON.parse((await cli('update', '--dry-run', '--json')).stdout).changes).toEqual([]);

    await fs.appendFile(file, 'changed instructions');
    const plan = JSON.parse((await cli('update', '--dry-run', '--json')).stdout);
    expect(plan.changes).toEqual([{ path: 'agent/skills/openspec-propose/SKILL.md', action: 'update', tool: 'eve' }]);
    expect((await cli('update')).exitCode).toBe(0);
    expect(await fs.readFile(file, 'utf8')).toBe(installed);
  });

  it('restores a removed integration when explicitly selected again', async () => {
    await init();
    const viaPackage = snapshot();
    await fs.rm(path.join(dir, '.claude'), { recursive: true });

    expect((await cli('init', '--scope', 'project', '--tools', 'claude')).exitCode).toBe(0);
    expect(snapshot()).toEqual(viaPackage);
  });

  it('says a fresh install is up to date and changes no file', async () => {
    await init();
    const before = snapshot({ times: true });

    const result = await cli('update');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('up to date');
    expect(snapshot({ times: true })).toEqual(before);
  });

  it('brings a stamped 2.0 install to the same state as a fresh install', async () => {
    await init();
    const fresh = snapshot();
    for (const name of CORE_SKILLS) await fs.writeFile(skillFile(name), stamped(name));

    const result = await cli('update');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('Replaced your edits');
    expect(result.stdout).not.toContain('could not be fetched');
    expect(existsSync(lockPath())).toBe(false);
    expect(snapshot()).toEqual(fresh);

    const again = await cli('update');
    expect(again.stdout).toContain('up to date');
  });

  it('takes over skills an earlier `npx skills add` installed, without calling them edits', async () => {
    // What `npx skills add Fission-AI/OpenSpec` put there under 2.0.0: real
    // folders in the shared folder, and in a tool's own.
    const old = readFileSync(
      path.join(cliProjectRoot, 'test', 'fixtures', 'released-output', 'published-skills', 'v2.0.0-openspec-explore.md'),
      'utf8'
    );
    await init();
    await fs.writeFile(skillFile('openspec-explore'), old);
    const own = path.join(dir, '.claude', 'skills', 'openspec-explore');
    await fs.rm(own, { recursive: true, force: true });
    await fs.mkdir(own, { recursive: true });
    await fs.writeFile(path.join(own, 'SKILL.md'), old);

    const result = await cli('update');

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).not.toContain('Replaced your edits');
    expect(result.stdout).not.toContain('with your own changes');
    expect(readFileSync(skillFile('openspec-explore'), 'utf8')).toBe(published('openspec-explore'));
    expect(readFileSync(path.join(own, 'SKILL.md'), 'utf8')).toBe(published('openspec-explore'));
  });

  it('replaces an edited skill with bundled text', async () => {
    await init();
    await fs.appendFile(skillFile('openspec-explore'), '\nMy own note.\n');

    const result = await cli('update');

    expect(result.exitCode).toBe(0);
    expect(readFileSync(skillFile('openspec-explore'), 'utf8')).toBe(published('openspec-explore'));
    expect(existsSync(lockPath())).toBe(false);
  });

  it('preserves a separately named skill and an existing third-party lock through profile changes', async () => {
    await init();
    const custom = path.join(dir, '.agents/skills/team-propose');
    await fs.mkdir(custom);
    await fs.writeFile(path.join(custom, 'SKILL.md'), 'team guidance');
    const lock = JSON.stringify({ version: 2, skills: { 'team-propose': { source: 'team/skills' } } });
    await fs.writeFile(lockPath(), lock);
    await setWorkflows(['explore']);
    expect((await cli('update')).exitCode).toBe(0);
    expect(existsSync(skillFile('openspec-propose'))).toBe(false);
    expect(readFileSync(path.join(custom, 'SKILL.md'), 'utf8')).toBe('team guidance');
    expect(readFileSync(lockPath(), 'utf8')).toBe(lock);
  });

  it('states the sync safeguards for an agent that has to merge specs itself', () => {
    for (const name of ['openspec-archive-change', 'openspec-bulk-archive-change']) {
      const text = published(name);
      expect(text).toContain('When you merge inline because the sync skill is not installed, keep its safeguards.');
      expect(text).toContain('retire_capabilities: true');
      expect(text).toContain('openspec validate --specs');
    }
  });

  it('leaves only openspec/ when the project moves to the global skills', async () => {
    await init();

    const result = await cli('init', '--scope', 'global', '--tools', 'claude');

    expect(result.exitCode, result.stderr).toBe(0);
    expect((await fs.readdir(dir)).sort()).toEqual(['openspec']);
  });

  it('installs offline without git or a project lock', async () => {
    const empty = path.join(box, 'no-programs-here');
    await fs.mkdir(empty);
    const result = await runCLI(['init', '--scope', 'project', '--tools', 'claude'], {
      cwd: dir,
      env: { ...env, PATH: empty, Path: empty },
      timeoutMs: 60000,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    for (const name of CORE_SKILLS) {
      expect(readFileSync(skillFile(name), 'utf8')).toBe(published(name));
      expect(readFileSync(path.join(dir, '.claude', 'skills', name, 'SKILL.md'), 'utf8')).toBe(published(name));
    }
    expect(existsSync(lockPath())).toBe(false);

    // The skills are this version's, so there is nothing to update...
    expect((await cli('update')).stdout).toContain('up to date');
    expect(existsSync(lockPath())).toBe(false);
    expect((await cli('update', '--force')).exitCode).toBe(0);
    expect(existsSync(lockPath())).toBe(false);
  });

  it('plans the skill changes in a dry run and writes nothing', async () => {
    await init();
    for (const name of CORE_SKILLS) await fs.writeFile(skillFile(name), stamped(name));
    const before = snapshot({ times: true });

    const result = await cli('update', '--dry-run', '--json');

    expect(result.exitCode, result.stderr).toBe(0);
    expect(snapshot({ times: true })).toEqual(before);
    // In the project: the plan also covers the global config in the home folder.
    const changes = (JSON.parse(result.stdout).changes as Array<{ path: string; action: string }>)
      .filter((change) => !change.path.startsWith('~'))
      .map((change) => [change.path, change.action]);
    expect(changes).toEqual([
      ...CORE_SKILLS.map((name) => [`.agents/skills/${name}/SKILL.md`, 'update']),
    ]);
  });
});
