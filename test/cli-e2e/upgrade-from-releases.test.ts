import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs, existsSync, readdirSync, readFileSync, readlinkSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { currentGeneratablePaths, findStaleReleasedFiles } from '../../src/core/released-output-sweep.js';
import { LEGACY_TOOL_ROOTS } from '../../src/core/migration.js';

/**
 * Upgrades real projects made by released OpenSpec versions straight to this
 * build, the way a user who skipped releases would. Each release from npm runs
 * `init --tools all` in a throwaway project with a throwaway home; then this
 * build's `update` must finish without --force, leave no untouched output of
 * an earlier release behind, keep anything the user edited, and have nothing
 * left to do on a second run.
 *
 * Needs npm and network access, so it runs only with
 * OPENSPEC_RELEASE_UPGRADES=1. OPENSPEC_RELEASE_CACHE reuses installs.
 */
const enabled = process.env.OPENSPEC_RELEASE_UPGRADES === '1';
// 0.14 is the last layout with Cline's and Qwen's commands one folder up.
const RELEASES = ['0.14.0', '0.23.0', '1.0.0', '1.2.0', '1.10.0', '1.16.0'];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const currentBin = path.join(repoRoot, 'bin', 'openspec.js');
const cacheDir = path.resolve(
  process.env.OPENSPEC_RELEASE_CACHE ?? path.join(os.tmpdir(), 'openspec-release-cache')
);

function releaseBin(version: string): string {
  const dir = path.join(cacheDir, `v${version}`);
  const bin = path.join(dir, 'node_modules', '@fission-ai', 'openspec', 'bin', 'openspec.js');
  if (!existsSync(bin)) {
    execFileSync(
      'npm',
      ['install', '--silent', '--no-audit', '--no-fund', '--ignore-scripts', '--prefix', dir, `@fission-ai/openspec@${version}`],
      { stdio: 'ignore', shell: process.platform === 'win32' }
    );
  }
  return bin;
}

interface Sandbox {
  home: string;
  project: string;
}

function run(bin: string, args: string[], box: Sandbox): { status: number | null; output: string } {
  // A minimal environment: nothing from the real home or config may leak in.
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: box.project,
    input: '',
    encoding: 'utf8',
    timeout: 180_000,
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      HOME: box.home,
      USERPROFILE: box.home,
      APPDATA: path.join(box.home, 'AppData', 'Roaming'),
      LOCALAPPDATA: path.join(box.home, 'AppData', 'Local'),
      XDG_CONFIG_HOME: path.join(box.home, '.config'),
      XDG_DATA_HOME: path.join(box.home, '.local', 'share'),
      CODEX_HOME: path.join(box.home, '.codex'),
      OPENSPEC_TELEMETRY: '0',
      DO_NOT_TRACK: '1',
      CI: '1',
      NO_COLOR: '1',
      TERM: 'dumb',
    },
  });
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  if (existsSync(root)) walk(root);
  return out.sort();
}

function snapshot(root: string): Record<string, string> {
  return Object.fromEntries(
    [
      ...listFiles(root).map((rel) => [
        rel,
        createHash('sha256').update(readFileSync(path.join(root, rel))).digest('hex'),
      ]),
      // Links too, recorded by where they point and never followed, so a link
      // made anywhere shows up.
      ...listLinks(root).map((rel) => [rel, `link:${readlinkSync(path.join(root, rel))}`]),
    ]
  );
}

function listLinks(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) out.push(path.relative(root, full).split(path.sep).join('/'));
      else if (entry.isDirectory()) walk(full);
    }
  };
  walk(root);
  return out;
}

/** OpenSpec skills and commands still under a tool's former root. */
function leftoversInFormerRoots(project: string): string[] {
  const roots = [...new Set(Object.values(LEGACY_TOOL_ROOTS).flat().map((r) => r.root))];
  return roots.flatMap((root) =>
    listFiles(path.join(project, root))
      .filter((rel) => /(^|\/)(openspec-[^/]+\/SKILL\.md|opsx[-/][^/]+)$/.test(rel))
      .map((rel) => `${root}/${rel}`)
  );
}

