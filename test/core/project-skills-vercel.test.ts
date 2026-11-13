import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readdirSync, readlinkSync } from 'fs';
import os from 'os';
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
      // The published skills, read from this checkout instead of cloned from GitHub.
      OPENSPEC_SKILLS_SOURCE: path.join(cliProjectRoot, 'skills'),
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
  const lockedSkills = (): string[] => Object.keys(JSON.parse(readFileSync(lockPath(), 'utf8')).skills).sort();
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

  it('writes the published skills and a lock file that lists exactly them', async () => {
    const result = await init();

    expect(result.stdout).not.toContain('could not be fetched');
    expect((await fs.readdir(path.join(dir, '.agents', 'skills'))).sort()).toEqual(['.openspec-target', ...CORE_SKILLS]);
    for (const name of CORE_SKILLS) {
      expect(readFileSync(skillFile(name), 'utf8')).toBe(published(name));
      // Claude Code reads its own folder, through a link to the one copy.
      expect(readFileSync(path.join(dir, '.claude', 'skills', name, 'SKILL.md'), 'utf8')).toBe(published(name));
    }
    expect(lockedSkills()).toEqual(CORE_SKILLS);
    const entry = JSON.parse(readFileSync(lockPath(), 'utf8')).skills['openspec-propose'];
    expect(entry).toMatchObject({ sourceType: 'local', computedHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect((await fs.readdir(dir)).sort()).toEqual(['.agents', '.claude', 'openspec', 'skills-lock.json']);
  });

  it('links a tool folder the same way with or without the skills package', async () => {
    await init();
    const viaPackage = snapshot();
    await fs.rm(path.join(dir, '.claude'), { recursive: true });

    // Nothing to fetch now, so the links are OpenSpec's own.
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

  it('brings a project 2.0 installed under the lock file, and changes nothing else', async () => {
    await init();
    const fresh = snapshot();
    for (const name of CORE_SKILLS) await fs.writeFile(skillFile(name), stamped(name));
    await fs.rm(lockPath());

    const result = await cli('update');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('Replaced your edits');
    expect(result.stdout).not.toContain('could not be fetched');
    expect(lockedSkills()).toEqual(CORE_SKILLS);
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

  it('replaces an edited skill and says so', async () => {
    await init();
    await fs.appendFile(skillFile('openspec-explore'), '\nMy own note.\n');

    const result = await cli('update');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Replaced your edits in 1 skill OpenSpec installs: .agents/skills/openspec-explore/SKILL.md');
    expect(readFileSync(skillFile('openspec-explore'), 'utf8')).toBe(published('openspec-explore'));
    expect(lockedSkills()).toEqual(CORE_SKILLS);
  });

  it('keeps the files a user put beside a skill', async () => {
    await init();
    const notes = path.join(dir, '.agents', 'skills', 'openspec-explore', 'NOTES.md');
    await fs.writeFile(notes, 'mine');
    await fs.writeFile(skillFile('openspec-explore'), stamped('openspec-explore'));

    expect((await cli('update')).exitCode).toBe(0);

    expect(readFileSync(notes, 'utf8')).toBe('mine');
    expect(readFileSync(skillFile('openspec-explore'), 'utf8')).toBe(published('openspec-explore'));
  });

  it("leaves a skill of the user's under an OpenSpec name untouched and out of the lock file", async () => {
    const mine = '---\nname: openspec-propose\ndescription: Our team proposes changes this way.\n---\n\nOurs.\n';
    await fs.mkdir(path.dirname(skillFile('openspec-propose')), { recursive: true });
    await fs.writeFile(skillFile('openspec-propose'), mine);

    await init();

    const others = CORE_SKILLS.filter((name) => name !== 'openspec-propose');
    expect(readFileSync(path.join(dir, '.agents', 'skills', '.openspec-target'), 'utf8')).toContain('keep openspec-propose\n');
    expect(readFileSync(skillFile('openspec-propose'), 'utf8')).toBe(mine);
    expect(lockedSkills()).toEqual(others);

    expect((await cli('update', '--force')).exitCode).toBe(0);
    expect(readFileSync(skillFile('openspec-propose'), 'utf8')).toBe(mine);
    expect(lockedSkills()).toEqual(others);
  });

  it('removes a skill the profile drops, with its links and its lock entry', async () => {
    await init();
    await setWorkflows(CORE_WORKFLOWS.filter((workflow) => workflow !== 'explore'));

    const result = await cli('update');

    expect(result.exitCode).toBe(0);
    const others = CORE_SKILLS.filter((name) => name !== 'openspec-explore');
    expect((await fs.readdir(path.join(dir, '.agents', 'skills'))).sort()).toEqual(['.openspec-target', ...others]);
    expect((await fs.readdir(path.join(dir, '.claude', 'skills'))).sort()).toEqual(others);
    expect(lockedSkills()).toEqual(others);
  });

  it("never removes another skill's lock entry, and keeps the lock file while it records one", async () => {
    await init();
    const lock = JSON.parse(readFileSync(lockPath(), 'utf8'));
    lock.skills['team-review'] = { source: 'our-team/skills', sourceType: 'github', computedHash: 'abc' };
    await fs.writeFile(lockPath(), JSON.stringify(lock, null, 2) + '\n');

    const result = await cli('init', '--scope', 'global', '--tools', 'claude');

    expect(result.exitCode, result.stderr).toBe(0);
    expect(lockedSkills()).toEqual(['team-review']);
    expect((await fs.readdir(dir)).sort()).toEqual(['openspec', 'skills-lock.json']);
  });

  it('does not freeze a skill an older CLI marked as kept when its text is still OpenSpec\'s', async () => {
    await init();
    // What a 2.0 teammate's update leaves: it reads the text without a version line as the user's.
    const target = path.join(dir, '.agents', 'skills', '.openspec-target');
    await fs.writeFile(target, `${readFileSync(target, 'utf8')}keep openspec-explore\nkeep openspec-sync-specs\n`);
    await setWorkflows(['propose', 'apply']);

    const result = await cli('update');

    expect(result.exitCode, result.stderr).toBe(0);
    expect(existsSync(skillFile('openspec-explore'))).toBe(false);
    expect(existsSync(skillFile('openspec-sync-specs'))).toBe(false);
    expect(lockedSkills()).toEqual(['openspec-apply-change', 'openspec-propose']);
    expect(readFileSync(target, 'utf8')).not.toContain('keep ');
  });

  it('drops the lock entry of a skill whose folder was already deleted', async () => {
    await init();
    await fs.rm(path.join(dir, '.agents', 'skills', 'openspec-explore'), { recursive: true });
    await setWorkflows(['propose', 'apply', 'sync', 'archive', 'update']);

    const result = await cli('update');

    expect(result.exitCode, result.stderr).toBe(0);
    expect(lockedSkills()).not.toContain('openspec-explore');
    expect(existsSync(path.join(dir, '.claude', 'skills', 'openspec-explore'))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('finishes a removal when the lock file cannot be rewritten, and says so', async () => {
    await init();
    await fs.chmod(lockPath(), 0o444);
    await setWorkflows(['propose', 'apply']);

    const result = await cli('update');
    await fs.chmod(lockPath(), 0o644);

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain('skills-lock.json still lists them because it could not be rewritten');
    expect(existsSync(skillFile('openspec-explore'))).toBe(false);
    expect(existsSync(path.join(dir, '.claude', 'skills', 'openspec-explore'))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('never writes through a lock file that links outside the project', async () => {
    const outside = path.join(box, 'elsewhere-lock.json');
    const theirs = JSON.stringify({ version: 2, skills: { 'someone-elses': { source: 'x/y', computedHash: 'abc' } } }, null, 2);
    await fs.writeFile(outside, theirs);
    await fs.symlink(outside, lockPath());

    const result = await init();

    expect(result.stdout).toContain('skills-lock.json links outside the project');
    expect(readFileSync(outside, 'utf8')).toBe(theirs);
    expect(readFileSync(skillFile('openspec-propose'), 'utf8')).toBe(published('openspec-propose'));

    await setWorkflows(['propose', 'apply']);
    const update = await cli('update');
    expect(update.exitCode, update.stderr).toBe(0);
    expect(readFileSync(outside, 'utf8')).toBe(theirs);
    expect(existsSync(skillFile('openspec-explore'))).toBe(false);
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

  it('still installs without git, with a note and no lock file', async () => {
    const empty = path.join(box, 'no-programs-here');
    await fs.mkdir(empty);
    const result = await runCLI(['init', '--scope', 'project', '--tools', 'claude'], {
      cwd: dir,
      env: { ...env, OPENSPEC_SKILLS_SOURCE: '', PATH: empty, Path: empty },
      timeoutMs: 60000,
    });

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain('without the skills-lock.json file');
    expect(result.stdout).toContain("git isn't on your PATH");
    for (const name of CORE_SKILLS) {
      expect(readFileSync(skillFile(name), 'utf8')).toBe(published(name));
      expect(readFileSync(path.join(dir, '.claude', 'skills', name, 'SKILL.md'), 'utf8')).toBe(published(name));
    }
    expect(existsSync(lockPath())).toBe(false);

    // The skills are this version's, so there is nothing to update...
    expect((await cli('update')).stdout).toContain('up to date');
    expect(existsSync(lockPath())).toBe(false);
    // ...and the lock file comes once they can be fetched, as the note says.
    expect((await cli('update', '--force')).exitCode).toBe(0);
    expect(lockedSkills()).toEqual(CORE_SKILLS);
  });

  it('plans the skill changes in a dry run and writes nothing', async () => {
    await init();
    for (const name of CORE_SKILLS) await fs.writeFile(skillFile(name), stamped(name));
    await fs.rm(lockPath());
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
      ['skills-lock.json', 'add'],
    ]);
  });
});
