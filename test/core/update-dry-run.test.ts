import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { UpdateCommand } from '../../src/core/update.js';
import { InitCommand } from '../../src/core/init.js';
import { ALL_WORKFLOWS } from '../../src/core/profiles.js';
import { getGlobalConfigPath, type GlobalConfig } from '../../src/core/global-config.js';
import type { UpdatePlanChange } from '../../src/core/update-plan.js';
import {
  generateCopilotSetupSteps,
  persistCopilotCloudOptIn,
} from '../../src/core/github-copilot/cloud-agent.js';

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
  async function expectPlanMatchesRealUpdate(
    options: { force?: boolean } = {}
  ): Promise<UpdatePlanChange[]> {
    return (await expectFullPlanMatchesRealUpdate(options)).changes;
  }

  /**
   * The same contract, including failures: a tool the real update fails on is
   * one the plan reports in `failures`, and the files either side of the
   * failure are the ones the real update leaves.
   */
  async function expectFullPlanMatchesRealUpdate(options: { force?: boolean } = {}) {
    const before = await snapshotTree(testDir);

    const plan = await new UpdateCommand({ ...options, dryRun: true }).plan(testDir);

    // A dry run writes nothing.
    expect(await snapshotTree(testDir)).toEqual(before);

    let realError: Error | undefined;
    try {
      await new UpdateCommand(options).execute(testDir);
    } catch (error) {
      realError = error as Error;
    }
    const after = await snapshotTree(testDir);

    expect(withoutTool(plan.changes)).toEqual(diffTrees(before, after, testDir));
    const failedTools = realError?.message.match(/^OpenSpec update failed for: (.*)$/u)?.[1];
    expect(new Set(plan.failures.map((failure) => failure.tool)).size).toBe(
      failedTools ? failedTools.split(', ').length : 0
    );
    if (!failedTools && realError) throw realError;
    return plan;
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

  // #2092: CoStrict's skills move from .cospec/skills to .agents/skills while
  // its commands stay under .cospec; the plan must match that move exactly.
  it('plans the move of CoStrict skills out of .cospec, leaving its commands', async () => {
    await new InitCommand({ tools: 'costrict', force: true }).execute(testDir);
    const legacy = path.join(testDir, '.cospec', 'skills');
    await fs.mkdir(path.dirname(legacy), { recursive: true });
    await fs.cp(path.join(testDir, '.agents', 'skills'), legacy, { recursive: true });
    await fs.rm(path.join(testDir, '.agents'), { recursive: true, force: true });

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes.some((change) => change.path.startsWith('.cospec/skills/') && change.action === 'delete')).toBe(true);
    expect(changes.some((change) => change.path.startsWith('.agents/skills/') && change.action !== 'delete')).toBe(true);
    expect(changes.filter((change) => change.path.startsWith('.cospec/openspec/commands/') && change.action === 'delete')).toEqual([]);
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

  it('plans the Copilot cloud file a real update refreshes', async () => {
    // A project from before the cloud-file opt-in: the managed setup-steps file
    // is present in its old form, and update keeps it current.
    await new InitCommand({ tools: 'github-copilot', force: true }).execute(testDir);
    const setupSteps = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
    await fs.mkdir(path.dirname(setupSteps), { recursive: true });
    await fs.writeFile(
      setupSteps,
      generateCopilotSetupSteps().replace(
        /^# Generated by OpenSpec for GitHub Copilot coding agent support\.\n\n/u,
        ''
      )
    );

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.github/workflows/copilot-setup-steps.yml',
      action: 'update',
      tool: 'github-copilot',
    });
  });

  it('plans the Copilot cloud files an opt-out removes', async () => {
    await new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true }).execute(
      testDir
    );
    await persistCopilotCloudOptIn(testDir, false);

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.github/agents/openspec.agent.md',
      action: 'delete',
      tool: 'github-copilot',
    });
  });

  it('plans the Copilot cloud files left behind once Copilot is no longer configured', async () => {
    await new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true }).execute(
      testDir
    );
    await fs.rm(path.join(testDir, '.github', 'skills'), { recursive: true, force: true });
    await fs.rm(path.join(testDir, '.github', 'prompts'), { recursive: true, force: true });

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes).toContainEqual({
      path: '.github/workflows/copilot-setup-steps.yml',
      action: 'delete',
      tool: 'github-copilot',
    });
  });

  it('plans a forced upgrade of tools found only in legacy artifacts, and their cleanup', async () => {
    // Cursor is not configured; only its pre-opsx command remains. A forced
    // update sets Cursor up and removes the legacy files. The plan has to list
    // both, from the same code path.
    const legacyBlock = '<!-- OPENSPEC:START -->\nold instructions\n<!-- OPENSPEC:END -->\n';
    await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
      legacyBlock
    );
    await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `# Project\n\n${legacyBlock}`);
    await fs.writeFile(path.join(testDir, 'openspec', 'AGENTS.md'), 'legacy agents\n');

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.cursor/skills/openspec-propose/SKILL.md',
      action: 'add',
      tool: 'cursor',
    });
    expect(changes).toContainEqual({
      path: '.cursor/commands/openspec-proposal.md',
      action: 'delete',
      tool: 'openspec',
    });
    expect(changes).toContainEqual({ path: 'CLAUDE.md', action: 'update', tool: 'openspec' });
    expect(changes).toContainEqual({
      path: 'openspec/AGENTS.md',
      action: 'delete',
      tool: 'openspec',
    });
  });

  it('plans legacy Antigravity and Codex sharing one root, arbitrated as a real update does', async () => {
    // Both legacy tools want .agents/skills. The real update picks one owner
    // and records it; every later step reads that choice. So does the plan.
    const antigravityLegacy = path.join(testDir, '.agent', 'workflows', 'openspec-propose.md');
    const codexLegacy = path.join(testDir, '.codex', 'prompts', 'openspec-propose.md');
    await fs.mkdir(path.dirname(antigravityLegacy), { recursive: true });
    await fs.mkdir(path.dirname(codexLegacy), { recursive: true });
    await fs.writeFile(antigravityLegacy, 'legacy Antigravity command');
    await fs.writeFile(codexLegacy, 'legacy Codex prompt');

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.agents/skills/.openspec-target',
      action: 'add',
      tool: 'codex',
    });
  });

  it('plans a forced cleanup of a configured tool\'s legacy commands without re-adding the tool', async () => {
    const legacyDir = path.join(testDir, '.claude', 'commands', 'openspec');
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(
      path.join(legacyDir, 'proposal.md'),
      '<!-- OPENSPEC:START -->\nold command\n<!-- OPENSPEC:END -->\n'
    );
    await fs.writeFile(path.join(legacyDir, 'notes.md'), 'mine\n');

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.claude/commands/openspec/proposal.md',
      action: 'delete',
      tool: 'openspec',
    });
    expect(changes.map((change) => change.path)).not.toContain('.claude/commands/openspec/notes.md');
  });

  it('plans Codex workflows inferred from legacy prompt names in a forced upgrade', async () => {
    await writeGlobalConfig({ profile: 'core', delivery: 'skills' });
    const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
    await fs.mkdir(promptDir, { recursive: true });
    await fs.writeFile(path.join(promptDir, 'opsx-archive.md'), 'legacy archive prompt');

    await expectPlanMatchesRealUpdate({ force: true });
  });

  it('plans the global Codex prompts a forced update retires once their skills exist', async () => {
    // The prompts are removed only after the replacement skills are written,
    // which in a dry run exist only in the plan.
    await writeGlobalConfig({ profile: 'core', delivery: 'skills' });
    const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
    await fs.mkdir(promptDir, { recursive: true });
    await fs.writeFile(path.join(promptDir, 'opsx-explore.md'), 'legacy explore prompt');
    await fs.writeFile(path.join(promptDir, 'personal-notes.md'), 'user');

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: 'codex-home/prompts/opsx-explore.md',
      action: 'delete',
      tool: 'openspec',
    });
    expect(changes.map((change) => change.path)).not.toContain('codex-home/prompts/personal-notes.md');
  });

  it('lists the shared-skills-root owner marker it would write', async () => {
    // Codex shares `.agents/skills` with Amp and Antigravity, so the update
    // writes an owner marker there. It goes through the same write seam, and a
    // preview that skipped it would under-report.
    await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
    await fs.rm(path.join(testDir, '.agents', 'skills', '.openspec-target'), { force: true });

    // Nothing has drifted, so force the refresh the marker is written during.
    const plan = await new UpdateCommand({ dryRun: true, force: true }).plan(testDir);

    expect(plan.changes).toContainEqual({
      path: '.agents/skills/.openspec-target',
      action: 'add',
      tool: 'codex',
    });
  });

  it('reports a symlinked skills directory as the one link that is removed', async () => {
    // `fs.rm` with `recursive` unlinks a symlinked directory and leaves the tree
    // it points at alone, so the plan must not promise the target's files.
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: ['propose'] });
    const skills = path.join(testDir, '.claude', 'skills');
    const real = path.join(testDir, 'elsewhere', 'openspec-archive-change');
    await fs.mkdir(real, { recursive: true });
    await fs.writeFile(path.join(real, 'SKILL.md'), 'kept\n');
    await fs.rm(path.join(skills, 'openspec-archive-change'), { recursive: true, force: true });
    // A junction needs no privilege on Windows, and Node reports it as a link.
    await fs.symlink(real, path.join(skills, 'openspec-archive-change'), 'junction');

    const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);

    expect(plan.changes).toContainEqual({
      path: '.claude/skills/openspec-archive-change',
      action: 'delete',
      tool: 'claude',
    });
    expect(plan.changes.map((change) => change.path)).not.toContain(
      'elsewhere/openspec-archive-change/SKILL.md'
    );
  });

  it('never prompts, and says the preview is partial, when legacy artifacts exist', async () => {
    // A pre-opsx Cursor command file (see LEGACY_SLASH_COMMAND_PATHS).
    await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
      'legacy command\n'
    );

    const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(plan.notes.map((note) => note.code)).toContain('legacy-artifacts');
  });

  it('matches a real non-interactive update that leaves legacy artifacts alone', async () => {
    await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
      'legacy command\n'
    );
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: ['propose'] });

    await expectPlanMatchesRealUpdate();
  });

  it('lists the global config the one-time profile migration writes', async () => {
    // A config written before profiles existed: workflows are installed, but no
    // `profile` is recorded, so a real update saves one.
    await writeGlobalConfig({} as GlobalConfig);

    const changes = await expectPlanMatchesRealUpdate();

    const configPath = path
      .relative(testDir, getGlobalConfigPath())
      .split(path.sep)
      .join('/');
    expect(changes).toContainEqual({ path: configPath, action: 'update', tool: 'openspec' });
  });

  it('plans the move out of a renamed tool directory, and what the moved tool then gets', async () => {
    // Kimi Code moved from .kimi to .kimi-code. A real update moves the files
    // first, which is what makes Kimi detected at all.
    await new InitCommand({ tools: 'kimi', force: true }).execute(testDir);
    await fs.rename(path.join(testDir, '.kimi-code'), path.join(testDir, '.kimi'));

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes).toContainEqual({
      path: '.kimi/skills/openspec-propose/SKILL.md',
      action: 'delete',
      tool: 'kimi',
    });
    expect(changes).toContainEqual({
      path: '.kimi-code/skills/openspec-propose/SKILL.md',
      action: 'add',
      tool: 'kimi',
    });
    expect(changes.map((change) => change.path)).not.toContain('.kimi/skills');
  });

  it('plans the move out of a renamed tool directory for a stale install', async () => {
    await new InitCommand({ tools: 'kimi', force: true }).execute(testDir);
    await fs.rename(path.join(testDir, '.kimi-code'), path.join(testDir, '.kimi'));
    const skill = path.join(testDir, '.kimi', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.writeFile(
      skill,
      (await fs.readFile(skill, 'utf-8')).replace(/generatedBy: .*/u, 'generatedBy: "0.0.1"')
    );
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: ['propose', 'apply'] });

    await expectPlanMatchesRealUpdate();
  });

  it('plans a consent-gated move as a non-interactive update makes it, and says so', async () => {
    // Windsurf became Devin Desktop. At a terminal the move is offered; without
    // one it is made, which is what the plan lists.
    await new InitCommand({ tools: 'devin', force: true }).execute(testDir);
    await fs.rename(path.join(testDir, '.devin'), path.join(testDir, '.windsurf'));

    const before = await snapshotTree(testDir);
    const plan = await new UpdateCommand({ dryRun: true }).plan(testDir);
    expect(plan.notes.map((note) => note.code)).toContain('legacy-tool-directories');
    await new UpdateCommand().execute(testDir);
    expect(withoutTool(plan.changes)).toEqual(
      diffTrees(before, await snapshotTree(testDir), testDir)
    );
    expect(plan.changes.some((change) => change.path.startsWith('.windsurf/'))).toBe(true);
  });

  it('plans a legacy-only install whose config predates profiles', async () => {
    // The real update moves Kimi's files first, then the profile migration
    // scans the moved tree. The plan has to scan the same tree.
    await new InitCommand({ tools: 'kimi', force: true }).execute(testDir);
    await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
    await fs.rename(path.join(testDir, '.kimi-code'), path.join(testDir, '.kimi'));
    await fs.rm(path.join(testDir, '.kimi', 'skills', 'openspec-explore'), {
      recursive: true,
      force: true,
    });
    await writeGlobalConfig({} as GlobalConfig);

    await expectPlanMatchesRealUpdate();
  });

  it('plans a moved skill that the profile then deselects as gone, not added', async () => {
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: [...ALL_WORKFLOWS] });
    await new InitCommand({ tools: 'kimi', force: true }).execute(testDir);
    await fs.rename(path.join(testDir, '.kimi-code'), path.join(testDir, '.kimi'));
    await writeGlobalConfig({ profile: 'custom', delivery: 'both', workflows: ['propose'] });

    const changes = await expectPlanMatchesRealUpdate();

    expect(changes.map((change) => change.path)).not.toContain(
      '.kimi-code/skills/openspec-verify-change/SKILL.md'
    );
  });

  it('plans the legacy copies an Antigravity after-generation move drops', async () => {
    await new InitCommand({ tools: 'antigravity', force: true }).execute(testDir);
    const current = path.join(testDir, '.agents', 'skills', 'openspec-propose', 'SKILL.md');
    const legacy = path.join(testDir, '.agent', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.mkdir(path.dirname(legacy), { recursive: true });
    await fs.copyFile(current, legacy);

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.agent/skills/openspec-propose/SKILL.md',
      action: 'delete',
      tool: 'antigravity',
    });
  });

  it('plans the legacy copies an after-generation move drops', async () => {
    // Codex reads the shared .agents root now. Once the current skills are
    // generated, an identical legacy .codex copy is redundant and removed; a
    // divergent one is kept and reported.
    await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
    const agents = path.join(testDir, '.agents', 'skills');
    const codex = path.join(testDir, '.codex', 'skills');
    await fs.mkdir(path.join(codex, 'openspec-propose'), { recursive: true });
    await fs.copyFile(
      path.join(agents, 'openspec-propose', 'SKILL.md'),
      path.join(codex, 'openspec-propose', 'SKILL.md')
    );
    await fs.mkdir(path.join(codex, 'openspec-explore'), { recursive: true });
    await fs.writeFile(path.join(codex, 'openspec-explore', 'SKILL.md'), 'customized\n');

    const changes = await expectPlanMatchesRealUpdate({ force: true });

    expect(changes).toContainEqual({
      path: '.codex/skills/openspec-propose/SKILL.md',
      action: 'delete',
      tool: 'codex',
    });
    expect(changes.map((change) => change.path)).not.toContain(
      '.codex/skills/openspec-explore/SKILL.md'
    );
  });

  it('stops planning a tool where the real write would fail, as the real update stops', async () => {
    // A directory where a SKILL.md belongs: the real write fails with EISDIR
    // and the tool's remaining files are never written. A plan that recorded
    // the write would list them.
    const blocked = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    await fs.rm(blocked);
    await fs.mkdir(blocked);
    await fs.writeFile(path.join(blocked, 'x'), 'x');

    const plan = await expectFullPlanMatchesRealUpdate({ force: true });

    expect(plan.failures).toEqual([
      { tool: 'claude', error: expect.stringContaining('EISDIR') },
    ]);
  });

  it('lists the files a legacy move leaves even when the moved tool then fails', async () => {
    // The move happens before generation, so its files land even though the
    // tool fails later. The destination is listed by the move itself.
    await new InitCommand({ tools: 'kimi', force: true }).execute(testDir);
    await fs.rename(path.join(testDir, '.kimi-code'), path.join(testDir, '.kimi'));
    const blocked = path.join(testDir, '.kimi', 'skills', 'openspec-explore', 'SKILL.md');
    await fs.rm(blocked);
    await fs.mkdir(blocked);
    await fs.writeFile(path.join(blocked, 'x'), 'x');

    const plan = await expectFullPlanMatchesRealUpdate();

    expect(plan.failures.map((failure) => failure.tool)).toEqual(['kimi']);
    expect(plan.changes).toContainEqual({
      path: '.kimi-code/skills/openspec-explore/SKILL.md/x',
      action: 'add',
      tool: 'kimi',
    });
  });

  it('reports a tool the forced legacy upgrade fails on, and still plans the rest', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
    await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
      '<!-- OPENSPEC:START -->\nold\n<!-- OPENSPEC:END -->\n'
    );
    // Cursor's skills root is a file, so setting Cursor up fails.
    await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });
    await fs.writeFile(path.join(testDir, '.cursor', 'skills'), 'not a directory');

    const plan = await expectFullPlanMatchesRealUpdate({ force: true });

    expect(plan.failures.map((failure) => failure.tool)).toEqual(['cursor']);
  });

  it('stops where a real update stops when a legacy upgrade fails in an unconfigured project', async () => {
    // No configured tools, so the real update runs the unconfigured-project
    // branch: it throws for the failed legacy upgrade before syncing Copilot
    // cloud files. The plan must stop there too, not plan their removal.
    await fs.rm(path.join(testDir, '.claude'), { recursive: true, force: true });
    await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
      '<!-- OPENSPEC:START -->\nold\n<!-- OPENSPEC:END -->\n'
    );
    await fs.writeFile(path.join(testDir, '.cursor', 'skills'), 'not a directory');
    const setupSteps = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
    await fs.mkdir(path.dirname(setupSteps), { recursive: true });
    await fs.writeFile(setupSteps, generateCopilotSetupSteps());

    const plan = await expectFullPlanMatchesRealUpdate({ force: true });

    expect(plan.failures.map((failure) => failure.tool)).toEqual(['cursor']);
    expect(plan.changes.map((change) => change.path)).not.toContain(
      '.github/workflows/copilot-setup-steps.yml'
    );
  });

  it('refuses to plan without dryRun', async () => {
    await expect(new UpdateCommand().plan(testDir)).rejects.toThrow('dryRun: true');
  });
});
