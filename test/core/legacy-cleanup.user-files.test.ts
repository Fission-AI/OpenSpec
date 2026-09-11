import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  cleanupLegacyArtifacts,
  detectLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  getToolsFromLegacyArtifacts,
  omitToolLegacyArtifacts,
  LEGACY_SLASH_COMMAND_PATHS,
} from '../../src/core/legacy-cleanup.js';
import { runCLI } from '../helpers/run-cli.js';

/**
 * Pre-opsx tools kept their commands in a `<tool>/commands/openspec/` folder,
 * and users keep their own commands in that same folder. Cleanup may delete
 * only the files OpenSpec wrote there, and the folder only once nothing else
 * is left in it.
 */

// The files the old SlashCommandRegistry wrote, per directory-based tool.
const LEGACY_COMMAND_DIRS = [
  { toolId: 'claude', dir: '.claude/commands/openspec', files: ['apply.md', 'archive.md', 'proposal.md'], userFile: 'team-review.md' },
  { toolId: 'codebuddy', dir: '.codebuddy/commands/openspec', files: ['apply.md', 'archive.md', 'proposal.md'], userFile: 'team-review.md' },
  { toolId: 'qoder', dir: '.qoder/commands/openspec', files: ['apply.md', 'archive.md', 'proposal.md'], userFile: 'team-review.md' },
  { toolId: 'crush', dir: '.crush/commands/openspec', files: ['apply.md', 'archive.md', 'proposal.md'], userFile: 'team-review.md' },
  { toolId: 'gemini', dir: '.gemini/commands/openspec', files: ['apply.toml', 'archive.toml', 'proposal.toml'], userFile: 'team-review.toml' },
];

const CLAUDE_DIR = '.claude/commands/openspec';
const CLAUDE_FILES = ['apply.md', 'archive.md', 'proposal.md'];

