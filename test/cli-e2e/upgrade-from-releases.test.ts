import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs, existsSync, readdirSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { findStaleReleasedFiles } from '../../src/core/released-output-sweep.js';
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
const RELEASES = ['0.23.0', '1.0.0', '1.2.0', '1.10.0', '1.16.0'];

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
    listFiles(root).map((rel) => [
      rel,
      createHash('sha256').update(readFileSync(path.join(root, rel))).digest('hex'),
    ])
  );
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
    globalConfig?: Record<string, unknown>
  ): Promise<Sandbox> {
    const box = { home: path.join(tempRoot, name, 'home'), project: path.join(tempRoot, name, 'project') };
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

  it('never leaves a tool without its commands', async () => {
    // Commands-only Antigravity: its only OpenSpec files are old commands.
    const box = await initWith('1.10.0', 'commands-only', 'antigravity,claude', {
      profile: 'core',
      delivery: 'commands',
    });
    const old = listFiles(path.join(box.project, '.agent', 'workflows'));
    expect(old.length).toBeGreaterThan(0);

    const result = run(currentBin, ['update'], box);
    expect(result.status, result.output).toBe(0);
    for (const name of old) {
      const kept = existsSync(path.join(box.project, '.agent', 'workflows', name));
      const moved = existsSync(path.join(box.project, '.agents', 'workflows', name));
      expect(kept || moved, name).toBe(true);
    }
  }, 600_000);
});
