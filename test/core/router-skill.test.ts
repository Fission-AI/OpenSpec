import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync, readFileSync, readdirSync } from 'fs';
import os from 'os';
import path from 'path';
import { cliProjectRoot, runCLI } from '../helpers/run-cli.js';

// The router skill and its references/ files, installed and refreshed by the
// real CLI through the `skills` package. Every case runs in a fresh process
// with its own throwaway home, as the other install tests do.

const ROUTER = 'openspec';
const REFERENCES = ['references/answers.md', 'references/without-skills.md'];
const ROUTER_FILES = ['SKILL.md', ...REFERENCES];
const WITHOUT_ROUTER = ['propose', 'explore', 'apply', 'update', 'sync', 'archive'];

const published = (file: string) => readFileSync(path.join(cliProjectRoot, 'skills', ROUTER, file), 'utf8');
/** Every file in a skill folder, by path inside it. */
const filesIn = (folder: string) =>
  readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();

describe('the router skill and its references', { timeout: 60_000 }, () => {
  let box: string;
  let home: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    box = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-router-')));
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
    };
  });

  afterEach(async () => {
    await fs.rm(box, { recursive: true, force: true });
  });

  const project = async () => {
    const dir = path.join(box, 'app');
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };
  const cli = async (cwd: string, ...args: string[]) => {
    const result = await runCLI(args, { cwd, env, timeoutMs: 60000 });
    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    return result;
  };
  const setWorkflows = async (workflows: string[]) => {
    const file = path.join(home, '.config', 'openspec', 'config.json');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ profile: 'custom', workflows }));
  };
  /** The router as an earlier release left it: an older reference, and SKILL.md recording its digest. */
  const makeStale = async (folder: string) => {
    await fs.writeFile(path.join(folder, 'references', 'without-skills.md'), 'An older reference.\n');
    const skill = path.join(folder, 'SKILL.md');
    await fs.writeFile(skill, readFileSync(skill, 'utf8').replace(/references: "[0-9a-f]+"/, 'references: "000000000000"'));
  };
  const expectPublished = (folder: string) => {
    expect(filesIn(folder)).toEqual(ROUTER_FILES);
    for (const file of ROUTER_FILES) {
      expect(readFileSync(path.join(folder, file), 'utf8').replace(/\r\n/g, '\n'), file).toBe(published(file));
    }
  };

  it('publishes the router with its references, and SKILL.md says when to read each', () => {
    expect(filesIn(path.join(cliProjectRoot, 'skills', ROUTER))).toEqual(ROUTER_FILES);
    const skill = published('SKILL.md');
    for (const reference of REFERENCES) expect(skill).toContain(`\`${reference}\``);
  });

  describe('in a project', () => {
    it('installs the router and its references for the project and its tool', async () => {
      const dir = await project();
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');

      expectPublished(path.join(dir, '.agents', 'skills', ROUTER));
      // Claude Code reads its own folder: a link to the shared copy, or a plain copy where links can't be made.
      expectPublished(path.join(dir, '.claude', 'skills', ROUTER));
    });

    it('refreshes a stale reference on update', async () => {
      const dir = await project();
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      await makeStale(path.join(dir, '.agents', 'skills', ROUTER));

      await cli(dir, 'update');

      expectPublished(path.join(dir, '.agents', 'skills', ROUTER));
      expectPublished(path.join(dir, '.claude', 'skills', ROUTER));
      expect((await runCLI(['update'], { cwd: dir, env, timeoutMs: 60000 })).stdout).toContain('up to date');
    });

    it('removes the router with its references when the profile leaves it out', async () => {
      const dir = await project();
      await cli(dir, 'init', '--scope', 'project', '--tools', 'claude');
      await setWorkflows(WITHOUT_ROUTER);

      await cli(dir, 'update');

      expect(existsSync(path.join(dir, '.agents', 'skills', ROUTER))).toBe(false);
      expect(existsSync(path.join(dir, '.claude', 'skills', ROUTER))).toBe(false);
      expect(existsSync(path.join(dir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    });
  });

  describe('for this machine', () => {
    const globalRouter = () => path.join(home, '.agents', 'skills', ROUTER);

    it('installs the router and its references once for the machine', async () => {
      const dir = await project();
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');

      expectPublished(globalRouter());
      expectPublished(path.join(home, '.claude', 'skills', ROUTER));
      expect(existsSync(path.join(dir, '.agents'))).toBe(false);
    });

    it('refreshes a stale reference on update, and removes the router when the profile leaves it out', async () => {
      const dir = await project();
      await cli(dir, 'init', '--scope', 'global', '--tools', 'claude');
      await makeStale(globalRouter());

      await cli(dir, 'update');
      expectPublished(globalRouter());

      await setWorkflows(WITHOUT_ROUTER);
      await cli(dir, 'update');
      expect(existsSync(globalRouter())).toBe(false);
      expect(existsSync(path.join(home, '.claude', 'skills', ROUTER))).toBe(false);
      expect(existsSync(path.join(home, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    });
  });
});