describe('legacy command directories and the files users keep in them', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-legacy-user-files-'));
    process.env.CODEX_HOME = path.join(testDir, 'codex-home');
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const inProject = (dir: string, ...names: string[]) => path.join(testDir, dir, ...names);
  const exists = (filePath: string) => fs.access(filePath).then(() => true, () => false);

  async function writeFiles(dir: string, names: readonly string[]): Promise<void> {
    for (const name of names) {
      const filePath = inProject(dir, name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `content of ${name}`);
    }
  }

  it('covers every directory-based legacy entry', () => {
    const directoryTools = Object.entries(LEGACY_SLASH_COMMAND_PATHS)
      .filter(([, pattern]) => pattern.type === 'directory')
      .map(([toolId]) => toolId)
      .sort();
    expect(directoryTools).toEqual([...LEGACY_COMMAND_DIRS.map((entry) => entry.toolId), 'lingma'].sort());
  });

  describe.each(LEGACY_COMMAND_DIRS)('$toolId', ({ toolId, dir, files, userFile }) => {
    it('removes the folder when it holds only OpenSpec files', async () => {
      await writeFiles(dir, files);

      const detection = await detectLegacyArtifacts(testDir);
      expect(detection.slashCommandDirs).toContain(dir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedDirs).toContain(dir);
      expect(await exists(inProject(dir))).toBe(false);
    });

    it('keeps a user file and removes only the OpenSpec files', async () => {
      await writeFiles(dir, [...files, userFile]);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(await fs.readFile(inProject(dir, userFile), 'utf-8')).toBe(`content of ${userFile}`);
      for (const name of files) {
        expect(await exists(inProject(dir, name))).toBe(false);
      }
      expect(result.deletedDirs).not.toContain(dir);
      expect(result.deletedFiles).toEqual(expect.arrayContaining(files.map((name) => `${dir}/${name}`)));
      expect(result.keptFiles).toEqual([`${dir}/${userFile}`]);
      expect(getToolsFromLegacyArtifacts(detection)).toContain(toolId);
    });
  });

  it('keeps a nested folder of user commands', async () => {
    await writeFiles(CLAUDE_DIR, [...CLAUDE_FILES, path.join('team', 'review.md')]);

    const result = await cleanupLegacyArtifacts(testDir, await detectLegacyArtifacts(testDir));

    expect(await fs.readFile(inProject(CLAUDE_DIR, 'team', 'review.md'), 'utf-8')).toBe(
      `content of ${path.join('team', 'review.md')}`
    );
    expect(result.keptFiles).toEqual([`${CLAUDE_DIR}/team/`]);
    expect(result.deletedDirs).not.toContain(CLAUDE_DIR);
  });

  it('treats a folder that carries a legacy file name as the user\'s', async () => {
    await writeFiles(CLAUDE_DIR, ['proposal.md', path.join('apply.md', 'notes.md')]);

    const result = await cleanupLegacyArtifacts(testDir, await detectLegacyArtifacts(testDir));

    expect(await exists(inProject(CLAUDE_DIR, 'apply.md', 'notes.md'))).toBe(true);
    expect(await exists(inProject(CLAUDE_DIR, 'proposal.md'))).toBe(false);
    expect(result.keptFiles).toEqual([`${CLAUDE_DIR}/apply.md/`]);
  });

  it('keeps a Gemini markdown file that shares a legacy command name', async () => {
    const dir = '.gemini/commands/openspec';
    await writeFiles(dir, ['proposal.toml', 'proposal.md']);

    const result = await cleanupLegacyArtifacts(testDir, await detectLegacyArtifacts(testDir));

    expect(await exists(inProject(dir, 'proposal.md'))).toBe(true);
    expect(await exists(inProject(dir, 'proposal.toml'))).toBe(false);
    expect(result.keptFiles).toEqual([`${dir}/proposal.md`]);
  });

  it('neither reports nor touches a folder holding no OpenSpec files', async () => {
    await writeFiles(CLAUDE_DIR, ['team-review.md']);

    const detection = await detectLegacyArtifacts(testDir);
    expect(detection.slashCommandDirs).not.toContain(CLAUDE_DIR);
    expect(detection.slashCommandFiles.filter((file) => file.startsWith(CLAUDE_DIR))).toEqual([]);
    expect(detection.hasLegacyArtifacts).toBe(false);

    await cleanupLegacyArtifacts(testDir, detection);
    expect(await exists(inProject(CLAUDE_DIR, 'team-review.md'))).toBe(true);
  });

  it('leaves files in the Lingma folder alone, because OpenSpec never wrote there', async () => {
    const dir = '.lingma/commands/openspec';
    await writeFiles(dir, ['proposal.md']);

    const detection = await detectLegacyArtifacts(testDir);
    expect(detection.slashCommandDirs).not.toContain(dir);
    await cleanupLegacyArtifacts(testDir, detection);

    expect(await exists(inProject(dir, 'proposal.md'))).toBe(true);
  });

  it('still removes an empty leftover legacy folder', async () => {
    const dir = '.lingma/commands/openspec';
    await fs.mkdir(inProject(dir), { recursive: true });

    const detection = await detectLegacyArtifacts(testDir);
    expect(detection.slashCommandDirs).toContain(dir);
    const result = await cleanupLegacyArtifacts(testDir, detection);

    expect(result.deletedDirs).toContain(dir);
    expect(await exists(inProject(dir))).toBe(false);
  });

  it('keeps a file added between detection and cleanup', async () => {
    await writeFiles(CLAUDE_DIR, CLAUDE_FILES);
    const detection = await detectLegacyArtifacts(testDir);
    expect(detection.slashCommandDirs).toContain(CLAUDE_DIR);

    // e.g. while the interactive upgrade prompt was waiting
    await writeFiles(CLAUDE_DIR, ['team-review.md']);
    const result = await cleanupLegacyArtifacts(testDir, detection);

    expect(await exists(inProject(CLAUDE_DIR, 'team-review.md'))).toBe(true);
    expect(result.deletedDirs).not.toContain(CLAUDE_DIR);
    expect(result.keptFiles).toEqual([`${CLAUDE_DIR}/team-review.md`]);
  });

  it('lists OpenSpec\'s files, not the folder, in the upgrade prompt when the folder holds user files', async () => {
    await writeFiles(CLAUDE_DIR, [...CLAUDE_FILES, 'team-review.md']);

    const summary = formatDetectionSummary(await detectLegacyArtifacts(testDir));
    const lines = summary.split('\n').map((line) => line.trim());

    expect(lines).toContain(`• ${CLAUDE_DIR}/proposal.md`);
    expect(lines).not.toContain(`• ${CLAUDE_DIR}/`);
    expect(summary).not.toContain('team-review.md');
  });

  it('names what was kept in the cleanup summary and never claims the folder was removed', async () => {
    await writeFiles(CLAUDE_DIR, [...CLAUDE_FILES, 'team-review.md']);

    const result = await cleanupLegacyArtifacts(testDir, await detectLegacyArtifacts(testDir));
    const summary = formatCleanupSummary(result);

    expect(summary).toContain(`Kept ${CLAUDE_DIR}/team-review.md (not created by OpenSpec)`);
    expect(summary).toContain(`Removed ${CLAUDE_DIR}/proposal.md`);
    expect(summary).not.toContain(`Removed ${CLAUDE_DIR}/ `);
  });

  it('leaves a mixed folder untouched when its tool is omitted from cleanup', async () => {
    await writeFiles(CLAUDE_DIR, [...CLAUDE_FILES, 'team-review.md']);

    const detection = omitToolLegacyArtifacts(await detectLegacyArtifacts(testDir), ['claude']);
    expect(detection.slashCommandFiles.filter((file) => file.startsWith(CLAUDE_DIR))).toEqual([]);
    await cleanupLegacyArtifacts(testDir, detection);

    expect(await exists(inProject(CLAUDE_DIR, 'proposal.md'))).toBe(true);
  });
});

