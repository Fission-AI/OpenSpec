import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { UpdateCommand } from '../../src/core/update.js';
import { InitCommand } from '../../src/core/init.js';
import { ALL_WORKFLOWS } from '../../src/core/profiles.js';
import { getGlobalConfigPath, type GlobalConfig } from '../../src/core/global-config.js';
import type { UpdatePlanChange } from '../../src/core/update-plan.js';

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));

vi.mock('@inquirer/prompts', () => ({ confirm: confirmMock }));

vi.mock('../../src/utils/interactive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive.js')>();
  return { ...actual, isInteractive: () => false };
});

/**
 * Writes the real global config file, so the dry run and the real update read
 * the same settings the way they do in production.
 */
async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  const configPath = getGlobalConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/** Absolute path -> file content, for every file under `root`. */
async function snapshotTree(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        files.set(full, await fs.readFile(full, 'utf-8'));
      }
    }
  }
  await walk(root);
  return files;
}

function diffTrees(
  before: Map<string, string>,
  after: Map<string, string>,
  projectPath: string
): Array<{ path: string; action: 'add' | 'update' | 'delete' }> {
  const changes: Array<{ path: string; action: 'add' | 'update' | 'delete' }> = [];
  const rel = (file: string) => path.relative(projectPath, file).split(path.sep).join('/');

  for (const [file, content] of after) {
    if (!before.has(file)) {
      changes.push({ path: rel(file), action: 'add' });
    } else if (before.get(file) !== content) {
      changes.push({ path: rel(file), action: 'update' });
    }
  }
  for (const file of before.keys()) {
    if (!after.has(file)) {
      changes.push({ path: rel(file), action: 'delete' });
    }
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

function withoutTool(changes: UpdatePlanChange[]) {
  return changes
    .map(({ path: filePath, action }) => ({ path: filePath, action }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

describe('openspec update --dry-run', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-dry-run-'));
    process.env.CODEX_HOME = path.join(testDir, 'codex-home');
    process.env.HOME = path.join(testDir, 'home');
    process.env.USERPROFILE = path.join(testDir, 'home');
    process.env.XDG_CONFIG_HOME = path.join(testDir, 'xdg-config');
    await writeGlobalConfig({ profile: 'core', delivery: 'both' });
    confirmMock.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  /**
   * The contract: the plan lists exactly what a real update then changes.
   */
  async function expectPlanMatchesRealUpdate(): Promise<UpdatePlanChange[]> {
    const before = await snapshotTree(testDir);

    const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);

    // A dry run writes nothing.
    expect(await snapshotTree(testDir)).toEqual(before);

    await new UpdateCommand().execute(testDir);
    const after = await snapshotTree(testDir);

    expect(withoutTool(plan.changes)).toEqual(diffTrees(before, after, testDir));
    return plan.changes;
  }

  it('plans nothing for a fresh install', async () => {
    const changes = await expectPlanMatchesRealUpdate();
    expect(changes).toEqual([]);
  });

  it('plans an update for a skill file that drifted from the generated content', async () => {
    const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.writeFile(skillFile, 'hand-edited\n');

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes).toContainEqual({
      path: '.claude/skills/openspec-propose/SKILL.md',
      action: 'update',
      tool: 'claude',
    });
  });

  it('plans additions for newly selected workflows', async () => {
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: [...ALL_WORKFLOWS] });

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes).toContainEqual({
      path: '.claude/skills/openspec-verify-change/SKILL.md',
      action: 'add',
      tool: 'claude',
    });
    expect(changes.every((change) => change.tool === 'claude')).toBe(true);
  });

  it('plans deletions for deselected workflows', async () => {
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: ['propose'] });

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes).toContainEqual({
      path: '.claude/skills/openspec-archive-change/SKILL.md',
      action: 'delete',
      tool: 'claude',
    });
  });

  it('plans deletions for command files when delivery becomes skills-only', async () => {
    await writeGlobalConfig({ profile: 'core', delivery: 'skills' });

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes).toContainEqual({
      path: '.claude/commands/opsx/propose.md',
      action: 'delete',
      tool: 'claude',
    });
  });

  it('lists skills that live outside the project, under the user home', async () => {
    // A home of its own, outside the project, so the plan has to name the file
    // the way the user would recognize it.
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-dry-run-home-'));
    process.env.HOME = homeDir;
    process.env.USERPROFILE = homeDir;
    try {
      await new InitCommand({ tools: 'minimax-code', force: true }).execute(testDir);
      const skillFile = path.join(homeDir, '.minimax', 'skills', 'openspec-propose', 'SKILL.md');
      await fs.writeFile(skillFile, 'hand-edited\n');

      const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);

      expect(plan.changes).toContainEqual({
        path: '~/.minimax/skills/openspec-propose/SKILL.md',
        action: 'update',
        tool: 'minimax-code',
      });
      expect(await fs.readFile(skillFile, 'utf-8')).toBe('hand-edited\n');
    } finally {
      await fs.rm(homeDir, { recursive: true, force: true });
    }
  });

  it('says so when a real update would also sync Copilot cloud files', async () => {
    const setupSteps = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
    await fs.mkdir(path.dirname(setupSteps), { recursive: true });
    await fs.writeFile(setupSteps, 'generated by openspec\n');

    const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);

    expect(plan.notes).toContain(
      'A real update would also sync the GitHub Copilot cloud agent files; those changes are not listed here.'
    );
  });

  it('refuses to plan without dryRun', async () => {
    await expect(new UpdateCommand().plan(testDir)).rejects.toThrow('dryRun: true');
  });
});
