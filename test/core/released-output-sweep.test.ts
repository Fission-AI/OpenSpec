import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  currentGeneratablePaths,
  findStaleReleasedFiles,
  pruneEmptyParents,
} from '../../src/core/released-output-sweep.js';
import { RELEASED_GENERATED_PATHS } from '../../src/core/shared/released-generated-fingerprints.js';
import {
  detectLegacyArtifacts,
  legacyCleanupDeletesOnlyReleasedOutput,
} from '../../src/core/legacy-cleanup.js';
import { runCLI } from '../helpers/run-cli.js';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/released-output');
// Real files released versions wrote, kept byte for byte.
const codexPrompt = () => fs.readFile(path.join(fixtures, 'v1.0.0-codex-prompt-opsx-new.md'), 'utf8');
const claudeMd = () => fs.readFile(path.join(fixtures, 'v0.23.0-CLAUDE.md'), 'utf8');

const STALE = '.codex/prompts/opsx-new.md';

describe('stale released output', () => {
  let root: string;
  let project: string;

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sweep-')));
    project = path.join(root, 'project');
    await fs.mkdir(project);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function write(rel: string, content: string) {
    const file = path.join(project, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  it('records only tool-folder paths, never root files or openspec/', () => {
    expect(RELEASED_GENERATED_PATHS).toContain(STALE);
    for (const rel of RELEASED_GENERATED_PATHS) {
      expect(rel, rel).toContain('/');
      expect(rel, rel).not.toMatch(/^openspec\//);
      expect(rel, rel).not.toMatch(/^\.\.|^\//);
    }
  });

  // Codex's current skills, as an update leaves them: the shared copy with
  // Codex listed as set up. The shared copy alone belongs to every tool.
  const codexReplacement = async () => {
    await write('.agents/skills/openspec-new-change/SKILL.md', 'current');
    await write('.agents/skills/.openspec-target', 'codex\n');
  };

  it('finds an untouched file an earlier release left, once its tool has a replacement', async () => {
    await write(STALE, await codexPrompt());
    await codexReplacement();
    expect(await findStaleReleasedFiles(project)).toEqual([STALE]);
  });

  it('keeps it while its tool has no replacement in the project', async () => {
    // Nothing current for Codex: the old file may be all the user has.
    await write(STALE, await codexPrompt());
    expect(await findStaleReleasedFiles(project)).toEqual([]);
  });

  it('does not treat the shared copy as a replacement for a tool that is not listed', async () => {
    // Every tool's skills live in .agents/skills now, so a shared skill says
    // nothing about Codex: with only Claude listed, Codex's file stays.
    await write(STALE, await codexPrompt());
    await write('.agents/skills/openspec-new-change/SKILL.md', 'current');
    await write('.agents/skills/.openspec-target', 'claude\n');
    expect(await findStaleReleasedFiles(project)).toEqual([]);
  });

  it('accepts a CRLF checkout of the same file', async () => {
    await write(STALE, (await codexPrompt()).replace(/\n/g, '\r\n'));
    await codexReplacement();
    expect(await findStaleReleasedFiles(project)).toEqual([STALE]);
  });

  it('keeps a file the user edited', async () => {
    await write(STALE, (await codexPrompt()) + '\nMy own note.\n');
    await codexReplacement();
    expect(await findStaleReleasedFiles(project)).toEqual([]);
  });

  it('never follows a link out of the project', async () => {
    await codexReplacement();
    const outside = path.join(root, 'outside');
    await fs.mkdir(path.join(outside, 'prompts'), { recursive: true });
    await fs.writeFile(path.join(outside, 'prompts', 'opsx-new.md'), await codexPrompt());
    await fs.symlink(outside, path.join(project, '.codex'), 'dir');
    expect(await findStaleReleasedFiles(project)).toEqual([]);
  });

  it('never removes a linked file, even to released output', async () => {
    await codexReplacement();
    const target = path.join(root, 'elsewhere.md');
    await fs.writeFile(target, await codexPrompt());
    await fs.mkdir(path.join(project, '.codex', 'prompts'), { recursive: true });
    await fs.symlink(target, path.join(project, STALE));
    expect(await findStaleReleasedFiles(project)).toEqual([]);
  });

  it('reports the same paths when the project is reached through a link', async () => {
    await write(STALE, await codexPrompt());
    await codexReplacement();
    const alias = path.join(root, 'alias');
    await fs.symlink(project, alias, process.platform === 'win32' ? 'junction' : 'dir');
    expect(await findStaleReleasedFiles(alias)).toEqual([STALE]);
  });

  it('leaves former-root skills to the root migration', async () => {
    await write('.codex/skills/openspec-new-change/SKILL.md', await codexPrompt());
    const stale = await findStaleReleasedFiles(project);
    expect(stale.some((rel) => rel.startsWith('.codex/skills/'))).toBe(false);
  });

  // Codex's `.codex` and Antigravity's `.agent` are cleaned up only after the
  // replacement is written, so a copy there with no replacement belongs to a
  // workflow or delivery the project no longer installs. Nothing else removes it.
  describe('former-root files with no replacement to wait for', () => {
    const oldSkill = '.codex/skills/openspec-new-change/SKILL.md';
    const oldCommand = '.agent/workflows/opsx-new.md';

    it('records these paths', () => {
      expect(RELEASED_GENERATED_PATHS).toContain(oldSkill);
      expect(RELEASED_GENERATED_PATHS).toContain(oldCommand);
    });

    it('sweeps an untouched skill of a workflow the project no longer installs', async () => {
      await write(oldSkill, await codexPrompt());
      // Codex is set up, without the `new` workflow.
      await write('.agents/skills/openspec-propose/SKILL.md', 'current');
      await write('.agents/skills/.openspec-target', 'codex\n');
      expect(await findStaleReleasedFiles(project)).toContain(oldSkill);
    });

    it('sweeps untouched commands once the project installs skills only', async () => {
      await write(oldCommand, await codexPrompt());
      // Antigravity is set up with skills and no command files.
      await write('.agents/skills/openspec-new-change/SKILL.md', 'current');
      await write('.agents/skills/.openspec-target', 'antigravity\n');
      expect(await findStaleReleasedFiles(project)).toContain(oldCommand);
    });

    it('keeps one the user edited, and still sweeps the untouched one beside it', async () => {
      const edited = '.codex/skills/openspec-continue-change/SKILL.md';
      await write(oldSkill, await codexPrompt());
      await write(edited, (await codexPrompt()) + '\nMy own note.\n');
      await write('.agents/skills/openspec-propose/SKILL.md', 'current');
      await write('.agents/skills/.openspec-target', 'codex\n');
      const stale = await findStaleReleasedFiles(project);
      expect(stale).toContain(oldSkill);
      expect(stale).not.toContain(edited);
    });

    it('keeps everything while the tool has nothing current', async () => {
      await write(oldSkill, await codexPrompt());
      await write(oldCommand, await codexPrompt());
      expect(await findStaleReleasedFiles(project)).toEqual([]);
    });

    it('leaves the whole root alone while an edited copy sits beside its replacement', async () => {
      // The root migration kept this one: its replacement exists and differs.
      await write('.codex/skills/openspec-propose/SKILL.md', 'edited by the user');
      await write('.agents/skills/openspec-propose/SKILL.md', 'current');
      await write(oldSkill, await codexPrompt());
      expect(await findStaleReleasedFiles(project)).not.toContain(oldSkill);
    });
  });

  it('leaves a former root alone while its move still has files to make', async () => {
    const command = '.windsurf/commands/opsx/new.md';
    expect(RELEASED_GENERATED_PATHS).toContain(command);
    await write(command, await codexPrompt());
    await write('.agents/skills/openspec-new-change/SKILL.md', 'current');
    await write('.agents/skills/.openspec-target', 'devin\n');
    // The Windsurf → Devin move asks first. While it still has skills or
    // commands to move (it was declined, or delivery is commands-only), the
    // user may be on a build that reads only .windsurf/.
    await write('.windsurf/workflows/opsx-new.md', 'not moved yet');
    expect(await findStaleReleasedFiles(project)).not.toContain(command);
    await fs.rm(path.join(project, '.windsurf/workflows/opsx-new.md'));
    await write('.windsurf/skills/openspec-new-change/SKILL.md', 'not moved yet');
    expect(await findStaleReleasedFiles(project)).not.toContain(command);
    // Once the move is done, the leftover is swept like any other.
    await fs.rm(path.join(project, '.windsurf/skills'), { recursive: true });
    expect(await findStaleReleasedFiles(project)).toContain(command);
  });

  it('prunes only the folders its removals emptied', async () => {
    await write(STALE, 'x');
    await write('.codex/config.toml', 'mine');
    await fs.rm(path.join(project, STALE));
    await pruneEmptyParents(project, [STALE]);
    await expect(fs.stat(path.join(project, '.codex', 'prompts'))).rejects.toThrow();
    expect(await fs.readFile(path.join(project, '.codex', 'config.toml'), 'utf8')).toBe('mine');
  });

  it('covers every path the current release writes', async () => {
    const home = path.join(root, 'home');
    const xdg = path.join(home, '.config');
    await fs.mkdir(path.join(xdg, 'openspec'), { recursive: true });
    await fs.writeFile(
      path.join(xdg, 'openspec', 'config.json'),
      JSON.stringify({ profile: 'custom', delivery: 'both', workflows: [
        'propose', 'explore', 'new', 'continue', 'apply', 'update',
        'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
      ] })
    );
    const result = await runCLI(['init', '--tools', 'all'], {
      cwd: project,
      env: { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: xdg, CODEX_HOME: path.join(home, '.codex'), CI: '1' },
    });
    expect(result.exitCode, result.stderr).toBe(0);

    const current = currentGeneratablePaths();
    const written: string[] = [];
    const walk = async (dir: string) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else written.push(path.relative(project, full).split(path.sep).join('/'));
      }
    };
    await walk(project);
    const toolFiles = written.filter((rel) => rel.includes('/') && !rel.startsWith('openspec/'));
    expect(toolFiles.length).toBeGreaterThan(100);
    expect(toolFiles.filter((rel) => !current.has(rel))).toEqual([]);
    // And none of it is ever reported stale.
    expect(await findStaleReleasedFiles(project)).toEqual([]);
  }, 120_000);
});

describe('legacy cleanup without --force', () => {
  let project: string;

  beforeEach(async () => {
    project = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-legacy-auto-')));
  });

  afterEach(async () => {
    await fs.rm(project, { recursive: true, force: true });
  });

  it('may strip an OpenSpec block a release wrote into the user file', async () => {
    await fs.writeFile(path.join(project, 'CLAUDE.md'), '# My project\n\n' + (await claudeMd()));
    const detection = await detectLegacyArtifacts(project);
    expect(detection.configFilesToUpdate).toContain('CLAUDE.md');
    expect(await legacyCleanupDeletesOnlyReleasedOutput(project, detection)).toBe(true);
  });

  it('judges exactly the span removal would delete', async () => {
    // An END marker with text after it on the same line is not one removal
    // accepts, so removal would run on to the next own-line END and take the
    // user's text in between. The check must see that span, not a shorter one.
    const tricky =
      (await claudeMd()).replace('<!-- OPENSPEC:END -->', '<!-- OPENSPEC:END --> <- note') +
      '\n## My section\n\nMine.\n\n<!-- OPENSPEC:END -->\n';
    await fs.writeFile(path.join(project, 'CLAUDE.md'), tricky);
    const detection = await detectLegacyArtifacts(project);
    expect(await legacyCleanupDeletesOnlyReleasedOutput(project, detection)).toBe(false);
  });

  it('judges the block removal picks, not an inline one before it', async () => {
    // Markers that share a line with other text are not a block removal
    // accepts, so it strips the own-line block that follows: the edited one.
    const block = await claudeMd();
    const inline = block.replace(/\n/g, ' ');
    const edited = block.replace('<!-- OPENSPEC:END -->', 'Always use pnpm.\n<!-- OPENSPEC:END -->');
    const file = path.join(project, 'CLAUDE.md');
    await fs.writeFile(file, `Intro ${inline}\n\n${block}`);
    expect(await legacyCleanupDeletesOnlyReleasedOutput(project, await detectLegacyArtifacts(project))).toBe(true);
    await fs.writeFile(file, `Intro ${inline}\n\n${edited}`);
    expect(await legacyCleanupDeletesOnlyReleasedOutput(project, await detectLegacyArtifacts(project))).toBe(false);
  });

  it('must ask before stripping a block the user wrote inside', async () => {
    const edited = (await claudeMd()).replace('<!-- OPENSPEC:END -->', 'Always use pnpm.\n<!-- OPENSPEC:END -->');
    await fs.writeFile(path.join(project, 'CLAUDE.md'), edited);
    const detection = await detectLegacyArtifacts(project);
    expect(await legacyCleanupDeletesOnlyReleasedOutput(project, detection)).toBe(false);
  });
});