describe('openspec init with a legacy command folder', () => {
  const T = 120_000;
  let base: string;

  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-legacy-init-'));
  });

  afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  async function legacyProject(withUserFile: boolean) {
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    const dir = path.join(project, '.claude', 'commands', 'openspec');
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(dir, { recursive: true });
    for (const name of CLAUDE_FILES) {
      await fs.writeFile(path.join(dir, name), `---\nname: OpenSpec: ${name}\n---\nold\n`);
    }
    if (withUserFile) {
      await fs.writeFile(path.join(dir, 'team-review.md'), '---\ndescription: my team review checklist\n---\nReview carefully.\n');
    }
    const env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      CODEX_HOME: path.join(home, '.codex'),
      OPENSPEC_NO_ANIMATION: '1',
    };
    const init = (extraArgs: string[]) =>
      runCLI(['init', '--tools', 'claude', ...extraArgs], { cwd: project, env, timeoutMs: 60_000 });
    return { dir, init };
  }

  it('removes a folder holding only OpenSpec files', async () => {
    const { dir, init } = await legacyProject(false);
    expect((await init([])).exitCode).toBe(0);
    await expect(fs.access(dir)).rejects.toThrow();
  }, T);

  // Without a TTY, init cleans up automatically even without --force, which
  // is how agents and CI run it.
  it.each([[[] as string[]], [['--force']]])('keeps a user file in the folder (init %j)', async (extraArgs) => {
    const { dir, init } = await legacyProject(true);

    const result = await init(extraArgs);

    expect(result.exitCode).toBe(0);
    expect(await fs.readFile(path.join(dir, 'team-review.md'), 'utf-8')).toContain('Review carefully.');
    await expect(fs.access(path.join(dir, 'proposal.md'))).rejects.toThrow();
    expect(result.stdout).toContain(`Kept ${CLAUDE_DIR}/team-review.md (not created by OpenSpec)`);
  }, T);
});
