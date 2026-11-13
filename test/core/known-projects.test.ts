import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync, readFileSync, realpathSync } from 'fs';
import os from 'os';
import path from 'path';
import { cliProjectRoot, runCLI } from '../helpers/run-cli.js';
import { knownProjectsPath, otherProjectsNote, readKnownProjects, rememberProject } from '../../src/core/known-projects.js';

describe('the list of projects that use OpenSpec', () => {
  let box: string;
  let savedDataHome: string | undefined;

  beforeEach(async () => {
    // The native form, which is the one the list records (it expands Windows short names).
    box = realpathSync.native(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-known-')));
    savedDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(box, 'data');
  });

  afterEach(async () => {
    if (savedDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedDataHome;
    await fs.rm(box, { recursive: true, force: true });
  });

  const project = async (name: string): Promise<string> => {
    const dir = path.join(box, name);
    await fs.mkdir(path.join(dir, 'openspec'), { recursive: true });
    return dir;
  };

  it('is kept in the global data folder', () => {
    expect(knownProjectsPath()).toBe(path.join(box, 'data', 'openspec', 'projects.json'));
  });

  it('records a project once, however it is named', async () => {
    const dir = await project('app');
    rememberProject(dir);
    rememberProject(path.join(dir, '..', 'app'));
    rememberProject(`${dir}${path.sep}`);

    expect(readKnownProjects()).toEqual([dir]);
    expect(JSON.parse(readFileSync(knownProjectsPath(), 'utf8'))).toEqual({ projects: [dir] });
  });

  it('does not record a folder that has no openspec/', async () => {
    const dir = path.join(box, 'plain');
    await fs.mkdir(dir);
    rememberProject(dir);

    expect(existsSync(knownProjectsPath())).toBe(false);
  });

  it('drops a project that is gone', async () => {
    const gone = await project('gone');
    const kept = await project('kept');
    rememberProject(gone);
    rememberProject(kept);
    await fs.rm(gone, { recursive: true });

    expect(readKnownProjects()).toEqual([kept]);
    rememberProject(await project('new'));
    expect(JSON.parse(readFileSync(knownProjectsPath(), 'utf8')).projects).toEqual([kept, path.join(box, 'new')]);
  });

  it.each([
    ['not JSON', 'nonsense'],
    ['another shape', '["/somewhere"]'],
    ['entries that are not paths', '{"projects":[1,null,{}]}'],
    ['null', 'null'],
  ])('reads a file holding %s as an empty list, and replaces it', async (_label, content) => {
    await fs.mkdir(path.dirname(knownProjectsPath()), { recursive: true });
    await fs.writeFile(knownProjectsPath(), content);

    expect(readKnownProjects()).toEqual([]);
    const dir = await project('app');
    rememberProject(dir);
    expect(readKnownProjects()).toEqual([dir]);
  });

  it('never fails the command when the list cannot be written', async () => {
    // A file where the data folder should be: nothing can be created under it.
    await fs.writeFile(path.join(box, 'data'), 'in the way');

    expect(() => rememberProject(path.join(box, 'app'))).not.toThrow();
    expect(readKnownProjects()).toEqual([]);
    expect(otherProjectsNote(box)).toBeUndefined();
  });

  it('says nothing when no other project has its own skills', async () => {
    const dir = await project('app');
    rememberProject(dir);
    rememberProject(await project('no-skills'));

    expect(otherProjectsNote(dir)).toBeUndefined();
  });
});

// The real CLI in a throwaway home, as in global-skills.test.ts.
describe('naming the projects that still have their own skills', () => {
  let box: string;
  let home: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    box = realpathSync.native(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-known-cli-')));
    home = path.join(box, 'home');
    await fs.mkdir(home, { recursive: true });
    env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      XDG_STATE_HOME: path.join(home, '.local', 'state'),
      LOCALAPPDATA: path.join(home, 'AppData', 'Local'),
      APPDATA: path.join(home, 'AppData', 'Roaming'),
      CODEX_HOME: path.join(home, '.codex'),
      CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
      OPENSPEC_SKILLS_SOURCE: path.join(cliProjectRoot, 'skills'),
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
  const listFile = () => path.join(home, '.local', 'share', 'openspec', 'projects.json');
  const listed = (): string[] => (existsSync(listFile()) ? JSON.parse(readFileSync(listFile(), 'utf8')).projects : []);
  const NOTE = 'still has its own OpenSpec skills';

  it('records a project on init and on update, and not in a dry run', async () => {
    const first = await project('first');
    await cli(first, 'init', '--scope', 'project', '--tools', 'claude');
    expect(listed()).toEqual([first]);

    // A project set up before the list existed is picked up by its next update.
    await fs.rm(listFile());
    await cli(first, 'update', '--dry-run');
    expect(existsSync(listFile())).toBe(false);
    await cli(first, 'update');
    expect(listed()).toEqual([first]);

    const second = await project('second');
    await cli(second, 'init', '--scope', 'global', '--tools', 'claude');
    expect(listed()).toEqual([first, second]);
  });

  it('names them when another project moves to the global skills, and on update from anywhere', async () => {
    const own = await project('own');
    await cli(own, 'init', '--scope', 'project', '--tools', 'claude');
    const moved = await project('moved');

    const init = await cli(moved, 'init', '--scope', 'global', '--tools', 'claude');
    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain(`1 other project on this machine ${NOTE}:\n  ${own}\n`);
    expect(init.stdout).toContain('To move one to the global skills, run this in it: openspec init --scope global');

    const fromProject = await cli(moved, 'update');
    expect(fromProject.stdout).toContain(`  ${own}\n`);
    const fromElsewhere = await cli(await project('not-a-project'), 'update');
    expect(fromElsewhere.exitCode).toBe(0);
    expect(fromElsewhere.stdout).toContain(`  ${own}\n`);

    // The project itself is told about its own double copy, not listed as another.
    const inOwn = await cli(own, 'update');
    expect(inOwn.stdout).not.toContain(NOTE);
  });

  it('stops naming a project once it has moved, or is gone', async () => {
    const own = await project('own');
    const doomed = await project('doomed');
    await cli(own, 'init', '--scope', 'project', '--tools', 'claude');
    await cli(doomed, 'init', '--scope', 'project', '--tools', 'claude');
    const moved = await project('moved');
    await cli(moved, 'init', '--scope', 'global', '--tools', 'claude');

    expect((await cli(moved, 'update')).stdout).toContain(`2 other projects on this machine still have their own`);
    await cli(own, 'init', '--scope', 'global');
    await fs.rm(doomed, { recursive: true });

    const result = await cli(moved, 'update');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('still ha');
  });

  it('says nothing on a machine without the global skills', async () => {
    await cli(await project('one'), 'init', '--scope', 'project', '--tools', 'claude');
    const two = await project('two');
    const init = await cli(two, 'init', '--scope', 'project', '--tools', 'claude');
    const update = await cli(two, 'update');

    expect(init.stdout + update.stdout).not.toContain('still ha');
  });

  it('keeps init and update working when the list cannot be written', async () => {
    await fs.mkdir(path.join(home, '.local', 'share'), { recursive: true });
    await fs.writeFile(path.join(home, '.local', 'share', 'openspec'), 'in the way');
    const dir = await project('app');

    const init = await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
    const update = await cli(dir, 'update');

    expect(init.exitCode).toBe(0);
    expect(update.exitCode).toBe(0);
    expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });
});