describe.skipIf(!enabled)('upgrading projects from released versions', () => {
  let tempRoot: string;

  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-release-upgrades-'));
    for (const version of RELEASES) releaseBin(version);
  }, 600_000);

  afterAll(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  async function initWith(
    version: string,
    name: string,
    tools = 'all',
    globalConfig?: Record<string, unknown>,
    home = path.join(tempRoot, name, 'home')
  ): Promise<Sandbox> {
    const box = { home, project: path.join(tempRoot, name, 'project') };
    await fs.mkdir(path.join(box.home, '.config', 'openspec'), { recursive: true });
    await fs.mkdir(box.project, { recursive: true });
    if (globalConfig) {
      await fs.writeFile(
        path.join(box.home, '.config', 'openspec', 'config.json'),
        JSON.stringify(globalConfig)
      );
    }
    const init = run(releaseBin(version), ['init', '--tools', tools], box);
    expect(init.status, init.output).toBe(0);
    expect(listFiles(box.project).length).toBeGreaterThan(3);
    return box;
  }

  it.each(RELEASES)('upgrades a %s project in one update', async (version) => {
    const box = await initWith(version, `jump-${version}`);

    const first = run(currentBin, ['update'], box);
    expect(first.status, first.output).toBe(0);
    expect(first.output).not.toContain('Run with --force to auto-cleanup');
    expect(first.output).not.toMatch(/differs? from the copy/);

    expect(await findStaleReleasedFiles(box.project)).toEqual([]);
    expect(leftoversInFormerRoots(box.project)).toEqual([]);
    // Nothing was edited, so every file left in a tool folder is one this
    // build writes: no old layout survives, recognized or not.
    const current = currentGeneratablePaths();
    const oldLayout = listFiles(box.project).filter(
      (rel) => rel.includes('/') && !rel.startsWith('openspec/') && !current.has(rel)
    );
    expect(oldLayout).toEqual([]);
    // Each linked tool reaches the one shared copy: a link, or where links
    // can't be made, an identical copy.
    const shared = path.join(box.project, '.agents', 'skills');
    for (const dir of ['.claude', '.kiro', '.continue']) {
      const skillsDir = path.join(box.project, dir, 'skills');
      if (!existsSync(skillsDir)) continue;
      for (const name of readdirSync(skillsDir)) {
        const spot = path.join(skillsDir, name);
        expect(readFileSync(path.join(spot, 'SKILL.md'), 'utf8'), `${dir}/${name}`).toBe(
          readFileSync(path.join(shared, name, 'SKILL.md'), 'utf8')
        );
      }
    }

    const before = snapshot(box.project);
    const second = run(currentBin, ['update'], box);
    expect(second.status, second.output).toBe(0);
    expect(second.output).toContain('up to date');
    expect(snapshot(box.project)).toEqual(before);
  }, 600_000);

  it('finishes what an earlier release update left behind', async () => {
    const box = await initWith('1.0.0', 'chain');
    const middle = run(releaseBin('1.16.0'), ['update', '--force'], box);
    expect(middle.status, middle.output).toBe(0);
    expect(leftoversInFormerRoots(box.project).length).toBeGreaterThan(0);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    expect(await findStaleReleasedFiles(box.project)).toEqual([]);
    expect(leftoversInFormerRoots(box.project)).toEqual([]);
  }, 600_000);

  // Projects are rarely one release old: they were made by one release,
  // updated by others, and had their settings changed on the way.
  it('cleans old folders after the workflows and delivery changed in between', async () => {
    // 1.0.0 installs ten workflows as skills and commands, in .agent/ and
    // .codex/ among others. The project then moves to the core profile and
    // skills only, and a later release updates it.
    const box = await initWith('1.0.0', 'history-settings');
    await fs.writeFile(
      path.join(box.home, '.config', 'openspec', 'config.json'),
      JSON.stringify({ profile: 'core', delivery: 'skills' })
    );
    const middle = run(releaseBin('1.16.0'), ['update', '--force'], box);
    expect(middle.status, middle.output).toBe(0);
    // What 1.16 leaves: old-folder copies of workflows and commands the
    // project no longer installs, which have no replacement to wait for.
    expect(leftoversInFormerRoots(box.project).length).toBeGreaterThan(0);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    expect(await findStaleReleasedFiles(box.project)).toEqual([]);
    expect(leftoversInFormerRoots(box.project)).toEqual([]);

    const before = snapshot(box.project);
    expect(run(currentBin, ['update'], box).output).toContain('up to date');
    expect(snapshot(box.project)).toEqual(before);
  }, 600_000);

  it('recognizes files a later release wrote for the workflows the project started with', async () => {
    // A 1.0.0 project keeps its ten workflows as a custom profile. 1.13
    // rewrites every file for that set, whose text differs from what 1.13
    // writes for its own default set. Nobody edited them, so switching to
    // skills only must remove every command file and call none of them edited.
    const box = await initWith('1.0.0', 'history-workflows');
    const middle = run(releaseBin('1.13.2'), ['update', '--force'], box);
    expect(middle.status, middle.output).toBe(0);
    const config = path.join(box.home, '.config', 'openspec', 'config.json');
    const saved = JSON.parse(await fs.readFile(config, 'utf8'));
    expect(saved.profile).toBe('custom');
    expect(saved.workflows).toHaveLength(10);
    await fs.writeFile(config, JSON.stringify({ ...saved, delivery: 'skills' }));

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    expect(result.output).not.toMatch(/Kept \d+ command files?/);
    const commands = listFiles(box.project).filter((rel) => /(^|\/)opsx[-/:][^/]+$/.test(rel));
    expect(commands).toEqual([]);
  }, 600_000);

  // A folder inside a tool folder can be a link to somewhere else (shared
  // workflows, another project). Nothing reached through it is the project's.
  it.each([
    ['without --force', []],
    ['with --force', ['--force']],
  ])('never deletes files outside the project through a linked folder (%s)', async (_label, flags) => {
    const box = await initWith('0.23.0', `linked-${flags.length}`, 'cline', { delivery: 'skills' });
    const workflows = path.join(box.project, '.clinerules', 'workflows');
    const sibling = path.join(tempRoot, `linked-${flags.length}`, 'sibling');
    await fs.rename(workflows, sibling);
    await fs.symlink(sibling, workflows, process.platform === 'win32' ? 'junction' : 'dir');
    const before = snapshot(sibling);
    expect(Object.keys(before).length).toBeGreaterThan(0);

    const result = run(currentBin, ['update', ...flags], box);
    expect(result.status, result.output).toBe(0);
    expect(snapshot(sibling)).toEqual(before);
  }, 600_000);

  it('moves a commands-only project to skills, keeping the command the user edited', async () => {
    // The 2.0 move in one case: a 1.x project that used commands only, with
    // one command customized. Update sets it up with skills, removes the
    // generated commands, and keeps the edited one byte for byte.
    const box = await initWith('1.16.0', 'commands-to-skills', 'claude,cursor', {
      profile: 'core',
      delivery: 'commands',
    });
    const edited = path.join(box.project, '.claude', 'commands', 'opsx', 'apply.md');
    const editedText = `${await fs.readFile(edited, 'utf8')}\nOur team step.\n`;
    await fs.writeFile(edited, editedText);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(/Kept 1 command file/);
    expect(await fs.readFile(edited, 'utf8')).toBe(editedText);
    const commands = listFiles(box.project).filter((rel) => /(^|\/)opsx[-/:][^/]+$/.test(rel));
    expect(commands).toEqual(['.claude/commands/opsx/apply.md']);
    expect(existsSync(path.join(box.project, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    expect(existsSync(path.join(box.project, '.claude', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);

    const before = snapshot(box.project);
    expect(run(currentBin, ['update'], box).output).toContain('up to date');
    expect(snapshot(box.project)).toEqual(before);
  }, 600_000);

  it('keeps every file the user edited', async () => {
    const box = await initWith('1.0.0', 'edited');
    const edited = [
      '.codex/skills/openspec-explore/SKILL.md', // former root of a shared-root tool
      '.windsurf/commands/opsx/apply.md', // path no tool reads now
      '.codex/prompts/opsx-ff.md', // prompt format a tool dropped
      '.opencode/command/opsx-apply.md', // legacy command cleanup
    ];
    for (const rel of edited) {
      await fs.appendFile(path.join(box.project, rel), '\nMy own note.\n');
    }

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    for (const rel of edited) {
      const content = await fs.readFile(path.join(box.project, rel), 'utf8');
      expect(content, rel).toContain('My own note.');
    }
    expect(result.output).toMatch(/Left 1 file in \.codex\/ that differs/);
  }, 600_000);

  it('removes nothing old when the user has not agreed to the cleanup', async () => {
    // 0.23 commands for Claude and Cursor, a hand-edited openspec/AGENTS.md so
    // cleanup is not automatic, and a tool already on 1.16 so update runs.
    const box = await initWith('0.23.0', 'declined', 'claude,cursor');
    await fs.appendFile(path.join(box.project, 'openspec', 'AGENTS.md'), '\nOur own rule.\n');
    // 1.16's own init would clean the 0.23 files up, so its OpenCode output is
    // made in a separate project and copied in.
    const donor = await initWith('1.16.0', 'declined-donor', 'opencode');
    await fs.cp(path.join(donor.project, '.opencode'), path.join(box.project, '.opencode'), { recursive: true });
    const before = listFiles(box.project).filter((rel) => /^\.(claude|cursor)\//.test(rel));
    expect(before.length).toBeGreaterThan(0);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('Run with --force to auto-cleanup');
    for (const rel of before) {
      expect(existsSync(path.join(box.project, rel)), rel).toBe(true);
    }
  }, 600_000);

  it('moves a commands-only tool whose only files are in its former folder', async () => {
    // Commands-only Antigravity: its only OpenSpec files are old commands in
    // .agent/, which update used to report as "no configured tools". It must
    // still be found, and set up with skills.
    const box = await initWith('1.10.0', 'commands-only', 'antigravity', {
      profile: 'core',
      delivery: 'commands',
    });
    const old = listFiles(path.join(box.project, '.agent', 'workflows'));
    expect(old.length).toBeGreaterThan(0);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    // 2.0 installs skills only: Antigravity gets them in the shared folder,
    // and its old commands are removed rather than moved.
    expect(existsSync(path.join(box.project, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
    for (const name of old) {
      expect(existsSync(path.join(box.project, '.agents', 'workflows', name)), name).toBe(false);
    }
    expect(leftoversInFormerRoots(box.project)).toEqual([]);
    expect(run(currentBin, ['update'], box).output).toContain('up to date');
  }, 600_000);

  it('removes nothing old when a tool fails to set up', async () => {
    const box = await initWith('0.23.0', 'failed-setup', 'claude');
    // A file where the skills folder should be makes Claude's setup fail.
    await fs.writeFile(path.join(box.project, '.claude', 'skills'), 'not a folder');
    const before = snapshot(box.project);

    const result = run(currentBin, ['update'], box);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('Failed to set up Claude Code');
    // Every file from before is still there, unchanged. (The shared copy in
    // .agents/skills may be written before Claude's own folder fails.)
    const after = snapshot(box.project);
    for (const [rel, hash] of Object.entries(before)) {
      expect(after[rel], rel).toBe(hash);
    }
    // Nothing new outside the shared copy.
    const added = Object.keys(after).filter((rel) => !(rel in before));
    expect(added.filter((rel) => !rel.startsWith('.agents/skills/'))).toEqual([]);
  }, 600_000);

  it('never sets up a tool or cleans up because of prompts in the home folder', async () => {
    // Another project on the same machine left Codex prompts in the home folder.
    const other = await initWith('1.5.0', 'shared-home-other', 'codex');
    expect(listFiles(path.join(other.home, '.codex', 'prompts')).length).toBeGreaterThan(0);
    // This build's own project, so "nothing changes" means exactly that.
    const box = { home: other.home, project: path.join(tempRoot, 'shared-home', 'project') };
    await fs.mkdir(box.project, { recursive: true });
    expect(run(currentBin, ['init', '--tools', 'claude'], box).status).toBe(0);
    await fs.writeFile(path.join(box.project, 'openspec', 'project.md'), '# Our context\n');
    const before = snapshot(box.project);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    expect(result.output).not.toContain('update removes them');
    expect(snapshot(box.project)).toEqual(before);
    expect(listFiles(path.join(other.home, '.codex', 'prompts')).length).toBeGreaterThan(0);
  }, 600_000);
});
