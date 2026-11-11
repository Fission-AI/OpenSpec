import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpdateCommand, scanInstalledWorkflows } from '../../src/core/update.js';
import { InitCommand } from '../../src/core/init.js';
import { getConfiguredToolsForProfileSync } from '../../src/core/profile-sync-drift.js';
import { ALL_WORKFLOWS } from '../../src/core/profiles.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { OPENSPEC_MARKERS } from '../../src/core/config.js';
import type { GlobalConfig } from '../../src/core/global-config.js';
import { generateCopilotSetupSteps, persistCopilotCloudOptIn } from '../../src/core/github-copilot/cloud-agent.js';
import { getCommandContents } from '../../src/core/shared/index.js';
import {
  CommandAdapterRegistry,
  generateCommands,
} from '../../src/core/command-generation/index.js';
import { releasedCodexPrompt } from '../helpers/released-codex-prompt.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const { confirmMock, searchableMultiSelectMock, interactiveState } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  searchableMultiSelectMock: vi.fn(),
  interactiveState: { value: false },
}));

vi.mock('@inquirer/prompts', () => ({ confirm: confirmMock }));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: searchableMultiSelectMock,
}));

vi.mock('../../src/utils/interactive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive.js')>();
  return { ...actual, isInteractive: () => interactiveState.value };
});

// Shared mutable mock config state
const mockState = {
  config: {
    featureFlags: {},
    profile: 'core' as const,
    delivery: 'both' as const,
  } as GlobalConfig,
};

// Mock global config module to isolate tests from the machine's actual config
vi.mock('../../src/core/global-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/global-config.js')>();

  return {
    ...actual,
    getGlobalConfig: () => ({ ...mockState.config }),
    saveGlobalConfig: vi.fn(),
  };
});

// Helper to set mock config for tests
function setMockConfig(config: GlobalConfig) {
  mockState.config = config;
}

function resetMockConfig() {
  mockState.config = { featureFlags: {}, profile: 'core', delivery: 'both' };
}

const RELEASED_SKILLS_DIR = path.join(__dirname, '..', 'fixtures', 'released-output', 'v1.16.0-claude-skills');

/**
 * A skill exactly as release 1.16.0 wrote it, in a tool's own skills folder:
 * the state of a project from before 2.0, which update recognizes as its own.
 */
async function writeReleasedSkill(skillsDir: string, name: string): Promise<string> {
  const target = path.join(skillsDir, name, 'SKILL.md');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(RELEASED_SKILLS_DIR, name, 'SKILL.md'), target);
  return target;
}

/**
 * Writes the command file OpenSpec itself would generate for `workflow`.
 * Fixtures that stand in a placeholder no longer exercise cleanup, because
 * cleanup now only deletes files whose content matches generated output.
 * A command's cross-references depend on which workflows were installed
 * beside it, so a fixture with several commands passes that whole set.
 */
async function writeGeneratedCommand(
  projectDir: string,
  toolId: string,
  workflow: string,
  installed: readonly string[] = [workflow]
): Promise<string> {
  const adapter = CommandAdapterRegistry.get(toolId)!;
  const commandPath = adapter.getFilePath(workflow);
  const generated = generateCommands(getCommandContents(installed), adapter)
    .find((command) => command.path === commandPath)!;
  const full = path.join(projectDir, generated.path);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, generated.fileContent);
  return full;
}

async function markCodexTarget(skillsDir: string): Promise<void> {
  await fs.mkdir(skillsDir, { recursive: true });
  await fs.writeFile(path.join(skillsDir, '.openspec-target'), 'codex\n');
}

async function createLegacyCodexPrompt(): Promise<string> {
  const prompt = path.join(process.env.CODEX_HOME!, 'prompts', 'opsx-explore.md');
  await fs.mkdir(path.dirname(prompt), { recursive: true });
  await fs.writeFile(prompt, releasedCodexPrompt('opsx-explore.md'));
  return prompt;
}

function failCodexSkillWrites(): void {
  const originalWriteFile = FileSystemUtils.writeFile.bind(FileSystemUtils);
  vi.spyOn(FileSystemUtils, 'writeFile').mockImplementation(async (filePath, content) => {
    if (filePath.includes(`${path.sep}.agents${path.sep}`) && filePath.endsWith('SKILL.md')) {
      throw new Error('EACCES: permission denied');
    }
    return originalWriteFile(filePath, content);
  });
}

describe('UpdateCommand', () => {
  let testDir: string;
  let updateCommand: UpdateCommand;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    // Create a temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-'));
    process.env.CODEX_HOME = path.join(testDir, 'codex-home');
    process.env.HOME = path.join(testDir, 'home');
    process.env.USERPROFILE = path.join(testDir, 'home');

    // Create openspec directory
    const openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });

    updateCommand = new UpdateCommand();

    // Reset mock config to defaults
    resetMockConfig();
    interactiveState.value = false;
    confirmMock.mockReset();
    searchableMultiSelectMock.mockReset();

    // Clear all mocks before each test
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    process.env = originalEnv;
    // Restore all mocks after each test
    vi.restoreAllMocks();

    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('basic validation', () => {
    it('should throw error if openspec directory does not exist', async () => {
      // Remove openspec directory
      await fs.rm(path.join(testDir, 'openspec'), {
        recursive: true,
        force: true,
      });

      await expect(updateCommand.execute(testDir)).rejects.toThrow(
        "No OpenSpec directory found. Run 'openspec init' first."
      );
    });

    it('should report no configured tools when none exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No configured tools found')
      );

      consoleSpy.mockRestore();
    });

    it('should remove generated Copilot cloud files when no tools are configured', async () => {
      const initCommand = new InitCommand({
        tools: 'github-copilot',
        force: true,
        copilotCloud: true,
      });
      await initCommand.execute(testDir);
      await fs.rm(path.join(testDir, '.github', 'skills'), { recursive: true, force: true });
      await fs.rm(path.join(testDir, '.github', 'prompts'), { recursive: true, force: true });
      // Copilot's skills are the shared copy: removing it unconfigures Copilot.
      await fs.rm(path.join(testDir, '.agents'), { recursive: true, force: true });

      await updateCommand.execute(testDir);

      await expect(fs.stat(path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml')))
        .rejects.toMatchObject({ code: 'ENOENT' });
      await expect(fs.stat(path.join(testDir, '.github', 'agents', 'openspec.agent.md')))
        .rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  describe('skill updates', () => {
    it('keeps openspec-* skills the user already had in .agents/skills before OpenSpec used it', async () => {
      // A Claude install from before 2.0 never wrote to .agents. A skill there
      // (from npx skills, or written by hand) is the user's, even named openspec-*.
      await writeReleasedSkill(path.join(testDir, '.claude', 'skills'), 'openspec-explore');
      const sharedDir = path.join(testDir, '.agents', 'skills');
      const userSkill = path.join(sharedDir, 'openspec-propose', 'SKILL.md');
      await fs.mkdir(path.dirname(userSkill), { recursive: true });
      await fs.writeFile(userSkill, 'my propose');
      await fs.writeFile(path.join(sharedDir, 'openspec-propose', 'ref.md'), 'my notes');
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(userSkill, 'utf-8')).toBe('my propose');
      expect(await fs.readFile(path.join(sharedDir, 'openspec-propose', 'ref.md'), 'utf-8')).toBe('my notes');
      expect(await fs.readFile(path.join(sharedDir, '.openspec-target'), 'utf-8')).toBe('claude own-files\nkeep openspec-propose\n');
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) =>
        entry.includes('Kept 1 skill in .agents/skills as your own') && entry.includes('.agents/skills/openspec-propose')
      )).toBe(true);
      // OpenSpec's other skills are written as usual.
      expect(await fs.readFile(path.join(sharedDir, 'openspec-explore', 'SKILL.md'), 'utf-8')).toContain('name: openspec-explore');

      // Later runs keep leaving it alone, and settle.
      consoleSpy.mockClear();
      await updateCommand.execute(testDir);
      expect(await fs.readFile(userSkill, 'utf-8')).toBe('my propose');
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('up to date'))).toBe(true);
    });

    it('never removes an openspec-* skill the user had in .agents/skills, even under commands-only delivery', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      await writeReleasedSkill(path.join(testDir, '.claude', 'skills'), 'openspec-explore');
      const userDir = path.join(testDir, '.agents', 'skills', 'openspec-explore');
      await fs.mkdir(userDir, { recursive: true });
      await fs.writeFile(path.join(userDir, 'SKILL.md'), 'mine');
      await fs.writeFile(path.join(userDir, 'ref.md'), 'ref');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(path.join(userDir, 'SKILL.md'), 'utf-8')).toBe('mine');
      expect(await fs.readFile(path.join(userDir, 'ref.md'), 'utf-8')).toBe('ref');
      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('up to date'))).toBe(true);
    });

    it('keeps a tool with no folder of its own set up when delivery is later set to both', async () => {
      // Cursor reads the shared copy and gets no commands, so it has no folder
      // of its own; a delivery change must not take it for a deleted tool.
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'skills' });
      await new InitCommand({ tools: 'cursor', force: true }).execute(testDir);
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.cursor'))).toBe(false);

      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });
      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.cursor'))).toBe(false);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-propose', 'SKILL.md')
      )).toBe(true);
      expect(getConfiguredToolsForProfileSync(testDir)).toEqual(['cursor']);
    });

    it('drops a tool whose own folder the user deleted, instead of putting it back', async () => {
      // Kiro's links live in .kiro; Cursor has no folder of its own, so it stays.
      await new InitCommand({ tools: 'claude,kiro,cursor', force: true }).execute(testDir);
      await fs.rm(path.join(testDir, '.kiro'), { recursive: true, force: true });

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.kiro'))).toBe(false);
      expect(getConfiguredToolsForProfileSync(testDir)).toEqual(['claude', 'cursor']);
    });

    it('turns plain copies made where links could not be back into links after a profile change', async () => {
      // On Windows without link rights, each link is a plain copy of the
      // shared skill. A profile change rewrites the shared text; the copies
      // are still OpenSpec's, not "your own changes".
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
      const skillsDir = path.join(testDir, '.claude', 'skills');
      for (const name of await fs.readdir(skillsDir)) {
        await fs.rm(path.join(skillsDir, name));
        await fs.cp(path.join(testDir, '.agents', 'skills', name), path.join(skillsDir, name), { recursive: true });
      }
      setMockConfig({
        featureFlags: {}, profile: 'custom', delivery: 'both',
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'new', 'verify'],
      });
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('Kept'))).toBe(false);
      for (const name of await fs.readdir(skillsDir)) {
        expect(await fs.readFile(path.join(skillsDir, name, 'SKILL.md'), 'utf-8'), name).toBe(
          await fs.readFile(path.join(testDir, '.agents', 'skills', name, 'SKILL.md'), 'utf-8')
        );
      }
    });

    it('keeps a skill the user edited in a linked tool folder, reports it, and settles', async () => {
      // A Claude install from before 2.0 where the user changed one skill.
      const skillsDir = path.join(testDir, '.claude', 'skills');
      const edited = await writeReleasedSkill(skillsDir, 'openspec-explore');
      await fs.appendFile(edited, '\nAlways use pnpm.\n');
      await writeReleasedSkill(skillsDir, 'openspec-propose');
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // The edit stays as it was, with no link in its place; the untouched
      // skill became a link to the shared copy.
      expect((await fs.lstat(path.join(skillsDir, 'openspec-explore'))).isSymbolicLink()).toBe(false);
      expect(await fs.readFile(edited, 'utf-8')).toContain('Always use pnpm.');
      expect((await fs.lstat(path.join(skillsDir, 'openspec-propose'))).isSymbolicLink()).toBe(true);
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) =>
        entry.includes('Kept 1 skill folder') && entry.includes('.claude/skills/openspec-explore')
      )).toBe(true);

      // Keeping it does not make every later update think there is work.
      consoleSpy.mockClear();
      await updateCommand.execute(testDir);
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('up to date'))).toBe(true);
    });

    it('should update skill files for configured Claude tool', async () => {
      // A Claude install from before 2.0: its own copy of the skill.
      const skillsDir = path.join(testDir, '.claude', 'skills');
      const exploreSkillDir = path.join(skillsDir, 'openspec-explore');
      const oldSkill = await writeReleasedSkill(skillsDir, 'openspec-explore');
      const oldContent = await fs.readFile(oldSkill, 'utf-8');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // The old copy is now a link to the one shared copy, which is current.
      expect((await fs.lstat(exploreSkillDir)).isSymbolicLink()).toBe(true);
      const updatedSkill = await fs.readFile(
        path.join(exploreSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(updatedSkill).toBe(
        await fs.readFile(path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8')
      );
      expect(updatedSkill).not.toBe(oldContent);
      expect(updatedSkill).toContain('name: openspec-explore');
      expect(updatedSkill).toContain('license: MIT');

      // Check console output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 1 tool(s): claude')
      );

      consoleSpy.mockRestore();
    });

    it('should refresh configured DeepSeek Harness skills and stay idempotent', async () => {
      // A DeepSeek Harness install from before 2.0, in its own folder. It
      // reads .agents/skills, so the old copy goes and the shared one stays.
      const oldSkill = await writeReleasedSkill(path.join(testDir, '.dsh', 'skills'), 'openspec-explore');
      const skillFile = path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(oldSkill)).toBe(false);
      const refreshed = await fs.readFile(skillFile, 'utf-8');
      expect(refreshed).toContain('name: openspec-explore');
      expect(refreshed).toContain('license: MIT');

      const beforeSecondUpdate = await fs.stat(skillFile);
      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      expect(consoleSpy.mock.calls.flat().map(String).join('\n')).toContain('up to date');
      consoleSpy.mockRestore();

      expect(await fs.readFile(skillFile, 'utf-8')).toBe(refreshed);
      expect((await fs.stat(skillFile)).mtimeMs).toBe(beforeSecondUpdate.mtimeMs);
    });

    it.each(['profile', 'delivery'] as const)(
      'should preserve custom DeepSeek Harness and shared skills when changing %s',
      async (setting) => {
        const customFiles = [
          path.join(testDir, '.dsh', 'skills', 'my-custom-skill', 'SKILL.md'),
          path.join(testDir, '.dsh', 'skills', 'openspec-user-notes', 'SKILL.md'),
          path.join(testDir, '.agents', 'skills', 'shared-custom-skill', 'SKILL.md'),
        ];
        for (const file of customFiles) {
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, 'custom skill instructions');
        }

        await new InitCommand({ tools: 'dsh', force: true }).execute(testDir);
        const skillsDir = path.join(testDir, '.dsh', 'skills');
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md')
        )).toBe(true);

        setMockConfig(setting === 'profile'
          ? { featureFlags: {}, profile: 'custom', workflows: ['explore'], delivery: 'both' }
          : { featureFlags: {}, profile: 'core', delivery: 'commands' });

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await updateCommand.execute(testDir);

        // The user's skills stay in .dsh; OpenSpec's are the shared copy. A
        // delivery change changes nothing: every tool gets skills.
        const expectedSkills = ['my-custom-skill', 'openspec-user-notes'];
        const expectedShared = ['shared-custom-skill', '.openspec-target'];
        if (setting === 'profile') {
          expectedShared.push('openspec-explore');
        } else {
          expectedShared.push(
            'openspec-apply-change',
            'openspec-archive-change',
            'openspec-explore',
            'openspec-propose',
            'openspec-sync-specs',
            'openspec-update-change'
          );
          expect(consoleSpy.mock.calls.flat().map(String)
            .some((entry) => entry.includes('No skills or commands remain'))).toBe(false);
        }
        expect((await fs.readdir(skillsDir)).sort()).toEqual(expectedSkills.sort());
        expect(await FileSystemUtils.directoryExists(path.join(testDir, '.dsh', 'commands'))).toBe(false);
        expect((await fs.readdir(path.join(testDir, '.agents', 'skills'))).sort()).toEqual(expectedShared.sort());

        consoleSpy.mockClear();
        await updateCommand.execute(testDir);
        expect(consoleSpy.mock.calls.flat().map(String).join('\n')).not.toContain('Updating 1 tool(s)');
        expect((await fs.readdir(skillsDir)).sort()).toEqual(expectedSkills.sort());
        for (const file of customFiles) {
          expect(await fs.readFile(file, 'utf-8')).toBe('custom skill instructions');
        }
      }
    );

    it('should update MiniMax Code skills without touching unrelated global skills', async () => {
      const skillsDir = path.join(testDir, 'home', '.minimax', 'skills');
      const exploreSkill = path.join(skillsDir, 'openspec-explore', 'SKILL.md');
      const customSkill = path.join(skillsDir, 'my-custom-skill', 'SKILL.md');
      await fs.mkdir(path.dirname(exploreSkill), { recursive: true });
      await fs.writeFile(exploreSkill, 'old content');
      await fs.mkdir(path.dirname(customSkill), { recursive: true });
      await fs.writeFile(customSkill, 'custom content');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(exploreSkill, 'utf-8')).toContain('name: openspec-explore');
      expect(await fs.readFile(customSkill, 'utf-8')).toBe('custom content');
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.minimax'))).toBe(false);
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.mavis'))).toBe(false);
    });

    it('should not update MiniMax skills through a linked directory outside the global skills root', async () => {
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-minimax-outside-'));
      const skillsRoot = path.join(testDir, 'home', '.minimax', 'skills');
      const linkedSkillDir = path.join(skillsRoot, 'openspec-explore');
      const skillFile = path.join(outsideDir, 'SKILL.md');
      const oldSkillContent = `---
name: openspec-explore
metadata:
  author: openspec
  version: "0.9"
---

Outside content
`;
      await fs.mkdir(skillsRoot, { recursive: true });
      await fs.writeFile(skillFile, oldSkillContent);

      try {
        await fs.symlink(
          outsideDir,
          linkedSkillDir,
          process.platform === 'win32' ? 'junction' : 'dir'
        );

        // A link the user made is theirs: kept, and nothing is written through it.

        await updateCommand.execute(testDir);

        expect(await fs.readFile(skillFile, 'utf-8')).toBe(oldSkillContent);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should not delete MiniMax skills through a linked directory outside the global skills root', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        workflows: ['propose'],
        delivery: 'skills',
      });
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-minimax-outside-'));
      const skillsRoot = path.join(testDir, 'home', '.minimax', 'skills');
      const linkedSkillDir = path.join(skillsRoot, 'openspec-explore');
      const skillFile = path.join(outsideDir, 'SKILL.md');
      const oldSkillContent = `---
name: openspec-explore
metadata:
  author: openspec
  version: "0.9"
---

Outside content
`;
      await fs.mkdir(skillsRoot, { recursive: true });
      await fs.writeFile(skillFile, oldSkillContent);

      try {
        await fs.symlink(
          outsideDir,
          linkedSkillDir,
          process.platform === 'win32' ? 'junction' : 'dir'
        );

        // A link the user made is theirs: kept, and nothing is written through it.

        await updateCommand.execute(testDir);

        expect(await fs.readFile(skillFile, 'utf-8')).toBe(oldSkillContent);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should not update generated artifacts through a linked tool directory outside the project', async () => {
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-update-outside-'));
      const skillFile = path.join(
        outsideDir,
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      const oldSkillContent = `---
name: openspec-explore
metadata:
  author: openspec
  version: "0.9"
---

Outside content
`;
      await fs.mkdir(path.dirname(skillFile), { recursive: true });
      await fs.writeFile(skillFile, oldSkillContent);

      try {
        await fs.symlink(
          outsideDir,
          path.join(testDir, '.claude'),
          process.platform === 'win32' ? 'junction' : 'dir'
        );

        await expect(updateCommand.execute(testDir)).rejects.toThrow(
          'OpenSpec update failed for: Claude Code'
        );

        expect(await fs.readFile(skillFile, 'utf-8')).toBe(oldSkillContent);
        expect(await fs.readdir(path.join(outsideDir, 'skills'))).toEqual([
          'openspec-explore',
        ]);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should not delete generated artifacts through a linked tool directory outside the project', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-update-outside-'));
      const skillFile = path.join(
        outsideDir,
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(skillFile), { recursive: true });
      await fs.writeFile(
        skillFile,
        `---
name: openspec-explore
metadata:
  author: openspec
  version: "0.9"
---
`
      );

      try {
        await fs.symlink(
          outsideDir,
          path.join(testDir, '.claude'),
          process.platform === 'win32' ? 'junction' : 'dir'
        );

        await expect(updateCommand.execute(testDir)).rejects.toThrow(
          'OpenSpec update failed for: Claude Code'
        );

        await expect(fs.stat(skillFile)).resolves.toBeDefined();
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should show the Hermes setup note when updating a configured Hermes tool', async () => {
      const exploreSkillDir = path.join(testDir, '.hermes', 'skills', 'openspec-explore');
      await fs.mkdir(exploreSkillDir, { recursive: true });
      await fs.writeFile(
        path.join(exploreSkillDir, 'SKILL.md'),
        `---\nname: openspec-explore\nmetadata:\n  author: openspec\n  version: "0.9"\n---\n\nOld instructions content\n`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(
        logCalls.some(
          (entry) => entry.includes('Setup required for Hermes Agent') && entry.includes('skills.external_dirs'),
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should show the Hermes setup note even when Hermes is already up to date', async () => {
      const initCommand = new InitCommand({ tools: 'hermes', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('up to date'))).toBe(true);
      expect(
        logCalls.some(
          (entry) => entry.includes('Setup required for Hermes Agent') && entry.includes('skills.external_dirs'),
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should migrate OpenSpec skills from legacy .kimi to .kimi-code, preserving user files', async () => {
      // Managed skill in the legacy Kimi CLI location
      const legacySkillDir = path.join(testDir, '.kimi', 'skills', 'openspec-explore');
      await writeReleasedSkill(path.dirname(legacySkillDir), 'openspec-explore');

      // User-owned files in the legacy location that must be preserved
      const userSkillDir = path.join(testDir, '.kimi', 'skills', 'my-custom-skill');
      await fs.mkdir(userSkillDir, { recursive: true });
      await fs.writeFile(path.join(userSkillDir, 'SKILL.md'), 'user skill');
      await fs.writeFile(path.join(testDir, '.kimi', 'config.toml'), 'user config');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // The managed skill moved to .kimi-code, where the one shared copy Kimi
      // Code reads then replaced it: it was untouched release output.
      await expect(
        fs.access(path.join(testDir, '.kimi-code', 'skills', 'openspec-explore'))
      ).rejects.toThrow();
      const sharedSkill = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(sharedSkill).toContain('name: openspec-explore');
      // Kimi Code has no command adapter: the shared copy names skills, never
      // /opsx:* commands that were not generated.
      expect(sharedSkill).not.toContain('/opsx:');
      expect(sharedSkill).not.toContain('/opsx-');
      expect(sharedSkill).toContain('`openspec-propose`');

      // Legacy managed skill is gone; user files stay where they were
      await expect(fs.access(legacySkillDir)).rejects.toThrow();
      expect(await fs.readFile(path.join(userSkillDir, 'SKILL.md'), 'utf-8')).toBe('user skill');
      expect(await fs.readFile(path.join(testDir, '.kimi', 'config.toml'), 'utf-8')).toBe('user config');

      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('.kimi → .kimi-code'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should remove the legacy .kimi directory entirely when it only held OpenSpec skills', async () => {
      const legacySkillDir = path.join(testDir, '.kimi', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkillDir, { recursive: true });
      await fs.writeFile(
        path.join(legacySkillDir, 'SKILL.md'),
        `---\nname: openspec-explore\nmetadata:\n  author: openspec\n  version: "0.9"\n---\n\nOld instructions content\n`
      );

      await updateCommand.execute(testDir);

      await expect(fs.access(path.join(testDir, '.kimi'))).rejects.toThrow();
      const migratedSkill = path.join(testDir, '.kimi-code', 'skills', 'openspec-explore', 'SKILL.md');
      await expect(fs.access(migratedSkill)).resolves.toBeUndefined();
    });

    it('should migrate legacy Codex skills after writing replacements and preserve user files', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      await fs.rename(path.join(testDir, '.agents'), path.join(testDir, '.codex'));
      await fs.rm(path.join(testDir, '.codex', 'skills', '.openspec-target'));

      const userSkill = path.join(testDir, '.codex', 'skills', 'my-custom-skill', 'SKILL.md');
      await fs.mkdir(path.dirname(userSkill), { recursive: true });
      await fs.writeFile(userSkill, 'user skill');
      await fs.writeFile(path.join(testDir, '.codex', 'config.toml'), 'user config');

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);

      const currentSkill = path.join(
        testDir,
        '.agents',
        'skills',
        'openspec-propose',
        'SKILL.md'
      );
      expect(await fs.readFile(currentSkill, 'utf-8')).toContain('`openspec-apply-change`');
      await expect(
        fs.access(path.join(testDir, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))
      ).rejects.toThrow();
      expect(await fs.readFile(userSkill, 'utf-8')).toBe('user skill');
      expect(await fs.readFile(path.join(testDir, '.codex', 'config.toml'), 'utf-8')).toBe(
        'user config'
      );
      expect(
        consoleSpy.mock.calls.flat().map(String).some((entry) =>
          entry.includes('.codex → .agents')
        )
      ).toBe(true);
    });

    it('should retry interrupted equivalent Codex cleanup without force', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      const canonicalSkills = path.join(testDir, '.agents', 'skills');
      const legacySkills = path.join(testDir, '.codex', 'skills');
      await fs.cp(canonicalSkills, legacySkills, { recursive: true });
      await fs.rm(path.join(legacySkills, '.openspec-target'));

      for (const entry of await fs.readdir(legacySkills, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('openspec-')) continue;
        const skillFile = path.join(legacySkills, entry.name, 'SKILL.md');
        const legacyContent = (await fs.readFile(skillFile, 'utf-8'))
          .replace(
            /\$openspec-([a-z0-9-]+) \(Codex\) or \/openspec-\1 \(other agents\)/g,
            '$openspec-$1'
          )
          .replace(/generatedBy:\s*"[^"]+"/, 'generatedBy: "0.1.0"')
          .replace(/\n/g, '\r\n');
        await fs.writeFile(skillFile, `\uFEFF${legacyContent}`);
      }

      await updateCommand.execute(testDir);

      await expect(
        fs.access(path.join(legacySkills, 'openspec-propose', 'SKILL.md'))
      ).rejects.toThrow();
      expect(await fs.readFile(
        path.join(canonicalSkills, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      )).toContain('`openspec-apply-change`');
    });

    it('should preserve and report a divergent legacy Codex skill', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      await fs.rename(path.join(testDir, '.agents'), path.join(testDir, '.codex'));
      await fs.rm(path.join(testDir, '.codex', 'skills', '.openspec-target'));
      const legacySkill = path.join(
        testDir,
        '.codex',
        'skills',
        'openspec-propose',
        'SKILL.md'
      );
      await fs.appendFile(legacySkill, '\nUser edit\n');

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);

      expect(await fs.readFile(legacySkill, 'utf-8')).toContain('User edit');
      expect(
        consoleSpy.mock.calls.flat().map(String).some((entry) =>
          entry.includes('Left 1 file in .codex/')
        )
      ).toBe(true);

      consoleSpy.mockClear();
      await updateCommand.execute(testDir);
      const secondRunLogs = consoleSpy.mock.calls.flat().map(String);
      expect(secondRunLogs.some((entry) => entry.includes('up to date'))).toBe(true);
      expect(secondRunLogs.some((entry) => entry.includes('Left 1 file in .codex/'))).toBe(false);
    });

    it('should not restore legacy Codex workflows excluded by the active profile', async () => {
      // (An edited copy of an excluded workflow is kept: see the sweep tests.)
      // A pre-2.0 Codex project: the core skills exactly as a release wrote
      // them, in Codex's former folder.
      for (const name of [
        'openspec-propose',
        'openspec-explore',
        'openspec-apply-change',
        'openspec-update-change',
        'openspec-sync-specs',
        'openspec-archive-change',
      ]) {
        await writeReleasedSkill(path.join(testDir, '.codex', 'skills'), name);
      }
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'skills',
        workflows: ['explore'],
      });

      await updateCommand.execute(testDir);

      expect(
        await FileSystemUtils.fileExists(
          path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md')
        )
      ).toBe(true);
      expect(
        await FileSystemUtils.fileExists(
          path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md')
        )
      ).toBe(false);
      // The old copy is untouched OpenSpec output of a workflow the profile
      // excludes: nothing will ever replace it, so it is removed, not restored.
      expect(
        await FileSystemUtils.fileExists(
          path.join(testDir, '.codex', 'skills', 'openspec-apply-change', 'SKILL.md')
        )
      ).toBe(false);

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      expect(
        consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('up to date'))
      ).toBe(true);
    });

    it('should refresh a listed Codex shared skill tree with the shared wording', async () => {
      await new InitCommand({ tools: 'codex,agents', force: true }).execute(testDir);
      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand({ force: true }).execute(testDir);

      const proposeSkill = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
      expect(
        consoleSpy.mock.calls.flat().map(String).some((entry) =>
          entry.includes('Force updating 2 tool(s): codex, agents')
        )
      ).toBe(true);
    });

    it('should refresh a shared skill tree listed for Amp', async () => {
      await new InitCommand({ tools: 'amp', force: true }).execute(testDir);
      const skillsDir = path.join(testDir, '.agents', 'skills');
      const skillFile = path.join(skillsDir, 'openspec-propose', 'SKILL.md');
      await fs.writeFile(skillFile, 'stale Amp skill');

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('amp\n');
      const updated = await fs.readFile(skillFile, 'utf-8');
      expect(updated).toContain('name: openspec-propose');
      expect(updated).toContain('`openspec-apply-change`');
      expect(updated).not.toContain('stale Amp skill');
    });

    it('should refresh Antigravity workflows beside Codex in the one shared skills folder', async () => {
      await new InitCommand({ tools: 'antigravity,codex', force: true }).execute(testDir);

      await new UpdateCommand({ force: true }).execute(testDir);

      // Antigravity gets no workflows any more, so it has no files of its own.
      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('antigravity\ncodex\n');
      const proposeSkill = await fs.readFile(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.agents', 'workflows'))).toBe(false);
      expect(getConfiguredToolsForProfileSync(testDir)).toEqual([
        'antigravity',
        'codex',
      ]);
    });

    it('should upgrade legacy Antigravity workflows beside Codex in the shared skills folder', async () => {
      await new InitCommand({ tools: 'antigravity', force: true }).execute(testDir);
      // A workflow 1.x generated, in the legacy .agent folder.
      const generated = await writeGeneratedCommand(testDir, 'antigravity', 'propose');
      const legacyWorkflow = path.join(testDir, '.agent', 'workflows', 'opsx-propose.md');
      await fs.mkdir(path.dirname(legacyWorkflow), { recursive: true });
      await fs.rename(generated, legacyWorkflow);
      await fs.rm(path.join(testDir, '.agents', 'workflows'), { recursive: true });
      await fs.cp(
        path.join(testDir, '.agents', 'skills'),
        path.join(testDir, '.agent', 'skills'),
        { recursive: true }
      );
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);

      await new UpdateCommand().execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('antigravity\ncodex\n');
      expect(
        await fs.readFile(path.join(skillsDir, 'openspec-propose', 'SKILL.md'), 'utf-8')
      ).toContain('`openspec-apply-change`');
      // No workflow is generated in the current folder, and the legacy skills
      // moved over.
      await expect(
        fs.access(path.join(testDir, '.agents', 'workflows', 'opsx-propose.md'))
      ).rejects.toThrow();
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agent', 'skills', 'openspec-propose', 'SKILL.md')
      )).toBe(false);
    });

    it('should keep both the agents target and Codex, and the user edit in .codex', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      await fs.rename(path.join(testDir, '.agents'), path.join(testDir, '.codex'));
      await fs.rm(path.join(testDir, '.codex', 'skills', '.openspec-target'));
      await fs.appendFile(
        path.join(testDir, '.codex', 'skills', 'openspec-propose', 'SKILL.md'),
        '\nUser edit\n'
      );
      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);

      await updateCommand.execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('agents\ncodex\n');
      expect(
        await fs.readFile(path.join(skillsDir, 'openspec-propose', 'SKILL.md'), 'utf-8')
      ).toContain('`openspec-apply-change`');
      expect(
        await fs.readFile(
          path.join(testDir, '.codex', 'skills', 'openspec-propose', 'SKILL.md'),
          'utf-8'
        )
      ).toContain('User edit');
    });

    it('sets Codex up beside the agents target from a global prompt under --force, keeping one neutral copy', async () => {
      // There is no owner to take over any more: a forced update sets Codex up
      // from its leftover global prompt, as before, beside the agents target.
      // Both read the one shared copy, which names skills plainly.
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'skills' });
      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);
      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const globalPrompt = path.join(promptDir, 'opsx-explore.md');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(globalPrompt, releasedCodexPrompt('opsx-explore.md'));

      await new UpdateCommand({ force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('agents\ncodex\n');
      const propose = await fs.readFile(path.join(skillsDir, 'openspec-propose', 'SKILL.md'), 'utf-8');
      expect(propose).not.toMatch(/\$openspec-|\/openspec-/);
      expect(propose).toContain('`openspec-');
      const configured = getConfiguredToolsForProfileSync(testDir);
      expect(configured).toEqual(expect.arrayContaining(['agents', 'codex']));
      // Its replacement skill exists, so the forced update retires the prompt.
      expect(await FileSystemUtils.fileExists(globalPrompt)).toBe(false);
    });

    it('sets a first-time legacy Codex upgrade up in the shared folder', async () => {
      // Inverse of the hijack guard: with no `.agents` tree yet, nothing is
      // owned, so the real update path must still generate Codex skills and
      // stamp the `codex` marker — proving the guard is not over-broad.
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'skills' });
      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(path.join(promptDir, 'opsx-explore.md'), releasedCodexPrompt('opsx-explore.md'));

      await new UpdateCommand({ force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      // Codex is listed as set up here.
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('codex\n');
      // A single opsx-explore prompt infers only the `explore` workflow; the
      // shared copy names skills plainly, which Codex reads like every tool.
      const explore = await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(explore).toContain('name: openspec-explore');
      expect(explore).not.toContain('$openspec-');
      // Codex is now recorded as configured (mirrors the negative check above).
      expect(getConfiguredToolsForProfileSync(testDir)).toContain('codex');
    });

    it('sets Codex up from repo-local legacy prompts beside the agents target, then cleans them up', async () => {
      // Nothing is skipped any more: Codex joins the agents target in the one
      // shared folder, so its repo-local legacy prompt has its replacement and
      // a forced update removes it.
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'skills' });
      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);
      const legacyPrompts = path.join(testDir, '.codex', 'prompts');
      await fs.mkdir(legacyPrompts, { recursive: true });
      await fs.writeFile(path.join(legacyPrompts, 'openspec-explore.md'), 'legacy repo-local prompt');

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(
        await fs.readFile(path.join(testDir, '.agents', 'skills', '.openspec-target'), 'utf-8')
      ).toBe('agents\ncodex\n');
      expect(await FileSystemUtils.fileExists(path.join(legacyPrompts, 'openspec-explore.md'))).toBe(false);
    });

    it('should add an explicit Codex init beside the agents target', async () => {
      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);

      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('agents\ncodex\n');
      const proposeSkill = await fs.readFile(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
    });

    it('should consolidate an existing unmarked agents tree with legacy Codex skills', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      await fs.rename(path.join(testDir, '.agents'), path.join(testDir, '.codex'));
      await fs.rm(path.join(testDir, '.codex', 'skills', '.openspec-target'));
      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);
      await fs.rm(path.join(testDir, '.agents', 'skills', '.openspec-target'));
      const legacyPropose = path.join(
        testDir,
        '.codex',
        'skills',
        'openspec-propose',
        'SKILL.md'
      );
      await fs.writeFile(
        legacyPropose,
        (await fs.readFile(legacyPropose, 'utf-8')).replace(
          /generatedBy:\s*"[^"]+"/,
          'generatedBy: "0.1.0"'
        )
      );

      await new UpdateCommand({ force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('codex\n');
      const proposeSkill = await fs.readFile(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
      await expect(
        fs.access(path.join(testDir, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))
      ).rejects.toThrow();
    });

    it('should infer an unmarked canonical Codex tree that was moved manually', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      const skillsDir = path.join(testDir, '.agents', 'skills');
      await fs.rm(path.join(skillsDir, '.openspec-target'));
      // A tree from before 2.0, exactly as 1.9.0 wrote it in Codex's own
      // `$openspec-` wording.
      await fs.copyFile(
        path.join(__dirname, '..', 'fixtures', 'released-output', 'v1.9.0-codex-agents-skills', 'openspec-propose', 'SKILL.md'),
        path.join(skillsDir, 'openspec-propose', 'SKILL.md')
      );

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('codex\n');
      const proposeSkill = await fs.readFile(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
    });

    it('keeps the shared skills Codex still needs when the agents target switches to commands-only', async () => {
      // Codex invokes skills directly, so it needs them under every delivery.
      // The one shared copy stays for it; both tools stay listed.
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('agents\ncodex\n');
      await expect(
        fs.access(path.join(skillsDir, 'openspec-propose', 'SKILL.md'))
      ).resolves.toBeUndefined();
    });

    it('should not pull divergent legacy Codex skills into the shared copy after a switch to commands-only', async () => {
      await new InitCommand({ tools: 'agents', force: true }).execute(testDir);
      const canonicalSkills = path.join(testDir, '.agents', 'skills');
      const legacySkills = path.join(testDir, '.codex', 'skills');
      await fs.cp(canonicalSkills, legacySkills, { recursive: true });
      await fs.writeFile(
        path.join(legacySkills, 'openspec-propose', 'SKILL.md'),
        'divergent legacy Codex skill\n'
      );
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      await updateCommand.execute(testDir);
      await updateCommand.execute(testDir);

      // Codex is set up (from its old .codex skills) and invokes skills
      // directly, so the shared copy stays for it, written from the templates:
      // the divergent copy is never pulled into it.
      expect(await fs.readFile(path.join(canonicalSkills, '.openspec-target'), 'utf-8')).toBe('agents\ncodex\n');
      const shared = await fs.readFile(path.join(canonicalSkills, 'openspec-propose', 'SKILL.md'), 'utf-8');
      expect(shared).toContain('name: openspec-propose');
      expect(shared).not.toContain('divergent legacy Codex skill');
      expect(
        await fs.readFile(path.join(legacySkills, 'openspec-propose', 'SKILL.md'), 'utf-8')
      ).toBe('divergent legacy Codex skill\n');
    });

    it('should migrate legacy Codex skills under commands-only delivery', async () => {
      await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
      await fs.rename(path.join(testDir, '.agents'), path.join(testDir, '.codex'));
      await fs.rm(path.join(testDir, '.codex', 'skills', '.openspec-target'));
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      await updateCommand.execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('codex\n');
      const proposeSkill = await fs.readFile(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
      await expect(
        fs.access(path.join(testDir, '.codex', 'skills', 'openspec-propose', 'SKILL.md'))
      ).rejects.toThrow();
    });

    it('should not migrate legacy Codex skills through a symlink outside the project', async () => {
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-codex-outside-'));
      try {
        await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
        const outsideSkill = path.join(
          outsideDir,
          'skills',
          'openspec-propose',
          'SKILL.md'
        );
        await fs.mkdir(path.dirname(outsideSkill), { recursive: true });
        await fs.copyFile(
          path.join(testDir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'),
          outsideSkill
        );
        await fs.symlink(
          outsideDir,
          path.join(testDir, '.codex'),
          process.platform === 'win32' ? 'junction' : 'dir'
        );
        const warningSpy = vi.spyOn(console, 'warn');

        await new UpdateCommand({ force: true }).execute(testDir);

        await expect(fs.readFile(outsideSkill, 'utf-8')).resolves.toContain(
          'name: openspec-propose'
        );
        expect(
          warningSpy.mock.calls.flat().map(String).some((entry) =>
            entry.includes('resolves outside this project')
          )
        ).toBe(true);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should not migrate a nested legacy Codex skill symlink outside the project', async () => {
      const outsideDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'openspec-codex-skill-outside-')
      );
      try {
        await new InitCommand({ tools: 'codex', force: true }).execute(testDir);
        const outsideSkill = path.join(outsideDir, 'SKILL.md');
        await fs.copyFile(
          path.join(testDir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'),
          outsideSkill
        );
        const legacySkillsDir = path.join(testDir, '.codex', 'skills');
        await fs.mkdir(legacySkillsDir, { recursive: true });
        await fs.symlink(
          outsideDir,
          path.join(legacySkillsDir, 'openspec-propose'),
          process.platform === 'win32' ? 'junction' : 'dir'
        );
        const warningSpy = vi.spyOn(console, 'warn');

        await new UpdateCommand({ force: true }).execute(testDir);

        await expect(fs.readFile(outsideSkill, 'utf-8')).resolves.toContain(
          'name: openspec-propose'
        );
        expect(
          warningSpy.mock.calls.flat().map(String).some((entry) =>
            entry.includes('resolves outside this project')
          )
        ).toBe(true);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should update core profile skill files when tool is configured', async () => {
      // Set up a configured tool with one skill directory
      const skillsDir = path.join(testDir, '.claude', 'skills');

      // Create at least one skill to mark tool as configured
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      await updateCommand.execute(testDir);

      // Verify core profile skill files were created/updated (propose, explore, apply, update, sync, archive)
      const coreSkillNames = [
        'openspec-explore',
        'openspec-apply-change',
        'openspec-update-change',
        'openspec-sync-specs',
        'openspec-archive-change',
        'openspec-propose',
      ];

      for (const skillName of coreSkillNames) {
        const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
        const exists = await FileSystemUtils.fileExists(skillFile);
        expect(exists).toBe(true);

        const content = await fs.readFile(skillFile, 'utf-8');
        expect(content).toContain('---');
        expect(content).toContain('name:');
        expect(content).toContain('description:');
      }

      // Verify non-core skills are NOT created
      const nonCoreSkillNames = [
        'openspec-new-change',
        'openspec-continue-change',
        'openspec-ff-change',
        'openspec-bulk-archive-change',
        'openspec-verify-change',
      ];

      for (const skillName of nonCoreSkillNames) {
        const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
        const exists = await FileSystemUtils.fileExists(skillFile);
        expect(exists).toBe(false);
      }
    });

    it('should update skill files for configured shared agents target', async () => {
      const skillsDir = path.join(testDir, '.agents', 'skills');
      const proposeSkillDir = path.join(skillsDir, 'openspec-propose');
      await fs.mkdir(proposeSkillDir, { recursive: true });
      // A shared tree from before 2.0, exactly as 1.9.0 wrote it for the
      // agents target.
      const released = path.join(
        __dirname, '..', 'fixtures', 'released-output', 'v1.9.0-agents-skills', 'openspec-propose', 'SKILL.md'
      );
      await fs.copyFile(released, path.join(proposeSkillDir, 'SKILL.md'));

      await updateCommand.execute(testDir);

      const updatedSkill = await fs.readFile(
        path.join(proposeSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(updatedSkill).toContain('name: openspec-propose');
      expect(updatedSkill).not.toBe(await fs.readFile(released, 'utf-8'));
    });
  });

  describe('command file removal', () => {
    it('removes a generated Cursor command and heals stale colon references in its skill', async () => {
      // A project from 1.x: a generated command beside a skill that still
      // carries /opsx: references. 2.0 removes the command and rewrites the
      // skill to name skills.
      await new InitCommand({ tools: 'cursor', force: true }).execute(testDir);
      const commandFile = await writeGeneratedCommand(testDir, 'cursor', 'apply');
      // Cursor's skill is the one shared copy; a stale one carries /opsx:.
      const skillFile = path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md');
      await fs.appendFile(skillFile, '\nRun /opsx:apply next.\n');

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await FileSystemUtils.fileExists(commandFile)).toBe(false);
      const skill = await fs.readFile(skillFile, 'utf-8');
      // Positive assertion too: a skill that simply dropped every reference
      // would satisfy the negative one. The shared copy names skills.
      expect(skill).toContain('`openspec-');
      expect(skill).not.toMatch(/\/opsx[:-]/);
    });

    it('removes generated commands for Claude and Qwen in one run', async () => {
      await new InitCommand({ tools: 'claude,qwen', force: true }).execute(testDir);
      const claudeCommand = await writeGeneratedCommand(testDir, 'claude', 'apply');
      const qwenCommand = await writeGeneratedCommand(testDir, 'qwen', 'apply');
      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await FileSystemUtils.fileExists(claudeCommand)).toBe(false);
      expect(await FileSystemUtils.fileExists(qwenCommand)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed: 2 command files (OpenSpec 2.0 installs skills only)')
      );

      // Both read one shared skill, which names skills in neither command
      // spelling; Claude reaches it through its link.
      const sharedSkill = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md'),
        'utf-8'
      );
      expect(sharedSkill).toContain('`openspec-');
      expect(sharedSkill).not.toMatch(/\/opsx[:-]/);
      expect(
        await fs.readFile(path.join(testDir, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md'), 'utf-8')
      ).toBe(sharedSkill);
    });

    it('cleans up after Amazon Q, which is retired, keeping what the user edited', async () => {
      // A 1.x project set up for Amazon Q and Claude: Amazon Q's prompts and
      // skills, exactly as release 1.10.0 wrote them, one prompt edited.
      const fixtures = path.join(__dirname, '..', 'fixtures', 'released-output', 'v1.10.0-amazonq');
      const write = async (from: string, to: string, extra = '') => {
        const target = path.join(testDir, '.amazonq', to);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, (await fs.readFile(path.join(fixtures, from), 'utf-8')) + extra);
        return target;
      };
      const untouched = await write('prompts/opsx-explore.md', 'prompts/opsx-explore.md');
      const skill = await write('skills/openspec-explore/SKILL.md', 'skills/openspec-explore/SKILL.md');
      const edited = await write('prompts/opsx-apply.md', 'prompts/opsx-apply.md', '\nOur step.\n');
      const editedText = await fs.readFile(edited, 'utf-8');
      await writeReleasedSkill(path.join(testDir, '.claude', 'skills'), 'openspec-explore');
      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand().execute(testDir);

      expect(await FileSystemUtils.fileExists(untouched)).toBe(false);
      expect(await FileSystemUtils.fileExists(skill)).toBe(false);
      expect(await fs.readFile(edited, 'utf-8')).toBe(editedText);
      const logs = consoleSpy.mock.calls.flat().map(String);
      expect(logs.some((entry) => entry.includes('Amazon Q Developer is no longer supported'))).toBe(true);
      expect(logs.some((entry) => entry.includes(path.join('.amazonq', 'prompts', 'opsx-apply.md')))).toBe(true);
      // Claude is set up as usual, and Amazon Q is not listed.
      const list = await fs.readFile(path.join(testDir, '.agents', 'skills', '.openspec-target'), 'utf-8');
      expect(list).toContain('claude');
      expect(list).not.toContain('amazon-q');

      consoleSpy.mockClear();
      await new UpdateCommand().execute(testDir);
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('up to date'))).toBe(true);
    });

    it('should set up Claude skills and remove its generated commands', async () => {
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');
      const exploreCmd = await writeGeneratedCommand(testDir, 'claude', 'explore');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(exploreCmd)).toBe(false);
      expect(await fs.readFile(path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'utf-8'))
        .toContain('name: openspec-explore');
    });

    it('should remove ZCode commands under .zcode and keep its skills in the shared folder', async () => {
      // A ZCode install from before 2.0: its own copy of a skill, and a command.
      const skillsDir = path.join(testDir, '.zcode', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');
      const exploreCmd = await writeGeneratedCommand(testDir, 'zcode', 'explore');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(exploreCmd)).toBe(false);

      // ZCode reads the one shared copy; its old copy is gone.
      expect(await FileSystemUtils.fileExists(path.join(skillsDir, 'openspec-explore', 'SKILL.md'))).toBe(false);
      const sharedSkill = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(sharedSkill).toContain('name: openspec-explore');
    });

    it('should migrate Kilo commands without deleting unrelated workflows', async () => {
      const skillsDir = path.join(testDir, '.kilocode', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const legacyDir = path.join(testDir, '.kilocode', 'workflows');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'opsx-explore.md'), 'old OpenSpec command');
      await fs.writeFile(path.join(legacyDir, 'opsx-custom.md'), 'user workflow');

      await new UpdateCommand({ force: true }).execute(testDir);

      expect(await FileSystemUtils.fileExists(path.join(legacyDir, 'opsx-explore.md'))).toBe(false);
      expect(await fs.readFile(path.join(legacyDir, 'opsx-custom.md'), 'utf-8')).toBe('user workflow');

      // No replacement command is written; the shared skill does the work.
      expect(await FileSystemUtils.fileExists(path.join(testDir, '.kilo', 'command', 'opsx-explore.md'))).toBe(false);
      expect(
        await fs.readFile(path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8')
      ).toContain('name: openspec-explore');
    });

    it('should remove Devin Desktop workflows and keep its skills in the shared folder', async () => {
      const skillsDir = path.join(testDir, '.devin', 'skills');
      const oldSkill = await writeReleasedSkill(skillsDir, 'openspec-apply-change');
      const workflow = await writeGeneratedCommand(testDir, 'devin', 'apply');
      const skillFile = path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(workflow)).toBe(false);
      // Skills are the shared copy, which points at skills.
      expect(await FileSystemUtils.fileExists(oldSkill)).toBe(false);
      const skillContent = await fs.readFile(skillFile, 'utf-8');
      expect(skillContent).toContain('`openspec-');
      expect(skillContent).not.toContain('/opsx:');
      expect(skillContent).not.toContain('/opsx-');
    });

    it('should discover a commands-only SourceCraft Code Assistant install, set up skills, and keep custom files', async () => {
      // A 1.x commands-only install: generated commands, an edited one, and
      // the user's own command and skill.
      const toolDir = path.join(testDir, '.codeassistant');
      const generated = await writeGeneratedCommand(testDir, 'codeassistant', 'propose', ['propose', 'apply']);
      const edited = await writeGeneratedCommand(testDir, 'codeassistant', 'apply', ['propose', 'apply']);
      await fs.appendFile(edited, '\nteam step\n');
      const customCommand = path.join(toolDir, 'commands', 'opsx-custom.md');
      const customSkill = path.join(toolDir, 'skills', 'custom-review', 'SKILL.md');
      await fs.mkdir(path.dirname(customSkill), { recursive: true });
      await fs.writeFile(customCommand, 'custom command');
      await fs.writeFile(customSkill, 'custom skill');
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(generated)).toBe(false);
      expect(await fs.readFile(edited, 'utf-8')).toContain('team step');
      const logs = consoleSpy.mock.calls.flat().map(String);
      expect(logs.some((entry) => entry.includes('Kept 1 command file that does not match'))).toBe(true);
      expect(await fs.readFile(customCommand, 'utf-8')).toBe('custom command');
      expect(await fs.readFile(customSkill, 'utf-8')).toBe('custom skill');

      // SourceCraft reads the one shared copy, which names skills plainly.
      const skillContent = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).toContain('`openspec-archive-change`');
      expect(skillContent).not.toMatch(/\/opsx[:-]/);
      expect(getConfiguredToolsForProfileSync(testDir)).toContain('codeassistant');

      consoleSpy.mockClear();
      await updateCommand.execute(testDir);
      expect(consoleSpy.mock.calls.flat().map(String).some((entry) => entry.includes('up to date'))).toBe(true);
    });

    it('should set up skills for a commands-only Claude install and remove its generated commands', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      const coreCommandIds = ['explore', 'apply', 'update', 'sync', 'archive', 'propose'];
      const commandFiles: string[] = [];
      for (const cmdId of coreCommandIds) {
        commandFiles.push(await writeGeneratedCommand(testDir, 'claude', cmdId, coreCommandIds));
      }
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      for (const file of commandFiles) {
        expect(await FileSystemUtils.fileExists(file)).toBe(false);
      }
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed: 6 command files (OpenSpec 2.0 installs skills only)')
      );
      expect(await fs.readFile(
        path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md'), 'utf-8'
      )).toContain('name: openspec-propose');

      consoleSpy.mockClear();
      await updateCommand.execute(testDir);
      const logs = consoleSpy.mock.calls.flat().map(String);
      expect(logs.some((entry) => entry.includes('up to date'))).toBe(true);
      expect(logs.some((entry) => entry.includes('Updating 1 tool(s)'))).toBe(false);
    });
  });

  describe('migrating to skills-only', () => {
    it('deletes generated command files but keeps one the user edited', async () => {
      // The migration path for #2022: 2.0 clears the generated commands
      // without discarding a user's own work.
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
      const proposeCmd = await writeGeneratedCommand(testDir, 'claude', 'propose');
      const applyCmd = await writeGeneratedCommand(testDir, 'claude', 'apply');
      const edited = `${await fs.readFile(proposeCmd, 'utf-8')}\n<!-- team step -->\n`;
      await fs.writeFile(proposeCmd, edited);

      const consoleSpy = vi.spyOn(console, 'log');
      await new UpdateCommand({ force: true }).execute(testDir);

      // The skill is in place, so the workflow still works...
      expect(
        await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md')
        )
      ).toBe(true);
      // ...the untouched command is gone...
      expect(await FileSystemUtils.fileExists(applyCmd)).toBe(false);
      // ...and the edited one survives byte-for-byte, named in the output.
      expect(await fs.readFile(proposeCmd, 'utf-8')).toBe(edited);
      const logs = consoleSpy.mock.calls.flat().map(String);
      expect(
        logs.some((entry) => entry.includes('Kept 1 command file that does not match'))
      ).toBe(true);
      expect(
        logs.some((entry) => entry.includes(path.join('.claude', 'commands', 'opsx', 'propose.md')))
      ).toBe(true);

      // A kept file is not drift: the next plain update finds nothing to sync.
      consoleSpy.mockClear();
      await new UpdateCommand().execute(testDir);
      const nextLogs = consoleSpy.mock.calls.flat().map(String);
      expect(nextLogs.some((entry) => entry.includes('config sync'))).toBe(false);
      expect(nextLogs.some((entry) => entry.includes('Kept 1 command file'))).toBe(false);
      expect(await fs.readFile(proposeCmd, 'utf-8')).toBe(edited);
    });
  });

  describe('multi-tool support', () => {
    it('should update multiple configured tools', async () => {
      // Set up Claude
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(claudeSkillsDir, 'openspec-explore');

      // Set up Cursor
      const cursorSkillsDir = path.join(testDir, '.cursor', 'skills');
      await writeReleasedSkill(cursorSkillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Both tools should be updated
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 2 tool(s)')
      );

      // Verify Claude skills updated
      const claudeSkill = await fs.readFile(
        path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(claudeSkill).toContain('name: openspec-explore');

      // Cursor reads the one shared copy (Claude's link points at it too);
      // its own old copy is gone, so it isn't loaded twice.
      const sharedSkill = await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(sharedSkill).toBe(claudeSkill);
      expect(await FileSystemUtils.fileExists(path.join(cursorSkillsDir, 'openspec-explore', 'SKILL.md'))).toBe(false);

      consoleSpy.mockRestore();
    });

    it.each([
      ['qwen', '.qwen'],
      ['gigacode', '.gigacode'],
      ['command-code', '.commandcode'],
    ] as const)('should update %s skills and remove its generated command', async (toolId, toolDir) => {
      // A 1.x install: its own copy of a skill, and a generated command.
      await writeReleasedSkill(path.join(testDir, toolDir, 'skills'), 'openspec-explore');
      const command = await writeGeneratedCommand(testDir, toolId, 'explore');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(command)).toBe(false);
      expect(
        await fs.readFile(path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8')
      ).toContain('name: openspec-explore');
      expect(getConfiguredToolsForProfileSync(testDir)).toEqual([toolId]);
    });

    it('should move an EasyCode install to skills and then be up to date', async () => {
      // A 1.x EasyCode install with both surfaces.
      const workflows = ['explore', 'apply'];
      await writeReleasedSkill(path.join(testDir, '.easycode', 'skills'), 'openspec-explore');
      const commands = [
        await writeGeneratedCommand(testDir, 'easycode', 'explore', workflows),
        await writeGeneratedCommand(testDir, 'easycode', 'apply', workflows),
      ];

      await updateCommand.execute(testDir);

      for (const command of commands) {
        expect(await FileSystemUtils.fileExists(command)).toBe(false);
      }
      expect(await fs.readFile(
        path.join(testDir, '.easycode', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8'
      )).toContain('name: openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('up to date'))).toBe(true);
      expect(logCalls.some((entry) => entry.includes('Updating 1 tool(s)'))).toBe(false);
    });

    it('should move a commands-only OpenCode install to skills once', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      const coreCommandIds = ['explore', 'apply', 'update', 'sync', 'archive', 'propose'];
      const commands: string[] = [];
      for (const commandId of coreCommandIds) {
        commands.push(await writeGeneratedCommand(testDir, 'opencode', commandId, coreCommandIds));
      }

      await updateCommand.execute(testDir);

      for (const command of commands) {
        expect(await FileSystemUtils.fileExists(command)).toBe(false);
      }
      expect(await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf-8'
      )).toContain('name: openspec-propose');
      expect(getConfiguredToolsForProfileSync(testDir)).toEqual(['opencode']);

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);

      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('up to date'))).toBe(true);
      expect(logCalls.some((entry) => entry.includes('Updating 1 tool(s)'))).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should migrate a legacy .windsurf install to .devin, preserving user files', async () => {
      // A project set up before the Devin Desktop rebrand: OpenSpec skills and
      // workflows under .windsurf/, alongside files the user wrote themselves.
      const legacySkillDir = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await writeReleasedSkill(path.dirname(legacySkillDir), 'openspec-explore');

      // A workflow 1.x generated, moved back to where Windsurf kept it.
      const legacyWorkflows = path.join(testDir, '.windsurf', 'workflows');
      await fs.mkdir(legacyWorkflows, { recursive: true });
      await fs.rename(
        await writeGeneratedCommand(testDir, 'devin', 'explore'),
        path.join(legacyWorkflows, 'opsx-explore.md')
      );

      // User-owned content that must survive untouched
      const userSkillDir = path.join(testDir, '.windsurf', 'skills', 'my-custom-skill');
      await fs.mkdir(userSkillDir, { recursive: true });
      await fs.writeFile(path.join(userSkillDir, 'SKILL.md'), 'user skill');
      await fs.writeFile(path.join(legacyWorkflows, 'my-workflow.md'), 'user workflow');

      // Tests run non-interactively, so the consent-gated move is taken.
      await updateCommand.execute(testDir);

      // The skill is the one shared copy Devin reads, so the moved old copy is
      // not kept in .devin either; the generated workflow is removed, not moved.
      expect(
        await FileSystemUtils.fileExists(path.join(testDir, '.devin', 'skills', 'openspec-explore', 'SKILL.md'))
      ).toBe(false);
      expect(
        await fs.readFile(path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8')
      ).toContain('name: openspec-explore');
      expect(
        await FileSystemUtils.fileExists(path.join(testDir, '.devin', 'workflows', 'opsx-explore.md'))
      ).toBe(false);

      // The OpenSpec-managed originals are gone; the user's files are not
      await expect(fs.access(legacySkillDir)).rejects.toThrow();
      await expect(
        fs.access(path.join(legacyWorkflows, 'opsx-explore.md'))
      ).rejects.toThrow();
      expect(await fs.readFile(path.join(userSkillDir, 'SKILL.md'), 'utf-8')).toBe('user skill');
      expect(
        await fs.readFile(path.join(legacyWorkflows, 'my-workflow.md'), 'utf-8')
      ).toBe('user workflow');
    });

    it('should not delete the install when the legacy root is a symlink to the current one', async () => {
      // Symlinking the two roots is a realistic way to straddle the rebrand.
      // Source and destination are then the same file, so a naive
      // "destination exists, drop the legacy copy" would delete the original.
      await updateCommand.execute(testDir);
      const devinSkill = path.join(testDir, '.devin', 'skills', 'openspec-explore');
      await fs.mkdir(devinSkill, { recursive: true });
      await fs.writeFile(path.join(devinSkill, 'SKILL.md'), 'real content');
      await fs.symlink('.devin', path.join(testDir, '.windsurf'));

      await updateCommand.execute(testDir);

      // The real file is still there, through either path
      expect(await FileSystemUtils.fileExists(path.join(devinSkill, 'SKILL.md'))).toBe(true);
    });

    it('should keep user files that live inside an OpenSpec-managed skill directory', async () => {
      // Both roots holding the same skill is the normal state after a rebrand.
      // A reference the user wrote beside SKILL.md is theirs and never moves.
      const devinSkill = path.join(testDir, '.devin', 'skills', 'openspec-explore');
      await fs.mkdir(devinSkill, { recursive: true });
      await fs.writeFile(path.join(devinSkill, 'SKILL.md'), 'current');

      const legacySkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkill, { recursive: true });
      await fs.writeFile(path.join(legacySkill, 'SKILL.md'), 'current');
      await fs.writeFile(path.join(legacySkill, 'reference.md'), 'my notes');

      await updateCommand.execute(testDir);

      // Byte-identical to the survivor, so the redundant copy goes
      await expect(fs.access(path.join(legacySkill, 'SKILL.md'))).rejects.toThrow();
      expect(await fs.readFile(path.join(legacySkill, 'reference.md'), 'utf-8')).toBe('my notes');
    });

    it('should report divergent files even when nothing is movable', async () => {
      // Every legacy file differs from its counterpart, so there is no move to
      // make. Staying silent would leave two divergent copies the user never
      // hears about, so the result is reported rather than dropped.
      const devinSkill = path.join(testDir, '.devin', 'skills', 'openspec-explore');
      await fs.mkdir(devinSkill, { recursive: true });
      await fs.writeFile(path.join(devinSkill, 'SKILL.md'), 'current');
      const devinWorkflows = path.join(testDir, '.devin', 'workflows');
      await fs.mkdir(devinWorkflows, { recursive: true });
      await fs.writeFile(path.join(devinWorkflows, 'opsx-explore.md'), 'current');

      const legacySkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkill, { recursive: true });
      await fs.writeFile(path.join(legacySkill, 'SKILL.md'), 'mine');
      const legacyWorkflows = path.join(testDir, '.windsurf', 'workflows');
      await fs.mkdir(legacyWorkflows, { recursive: true });
      await fs.writeFile(path.join(legacyWorkflows, 'opsx-explore.md'), 'mine');

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      const logCalls = consoleSpy.mock.calls.flat().map(String);
      consoleSpy.mockRestore();

      // The divergence is surfaced...
      expect(logCalls.some((entry) => entry.includes('Left 2 files in .windsurf/'))).toBe(true);
      // ...without claiming a migration that did not happen. Matched on the
      // directory arrow rather than the word "Migrated", which also begins the
      // unrelated profile-migration line ("Migrated: custom profile with N
      // workflows") that fires only under some config states.
      expect(logCalls.some((entry) => entry.includes('.windsurf → .devin'))).toBe(false);
      expect(logCalls.some((entry) => entry.includes('Migrated 0'))).toBe(false);
      // ...and nothing was touched
      expect(await fs.readFile(path.join(legacySkill, 'SKILL.md'), 'utf-8')).toBe('mine');
      expect(await fs.readFile(path.join(legacyWorkflows, 'opsx-explore.md'), 'utf-8')).toBe('mine');
    });

    it('should keep a legacy SKILL.md the user edited, matching how command files are treated', async () => {
      // Skills and commands must follow one rule. An earlier draft compared
      // content for commands and not for skills, so the same situation
      // destroyed a user's edited skill while preserving their edited command.
      const devinSkill = path.join(testDir, '.devin', 'skills', 'openspec-explore');
      await fs.mkdir(devinSkill, { recursive: true });
      await fs.writeFile(path.join(devinSkill, 'SKILL.md'), 'current');
      const devinWorkflows = path.join(testDir, '.devin', 'workflows');
      await fs.mkdir(devinWorkflows, { recursive: true });
      await fs.writeFile(path.join(devinWorkflows, 'opsx-explore.md'), 'current');

      const legacySkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkill, { recursive: true });
      await fs.writeFile(path.join(legacySkill, 'SKILL.md'), 'my edited skill');
      const legacyWorkflows = path.join(testDir, '.windsurf', 'workflows');
      await fs.mkdir(legacyWorkflows, { recursive: true });
      await fs.writeFile(path.join(legacyWorkflows, 'opsx-explore.md'), 'my edited command');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(path.join(legacySkill, 'SKILL.md'), 'utf-8')).toBe(
        'my edited skill'
      );
      expect(await fs.readFile(path.join(legacyWorkflows, 'opsx-explore.md'), 'utf-8')).toBe(
        'my edited command'
      );
    });

    it('should not carry a user file into a skill directory that commands-only delivery deletes', async () => {
      // Only SKILL.md may cross. The destination is a directory OpenSpec owns
      // and removes on its own under commands-only delivery, so moving the
      // whole legacy directory would hand the user's file to that removal.
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      const legacySkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkill, { recursive: true });
      await fs.writeFile(path.join(legacySkill, 'SKILL.md'), 'stale');
      await fs.writeFile(path.join(legacySkill, 'reference.md'), 'my notes');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(path.join(legacySkill, 'reference.md'), 'utf-8')).toBe('my notes');
      await expect(fs.access(path.join(legacySkill, 'SKILL.md'))).rejects.toThrow();
    });

    it('should not carry a user file into a skill directory a deselected workflow deletes', async () => {
      // openspec-new-change is outside the core profile, so the skill
      // directory it would land in is one OpenSpec prunes.
      const legacySkill = path.join(testDir, '.windsurf', 'skills', 'openspec-new-change');
      await fs.mkdir(legacySkill, { recursive: true });
      await fs.writeFile(path.join(legacySkill, 'SKILL.md'), 'stale');
      await fs.writeFile(path.join(legacySkill, 'reference.md'), 'my notes');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(path.join(legacySkill, 'reference.md'), 'utf-8')).toBe('my notes');
    });

    it('should still fully vacate a legacy skill directory that holds only SKILL.md', async () => {
      // The safety rule must not leave empty scaffolding behind in the
      // ordinary case, where there is nothing of the user's to preserve.
      const legacySkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkill, { recursive: true });
      await fs.writeFile(path.join(legacySkill, 'SKILL.md'), 'stale');

      await updateCommand.execute(testDir);

      expect(
        await FileSystemUtils.fileExists(
          path.join(testDir, '.devin', 'skills', 'openspec-explore', 'SKILL.md')
        )
      ).toBe(true);
      await expect(fs.access(path.join(testDir, '.windsurf'))).rejects.toThrow();
    });

    it('should keep a legacy command file the user edited, and drop an identical one', async () => {
      const devinWorkflows = path.join(testDir, '.devin', 'workflows');
      await fs.mkdir(devinWorkflows, { recursive: true });
      await fs.writeFile(path.join(devinWorkflows, 'opsx-explore.md'), 'generated');
      await fs.writeFile(path.join(devinWorkflows, 'opsx-apply.md'), 'generated');

      const legacyWorkflows = path.join(testDir, '.windsurf', 'workflows');
      await fs.mkdir(legacyWorkflows, { recursive: true });
      // Edited by the user — deleting it would throw the edit away
      await fs.writeFile(path.join(legacyWorkflows, 'opsx-explore.md'), 'my edits');
      // Byte-identical — nothing is lost by dropping it
      await fs.writeFile(path.join(legacyWorkflows, 'opsx-apply.md'), 'generated');

      await updateCommand.execute(testDir);

      expect(await fs.readFile(path.join(legacyWorkflows, 'opsx-explore.md'), 'utf-8')).toBe(
        'my edits'
      );
      await expect(fs.access(path.join(legacyWorkflows, 'opsx-apply.md'))).rejects.toThrow();
    });

    it('should leave a migrated project alone on the next run', async () => {
      // The move must be idempotent: once .windsurf/ holds nothing of ours,
      // a second update has nothing to migrate and nothing to announce.
      const legacySkillDir = path.join(testDir, '.windsurf', 'skills', 'openspec-explore');
      await fs.mkdir(legacySkillDir, { recursive: true });
      await fs.writeFile(path.join(legacySkillDir, 'SKILL.md'), 'old');

      await updateCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('.windsurf → .devin'))).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should report a failed legacy-only Codex bootstrap to automation', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const prompt = await createLegacyCodexPrompt();
      failCodexSkillWrites();

      await expect(new UpdateCommand({ force: true }).execute(testDir)).rejects.toThrow(
        'OpenSpec update failed for: Codex'
      );
      await expect(fs.access(prompt)).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'))
      ).rejects.toThrow();
    });

    it('should refresh configured tools after a legacy Codex bootstrap fails', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      await createLegacyCodexPrompt();

      // MiniMax keeps its skills in the user's home, outside the shared copy
      // whose writes fail here.
      const otherSkill = path.join(testDir, 'home', '.minimax', 'skills', 'openspec-explore', 'SKILL.md');
      await fs.mkdir(path.dirname(otherSkill), { recursive: true });
      await fs.writeFile(otherSkill, 'old');

      failCodexSkillWrites();

      await expect(new UpdateCommand({ force: true }).execute(testDir)).rejects.toThrow(
        'OpenSpec update failed for: Codex'
      );
      expect(await fs.readFile(otherSkill, 'utf-8')).toContain('name: openspec-explore');
    });

    it('should report a failed bootstrap when configured tools are already current', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      await new InitCommand({ tools: 'cursor', force: true }).execute(testDir);

      await createLegacyCodexPrompt();

      interactiveState.value = true;
      confirmMock.mockResolvedValue(true);
      searchableMultiSelectMock.mockResolvedValue(['codex']);

      failCodexSkillWrites();
      const consoleSpy = vi.spyOn(console, 'log');

      await expect(new UpdateCommand().execute(testDir)).rejects.toThrow(
        'OpenSpec update failed for: Codex'
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All 1 tool(s) up to date'));
    });

    it('should report a failed bootstrap after declining an unrelated migration', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const legacySkill = path.join(
        testDir,
        '.windsurf',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(legacySkill), { recursive: true });
      await fs.writeFile(legacySkill, 'legacy skill');

      await createLegacyCodexPrompt();

      interactiveState.value = true;
      confirmMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      searchableMultiSelectMock.mockResolvedValue(['codex']);

      failCodexSkillWrites();

      await expect(new UpdateCommand().execute(testDir)).rejects.toThrow(
        'OpenSpec update failed for: Codex'
      );
      expect(await fs.readFile(legacySkill, 'utf-8')).toBe('legacy skill');
    });

    it('should preserve legacy Codex skills and prompts when canonical generation fails', async () => {
      const legacySkill = path.join(
        testDir,
        '.codex',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      const legacyContent = 'legacy Codex skill';
      await fs.mkdir(path.dirname(legacySkill), { recursive: true });
      await fs.writeFile(legacySkill, legacyContent);

      const prompt = path.join(process.env.CODEX_HOME!, 'prompts', 'opsx-explore.md');
      await fs.mkdir(path.dirname(prompt), { recursive: true });
      await fs.writeFile(prompt, releasedCodexPrompt('opsx-explore.md'));

      const originalWriteFile = FileSystemUtils.writeFile.bind(FileSystemUtils);
      vi.spyOn(FileSystemUtils, 'writeFile').mockImplementation(async (filePath, content) => {
        if (filePath.includes(`${path.sep}.agents${path.sep}`) && filePath.endsWith('SKILL.md')) {
          throw new Error('EACCES: permission denied');
        }
        return originalWriteFile(filePath, content);
      });

      await expect(new UpdateCommand({ force: true }).execute(testDir)).rejects.toThrow(
        'OpenSpec update failed for: Codex'
      );
      expect(await fs.readFile(legacySkill, 'utf-8')).toBe(legacyContent);
      expect(await FileSystemUtils.fileExists(prompt)).toBe(true);
    });

    it('should report tool update failures to automation', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Mock writeFile to fail for skills
      const originalWriteFile = FileSystemUtils.writeFile.bind(FileSystemUtils);
      const writeSpy = vi
        .spyOn(FileSystemUtils, 'writeFile')
        .mockImplementation(async (filePath, content) => {
          if (filePath.includes('SKILL.md')) {
            throw new Error('EACCES: permission denied');
          }
          return originalWriteFile(filePath, content);
        });

      const consoleSpy = vi.spyOn(console, 'log');

      await expect(updateCommand.execute(testDir)).rejects.toThrow(
        'OpenSpec update failed for: Claude Code'
      );

      // Should report failure
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed')
      );

      writeSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    // Kiro's own skills folder holds a 1.x copy that OpenSpec may not replace
    // (read-only folder), so Kiro's links fail. POSIX permissions only.
    async function lockKiroSkills(): Promise<() => Promise<void>> {
      const kiroSkills = path.join(testDir, '.kiro', 'skills');
      await writeReleasedSkill(kiroSkills, 'openspec-explore');
      await fs.chmod(kiroSkills, 0o555);
      return () => fs.chmod(kiroSkills, 0o755);
    }

    it.skipIf(process.platform === 'win32')('should continue updating other tools when one fails', async () => {
      // Kiro and Cursor, both set up; Cursor reads the shared copy.
      await writeReleasedSkill(path.join(testDir, '.cursor', 'skills'), 'openspec-explore');
      const unlock = await lockKiroSkills();
      const consoleSpy = vi.spyOn(console, 'log');

      try {
        await expect(updateCommand.execute(testDir)).rejects.toThrow('OpenSpec update failed for: Kiro');
      } finally {
        await unlock();
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated: Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed'));
      // Cursor succeeded, so its IDE process still needs to reload the changes.
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Restart your IDE'));
      consoleSpy.mockRestore();
    });

    it.skipIf(process.platform === 'win32')('should not suggest an IDE restart when only the IDE tool fails', async () => {
      // Kiro is an IDE tool, Claude a CLI. Kiro's links fail; Claude's work.
      await writeReleasedSkill(path.join(testDir, '.claude', 'skills'), 'openspec-explore');
      const unlock = await lockKiroSkills();
      const consoleSpy = vi.spyOn(console, 'log');

      try {
        await expect(updateCommand.execute(testDir)).rejects.toThrow('OpenSpec update failed for: Kiro');
      } finally {
        await unlock();
      }
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated: Claude Code'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Restart your IDE'));
    });
  });

  describe('tool detection', () => {
    it('should detect tool as configured only when skill file exists', async () => {
      // Create skills directory but no skill files
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(skillsDir, { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should report no configured tools
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No configured tools found')
      );

      consoleSpy.mockRestore();
    });

    it('should detect tool when any single skill exists', async () => {
      // Create only one skill file
      const skillDir = path.join(
        testDir,
        '.claude',
        'skills',
        'openspec-archive-change'
      );
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'old');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should detect and update Claude
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 1 tool(s): claude')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('skill content validation', () => {
    it('should generate valid YAML frontmatter in skill files', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      await updateCommand.execute(testDir);

      const skillContent = await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );

      // Validate frontmatter structure
      expect(skillContent).toMatch(/^---\n/);
      expect(skillContent).toContain('name:');
      expect(skillContent).toContain('description:');
      expect(skillContent).toContain('license:');
      expect(skillContent).toContain('compatibility:');
      expect(skillContent).toContain('metadata:');
      expect(skillContent).toContain('author:');
      expect(skillContent).toContain('version:');
      expect(skillContent).toMatch(/---\n\n/);
    });

    it('should include proper instructions in skill files', async () => {
      // Set up a configured tool with apply-change skill (which is in core profile)
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-apply-change');

      await updateCommand.execute(testDir);

      const skillContent = await fs.readFile(
        path.join(skillsDir, 'openspec-apply-change', 'SKILL.md'),
        'utf-8'
      );

      // Apply skill should contain implementation instructions
      expect(skillContent.toLowerCase()).toContain('task');
    });
  });

  describe('success output', () => {
    it('should display success message with tool name', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // The success output uses "✓ Updated: <name>"
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      consoleSpy.mockRestore();
    });

    it('should not suggest an IDE restart for CLI-only tools', async () => {
      // Set up a configured CLI tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Restart your IDE')
      );

      consoleSpy.mockRestore();
    });

    it.each(['both', 'commands', 'skills'] as const)('should name skills as the IDE surface with %s delivery', async (delivery) => {
      // Delivery no longer changes what is installed: skills, for every tool.
      setMockConfig({ featureFlags: {}, profile: 'core', delivery });
      const skillsDir = path.join(testDir, '.cursor', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Restart your IDE to refresh skills.')
      );
      expect(await FileSystemUtils.directoryExists(
        path.join(testDir, '.cursor', 'commands')
      )).toBe(false);
      // Cursor reads the one shared copy.
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md')
      )).toBe(true);

      consoleSpy.mockClear();
      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('up to date'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Restart your IDE'));

      consoleSpy.mockRestore();
    });

    it.each(['both', 'commands', 'skills'] as const)(
      'should describe removal-only IDE updates with %s delivery',
      async (delivery) => {
        setMockConfig({ featureFlags: {}, profile: 'core', delivery });
        await new InitCommand({ tools: 'cursor', force: true }).execute(testDir);
        setMockConfig({ featureFlags: {}, profile: 'custom', workflows: [], delivery });
        const consoleSpy = vi.spyOn(console, 'log');

        await updateCommand.execute(testDir);

        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.cursor', 'commands', 'opsx-explore.md')
        )).toBe(false);
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md')
        )).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Restart your IDE to refresh skills.')
        );
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Restart your IDE for the new')
        );
      }
    );

    it('should not suggest an IDE restart when only a CLI tool needs updating', async () => {
      await new InitCommand({ tools: 'claude,cursor', force: true }).execute(testDir);
      // Claude's own file: a command 1.x generated, left to remove. (Its skill
      // is the shared copy Cursor reads too, so an edit there would rightly
      // refresh both.)
      const leftover = await writeGeneratedCommand(testDir, 'claude', 'explore');
      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(leftover)).toBe(false);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated: Claude Code'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Updated: Cursor'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Restart your IDE'));
    });
  });

  describe('smart update detection', () => {
    it('should show "up to date" message when skills have current version', async () => {
      // Initialize full core profile output so there is no profile/delivery drift.
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('up to date')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('--force')
      );

      consoleSpy.mockRestore();
    });

    it('should create GitHub Copilot cloud files when github-copilot is up to date', async () => {
      const initCommand = new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true });
      await initCommand.execute(testDir);

      const setupStepsPath = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
      const agentPath = path.join(testDir, '.github', 'agents', 'openspec.agent.md');
      await fs.rm(setupStepsPath, { force: true });
      await fs.rm(agentPath, { force: true });

      await updateCommand.execute(testDir);

      await expect(fs.readFile(setupStepsPath, 'utf8')).resolves.toContain('copilot-setup-steps:');
      await expect(fs.readFile(agentPath, 'utf8')).resolves.toContain('# OpenSpec Agent');
    });

    it('should refresh managed legacy Copilot files and preserve custom files during force update', async () => {
      const initCommand = new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true });
      await initCommand.execute(testDir);

      const setupStepsPath = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
      const agentPath = path.join(testDir, '.github', 'agents', 'openspec.agent.md');
      const legacySetupSteps = generateCopilotSetupSteps().replace(
        /^# Generated by OpenSpec for GitHub Copilot coding agent support\.\n\n/,
        ''
      );
      const customAgent = 'custom Copilot agent';
      await fs.writeFile(setupStepsPath, legacySetupSteps);
      await fs.writeFile(agentPath, customAgent);

      await new UpdateCommand({ force: true }).execute(testDir);

      await expect(fs.readFile(setupStepsPath, 'utf8')).resolves.toBe(
        generateCopilotSetupSteps()
      );
      await expect(fs.readFile(agentPath, 'utf8')).resolves.toBe(customAgent);
    });

    it('should not create cloud files on update when Copilot is configured but not opted in', async () => {
      // Seed a configured github-copilot WITHOUT opting into cloud files.
      const initCommand = new InitCommand({ tools: 'github-copilot', force: true });
      await initCommand.execute(testDir);

      await updateCommand.execute(testDir);

      await expect(
        fs.stat(path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml'))
      ).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(
        fs.stat(path.join(testDir, '.github', 'agents', 'openspec.agent.md'))
      ).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('should refresh pre-existing managed cloud files even without a config opt-in (migration)', async () => {
      // A project created before the opt-in existed: managed files are present
      // but config carries no githubCopilot key. Update must keep them current.
      const initCommand = new InitCommand({ tools: 'github-copilot', force: true });
      await initCommand.execute(testDir);

      const setupStepsPath = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
      const legacySetupSteps = generateCopilotSetupSteps().replace(
        /^# Generated by OpenSpec for GitHub Copilot coding agent support\.\n\n/,
        ''
      );
      await fs.mkdir(path.dirname(setupStepsPath), { recursive: true });
      await fs.writeFile(setupStepsPath, legacySetupSteps);

      await new UpdateCommand({ force: true }).execute(testDir);

      await expect(fs.readFile(setupStepsPath, 'utf8')).resolves.toBe(generateCopilotSetupSteps());
    });

    it('should remove managed cloud files on update when the user has opted out', async () => {
      await new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true }).execute(testDir);
      const setupStepsPath = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
      const agentPath = path.join(testDir, '.github', 'agents', 'openspec.agent.md');
      expect(await fs.stat(setupStepsPath)).toBeTruthy();

      await persistCopilotCloudOptIn(testDir, false); // explicit opt-out

      await new UpdateCommand({ force: true }).execute(testDir);

      await expect(fs.stat(setupStepsPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(fs.stat(agentPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('should preserve a customized cloud file on update even when opted out', async () => {
      await new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true }).execute(testDir);
      const setupStepsPath = path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml');
      await fs.writeFile(setupStepsPath, 'name: my own workflow\n');

      await persistCopilotCloudOptIn(testDir, false); // explicit opt-out

      await new UpdateCommand({ force: true }).execute(testDir);

      // A user-customized file is never removed, even on opt-out.
      await expect(fs.readFile(setupStepsPath, 'utf8')).resolves.toBe('name: my own workflow\n');
    });

    it('should warn when GitHub Copilot cloud files cannot be synchronized', async () => {
      const initCommand = new InitCommand({ tools: 'github-copilot', force: true, copilotCloud: true });
      await initCommand.execute(testDir);

      const agentsPath = path.join(testDir, '.github', 'agents');
      await fs.rm(agentsPath, { recursive: true, force: true });
      await fs.writeFile(agentsPath, 'blocks the generated agent directory');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await updateCommand.execute(testDir);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to sync Copilot cloud agent files')
      );
    });

    it('should detect update needed when generatedBy is missing', async () => {
      // Set up a configured tool without generatedBy
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
---

Legacy content without generatedBy
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show "unknown → version" in the update message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown')
      );

      consoleSpy.mockRestore();
    });

    it('should detect update needed when version differs', async () => {
      // Set up a configured tool with old version
      const skillsDir = path.join(testDir, '.claude', 'skills');
      const oldSkill = await writeReleasedSkill(skillsDir, 'openspec-explore');
      await fs.writeFile(
        oldSkill,
        (await fs.readFile(oldSkill, 'utf-8')).replace(/generatedBy:\s*"[^"]+"/, 'generatedBy: "0.1.0"')
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show version transition
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('0.1.0')
      );

      consoleSpy.mockRestore();
    });

    it('should embed generatedBy in updated skill files', async () => {
      // Set up a configured tool without generatedBy
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      await updateCommand.execute(testDir);

      const updatedContent = await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );

      // Should contain generatedBy field
      expect(updatedContent).toMatch(/generatedBy:\s*["']\d+\.\d+\.\d+["']/);
    });
  });

  describe('--force flag', () => {
    it('should update when force is true even if up to date', async () => {
      // Set up a configured tool with current version
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), {
        recursive: true,
      });

      const { version } = await import('../../package.json');
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        `---
metadata:
  generatedBy: "${version}"
---
Content
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show "Force updating" message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Force updating')
      );

      // Should show updated message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      consoleSpy.mockRestore();
    });

    it('should not show --force hint when force is used', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Get all console.log calls as strings
      const allCalls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );

      // Should not show "Use --force" since force was used
      const hasForceHint = allCalls.some(call => call.includes('Use --force'));
      expect(hasForceHint).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should update all tools when force is used with mixed versions', async () => {
      // Set up Claude with current version
      const { version } = await import('../../package.json');
      const claudeSkillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(claudeSkillDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeSkillDir, 'SKILL.md'),
        `---
metadata:
  generatedBy: "${version}"
---
`
      );

      // Set up Cursor with old version
      const cursorSkillDir = path.join(testDir, '.cursor', 'skills', 'openspec-explore');
      await fs.mkdir(cursorSkillDir, { recursive: true });
      await fs.writeFile(
        path.join(cursorSkillDir, 'SKILL.md'),
        `---
metadata:
  generatedBy: "0.1.0"
---
`
      );

      const consoleSpy = vi.spyOn(console, 'log');

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show both tools being force updated
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Force updating 2 tool(s)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('version tracking', () => {
    it('should show version in success message', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show version in success message
      const { version } = await import('../../package.json');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`(v${version})`)
      );

      consoleSpy.mockRestore();
    });

    it('should only update tools that need updating', async () => {
      // Initialize both tools so Cursor is fully synced with profile/delivery.
      const initCommand = new InitCommand({ tools: 'claude,cursor', force: true });
      await initCommand.execute(testDir);

      // Make only Claude stale, through a file of its own: a command 1.x
      // generated, left to remove. (Its skill is the shared copy Cursor reads too.)
      await writeGeneratedCommand(testDir, 'claude', 'explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should show only Claude being updated
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating 1 tool(s)')
      );

      // Should mention Cursor is already up to date
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date: cursor')
      );

      // A configured IDE tool that was not affected must not cause the hint.
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Restart your IDE')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('legacy cleanup', () => {
    it('sets up every detected tool, with no picker, when it cleans up without asking', async () => {
      // Untouched 0.23 Claude commands: update removes them without --force,
      // so it must not let the user untick the tool that replaces them.
      const fixtures = path.join(__dirname, '..', 'fixtures', 'released-output');
      const commandsDir = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(commandsDir, { recursive: true });
      for (const name of ['proposal', 'apply', 'archive']) {
        await fs.copyFile(
          path.join(fixtures, `v0.23.0-claude-command-${name}.md`),
          path.join(commandsDir, `${name}.md`)
        );
      }
      interactiveState.value = true;
      searchableMultiSelectMock.mockResolvedValue([]);

      await new UpdateCommand().execute(testDir);

      expect(searchableMultiSelectMock).not.toHaveBeenCalled();
      expect(confirmMock).not.toHaveBeenCalled();
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'openspec-propose', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.directoryExists(commandsDir)).toBe(false);
    });

    it('should detect and auto-cleanup legacy files with --force flag', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Create legacy CLAUDE.md with OpenSpec markers
      const legacyContent = `${OPENSPEC_MARKERS.start}
# OpenSpec Instructions

These instructions are for AI assistants.
${OPENSPEC_MARKERS.end}
`;
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), legacyContent);

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show v1 upgrade message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upgrading to the new OpenSpec')
      );

      // Should show marker removal message (config files are never deleted, only have markers removed)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed OpenSpec markers from CLAUDE.md')
      );

      // Config file should still exist (never deleted)
      const legacyExists = await FileSystemUtils.fileExists(
        path.join(testDir, 'CLAUDE.md')
      );
      expect(legacyExists).toBe(true);

      // File should have markers removed
      const content = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(content).not.toContain(OPENSPEC_MARKERS.start);
      expect(content).not.toContain(OPENSPEC_MARKERS.end);

      consoleSpy.mockRestore();
    });

    it('should remove managed global Codex opsx prompts with --force and preserve unmanaged prompts', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const skillsDir = path.join(testDir, '.agents', 'skills');
      await markCodexTarget(skillsDir);
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const managedPrompt = path.join(promptDir, 'opsx-explore.md');
      const legacyPrompt = path.join(promptDir, 'openspec-proposal.md');
      const unmanagedPrompt = path.join(promptDir, 'personal-notes.md');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(managedPrompt, releasedCodexPrompt('opsx-explore.md'));
      await fs.writeFile(legacyPrompt, 'managed');
      await fs.writeFile(unmanagedPrompt, 'user');

      const consoleSpy = vi.spyOn(console, 'log');

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deferred global prompts cleanup')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`codex: ${managedPrompt}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Removed ${managedPrompt} (replaced by Codex skills)`)
      );
      expect(await FileSystemUtils.fileExists(managedPrompt)).toBe(false);
      expect(await FileSystemUtils.fileExists(legacyPrompt)).toBe(true);
      expect(await FileSystemUtils.fileExists(unmanagedPrompt)).toBe(true);

      const skillFile = path.join(skillsDir, 'openspec-explore', 'SKILL.md');
      expect(await FileSystemUtils.fileExists(skillFile)).toBe(true);
      const skillContent = await fs.readFile(skillFile, 'utf-8');
      expect(skillContent).toContain('name: openspec-explore');

      consoleSpy.mockRestore();
    });

    it('should infer Codex replacement workflows from legacy prompt filenames during forced update', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const managedPrompt = path.join(promptDir, 'opsx-explore.md');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(managedPrompt, releasedCodexPrompt('opsx-explore.md'));

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(managedPrompt)).toBe(false);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md')
      )).toBe(false);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-archive-change', 'SKILL.md')
      )).toBe(false);
    });

    it.each([
      ['opsx-archive.md', 'openspec-archive-change'],
      ['opsx-bulk-archive.md', 'openspec-bulk-archive-change'],
    ])('should include sync when replacing legacy Codex %s', async (promptName, archiveSkill) => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const managedPrompt = path.join(promptDir, promptName);
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(managedPrompt, releasedCodexPrompt(promptName));

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(managedPrompt)).toBe(false);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', archiveSkill, 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-sync-specs', 'SKILL.md')
      )).toBe(true);
    });

    it('should print a skill-based getting-started menu when a legacy upgrade newly configures codex', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      // Legacy managed Codex prompt with codex not yet configured: the
      // upgrade newly configures codex, whose onboarding menu must not
      // advertise /opsx:* commands (codex has no slash surface).
      // The prompt is opsx-new.md so the inferred workflow ('new') is one the
      // onboarding menu actually lists — the menu is now filtered to the
      // workflows the upgrade installed.
      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(path.join(promptDir, 'opsx-new.md'), releasedCodexPrompt('opsx-new.md'));

      const consoleSpy = vi.spyOn(console, 'log');
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      const logCalls = consoleSpy.mock.calls.flat().map(String);
      consoleSpy.mockRestore();

      expect(logCalls.some((entry) => entry.includes('Getting started'))).toBe(true);
      const menuLines = logCalls.filter((entry) => entry.includes('Scaffold a change'));
      expect(menuLines).toHaveLength(1);
      expect(menuLines[0]).toContain('$openspec-new-change');
      expect(logCalls.some((entry) => entry.includes('/opsx:new'))).toBe(false);
      expect(logCalls.some((entry) => entry.includes('/opsx:continue'))).toBe(false);
      expect(logCalls.some((entry) => entry.includes('/opsx:apply'))).toBe(false);
      // Only the inferred workflow is advertised, not the rest of the profile
      expect(logCalls.some((entry) => entry.includes('Next artifact'))).toBe(false);
      expect(logCalls.some((entry) => entry.includes('Implement tasks'))).toBe(false);
    });

    it('should print the skill getting-started menu when a legacy upgrade newly configures cursor', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'both',
      });

      // A pre-opsx Cursor project: legacy .cursor/commands/openspec-*.md files
      // make the upgrade newly configure cursor, whose menu must name the
      // skills it installs (/openspec-propose), not any /opsx command.
      const legacyDir = path.join(testDir, '.cursor', 'commands');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'openspec-proposal.md'), 'legacy proposal command');

      const consoleSpy = vi.spyOn(console, 'log');
      await new UpdateCommand({ force: true }).execute(testDir);
      const logCalls = consoleSpy.mock.calls.flat().map(String);
      consoleSpy.mockRestore();

      const menuLines = logCalls.filter((entry) => entry.includes('Start a change'));
      expect(menuLines).toHaveLength(1);
      expect(menuLines[0]).toContain('/openspec-propose');
      expect(logCalls.some((entry) => /\/opsx[:-]/.test(entry))).toBe(false);
      // The hint names what was generated, the same sentence init prints, rather
      // than update's older generic "changes".
      expect(
        logCalls.some((entry) =>
          entry.includes('Restart your IDE to refresh skills.')
        )
      ).toBe(true);
    });

    it('should preserve legacy Codex prompts when a configured Codex tool lacks the replacement workflow', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      const skillsDir = path.join(testDir, '.agents', 'skills');
      await markCodexTarget(skillsDir);
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const managedPrompt = path.join(promptDir, 'opsx-onboard.md');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(managedPrompt, releasedCodexPrompt('opsx-onboard.md'));

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(managedPrompt)).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.agents', 'skills', 'openspec-onboard', 'SKILL.md')
      )).toBe(false);
    });

    it('should install a missing Codex update skill before removing its prompt in the same forced run', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const skillsDir = path.join(testDir, '.agents', 'skills');
      await markCodexTarget(skillsDir);
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const managedPrompt = path.join(promptDir, 'opsx-update.md');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(managedPrompt, releasedCodexPrompt('opsx-update.md'));

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-update-change', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(managedPrompt)).toBe(false);
    });

    it('should warn but continue with update when legacy files found in non-interactive mode', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Create legacy CLAUDE.md with OpenSpec markers
      const legacyContent = `${OPENSPEC_MARKERS.start}
# OpenSpec Instructions
${OPENSPEC_MARKERS.end}
`;
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), legacyContent);

      const consoleSpy = vi.spyOn(console, 'log');

      // Run without --force in non-interactive mode (CI environment)
      await updateCommand.execute(testDir);

      // Should show v1 upgrade message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Upgrading to the new OpenSpec')
      );

      // Should show warning about --force
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Run with --force to auto-cleanup')
      );

      // Should continue with update
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      // Legacy file should still exist (not cleaned up)
      const legacyExists = await FileSystemUtils.fileExists(
        path.join(testDir, 'CLAUDE.md')
      );
      expect(legacyExists).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should cleanup legacy slash command directories with --force', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Create legacy slash command directory holding a command OpenSpec wrote.
      // Only those files are removed; any other file here is the user's.
      const legacyCommandDir = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(legacyCommandDir, { recursive: true });
      await fs.writeFile(
        path.join(legacyCommandDir, 'proposal.md'),
        '<!-- OPENSPEC:START -->\nold command\n<!-- OPENSPEC:END -->\n'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show cleanup message for directory
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed .claude/commands/openspec/')
      );

      // Legacy directory should be deleted
      const legacyDirExists = await FileSystemUtils.directoryExists(legacyCommandDir);
      expect(legacyDirExists).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should cleanup legacy openspec/AGENTS.md with --force', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Create legacy openspec/AGENTS.md
      await fs.writeFile(
        path.join(testDir, 'openspec', 'AGENTS.md'),
        '# Old AGENTS.md content'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show cleanup message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed openspec/AGENTS.md')
      );

      // Legacy file should be deleted
      const legacyExists = await FileSystemUtils.fileExists(
        path.join(testDir, 'openspec', 'AGENTS.md')
      );
      expect(legacyExists).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not show legacy cleanup messages when no legacy files exist', async () => {
      // Set up a configured tool with no legacy files
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should not show v1 upgrade message (no legacy files)
      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasLegacyMessage = calls.some(call =>
        call.includes('Upgrading to the new OpenSpec')
      );
      expect(hasLegacyMessage).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should remove OpenSpec marker block from mixed content files', async () => {
      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Create CLAUDE.md with mixed content (user content + OpenSpec markers)
      const mixedContent = `# My Project

Some user-defined instructions here.

${OPENSPEC_MARKERS.start}
# OpenSpec Instructions

These instructions are for AI assistants.
${OPENSPEC_MARKERS.end}

More user content after markers.
`;
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), mixedContent);

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show marker removal message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed OpenSpec markers from CLAUDE.md')
      );

      // File should still exist
      const fileExists = await FileSystemUtils.fileExists(
        path.join(testDir, 'CLAUDE.md')
      );
      expect(fileExists).toBe(true);

      // File should have markers removed but preserve user content
      const updatedContent = await fs.readFile(
        path.join(testDir, 'CLAUDE.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('# My Project');
      expect(updatedContent).toContain('Some user-defined instructions here');
      expect(updatedContent).toContain('More user content after markers');
      expect(updatedContent).not.toContain(OPENSPEC_MARKERS.start);
      expect(updatedContent).not.toContain(OPENSPEC_MARKERS.end);

      consoleSpy.mockRestore();
    });
  });

  describe('legacy tool upgrade', () => {
    it('should upgrade legacy tools to new skills with --force', async () => {
      // Create legacy slash command directory (no skills exist yet)
      const legacyCommandDir = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(legacyCommandDir, { recursive: true });
      await fs.writeFile(
        path.join(legacyCommandDir, 'proposal.md'),
        '<!-- OPENSPEC:START -->\nold command content\n<!-- OPENSPEC:END -->\n'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should show detected tools message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tools detected from legacy artifacts')
      );

      // Should show Claude Code being set up
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude Code')
      );

      // Should show getting started message for newly configured tools,
      // limited to the commands the core profile installs (not new/continue)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting started')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('/openspec-propose')
      );
      const gettingStartedCalls = consoleSpy.mock.calls
        .map((call) => call.map((arg) => String(arg)).join(' '))
        .join('\n');
      expect(gettingStartedCalls).not.toContain('/openspec-new-change');
      expect(gettingStartedCalls).not.toContain('/openspec-continue-change');
      expect(gettingStartedCalls).not.toContain('/opsx:');
      expect(gettingStartedCalls).not.toContain('Restart your IDE');

      // Skills should be created
      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const skillExists = await FileSystemUtils.fileExists(skillFile);
      expect(skillExists).toBe(true);

      // Legacy directory should be deleted
      const legacyDirExists = await FileSystemUtils.directoryExists(legacyCommandDir);
      expect(legacyDirExists).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should upgrade multiple legacy tools with --force', async () => {
      // Create legacy command directories for Claude and Cursor
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.claude', 'commands', 'openspec', 'proposal.md'),
        '<!-- OPENSPEC:START -->\ncontent\n<!-- OPENSPEC:END -->\n'
      );

      await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
        'content'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should detect both tools
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tools detected from legacy artifacts')
      );

      // Both tools have their skills: the one shared copy Cursor reads, and
      // Claude's link to it. Both are listed as set up.
      const claudeSkillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const cursorSkillFile = path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      // Only Claude has files of its own (its links); Cursor gets no commands.
      expect(await fs.readFile(path.join(testDir, '.agents', 'skills', '.openspec-target'), 'utf-8')).toBe('claude own-files\ncursor\n');

      expect(await FileSystemUtils.fileExists(claudeSkillFile)).toBe(true);
      expect(await FileSystemUtils.fileExists(cursorSkillFile)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('sets legacy Antigravity and Codex up in the one shared folder', async () => {
      const antigravityLegacy = path.join(
        testDir,
        '.agent',
        'workflows',
        'openspec-propose.md'
      );
      const codexLegacy = path.join(testDir, '.codex', 'prompts', 'openspec-propose.md');
      await fs.mkdir(path.dirname(antigravityLegacy), { recursive: true });
      await fs.mkdir(path.dirname(codexLegacy), { recursive: true });
      await fs.writeFile(antigravityLegacy, 'legacy Antigravity command');
      await fs.writeFile(codexLegacy, 'legacy Codex prompt');

      await new UpdateCommand({ force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.agents', 'skills');
      expect(await fs.readFile(path.join(skillsDir, '.openspec-target'), 'utf-8')).toBe('antigravity\ncodex\n');
      const proposeSkill = await fs.readFile(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md'),
        'utf-8'
      );
      expect(proposeSkill).toContain('`openspec-apply-change`');
      expect(proposeSkill).not.toMatch(/\$openspec-|\/openspec-/);
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.agents', 'workflows'))).toBe(false);
    });

    it('should not upgrade legacy tools already configured', async () => {
      // Set up a configured Claude tool with skills
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'existing skill'
      );

      // Also create legacy directory (simulating partial upgrade)
      const legacyCommandDir = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(legacyCommandDir, { recursive: true });
      await fs.writeFile(
        path.join(legacyCommandDir, 'proposal.md'),
        '<!-- OPENSPEC:START -->\nold command\n<!-- OPENSPEC:END -->\n'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Legacy cleanup should happen
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed .claude/commands/openspec/')
      );

      // Should NOT show "Tools detected from legacy artifacts" because claude is already configured
      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasDetectedMessage = calls.some(call =>
        call.includes('Tools detected from legacy artifacts')
      );
      expect(hasDetectedMessage).toBe(false);

      // Should update existing skills (not "Getting started" for newly configured)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updated: Claude Code')
      );

      consoleSpy.mockRestore();
    });

    it('should upgrade only unconfigured legacy tools when mixed', async () => {
      // Set up configured Claude tool with skills
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(claudeSkillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(
        path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'),
        'existing skill'
      );

      // Create legacy commands for both Claude (configured) and Cursor (not configured)
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.claude', 'commands', 'openspec', 'proposal.md'),
        '<!-- OPENSPEC:START -->\ncontent\n<!-- OPENSPEC:END -->\n'
      );

      await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'),
        'content'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Should detect Cursor as a legacy tool to upgrade (but not Claude)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tools detected from legacy artifacts')
      );

      // Cursor's skills are the one shared copy
      const cursorSkillFile = path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await FileSystemUtils.fileExists(cursorSkillFile)).toBe(true);

      // Should show "Getting started" for newly configured Cursor
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting started')
      );

      consoleSpy.mockRestore();
    });

    it('should list the skills a custom profile installs', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['new', 'continue', 'apply'],
      });

      const legacyCommandDir = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(legacyCommandDir, { recursive: true });
      await fs.writeFile(
        path.join(legacyCommandDir, 'proposal.md'),
        '<!-- OPENSPEC:START -->\nold command content\n<!-- OPENSPEC:END -->\n'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await new UpdateCommand({ force: true }).execute(testDir);

      const output = consoleSpy.mock.calls
        .map((call) => call.map((arg) => String(arg)).join(' '))
        .join('\n');
      expect(output).toContain('/openspec-new-change');
      expect(output).toContain('/openspec-continue-change');
      expect(output).not.toContain('/openspec-propose');
      expect(output).not.toContain('/opsx:');

      consoleSpy.mockRestore();
    });

    it('should not show getting started message when no new tools configured', async () => {
      // Set up a configured tool (no legacy artifacts)
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'old skill'
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should NOT show "Getting started" message
      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasGettingStarted = calls.some(call =>
        call.includes('Getting started')
      );
      expect(hasGettingStarted).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should create only effective profile skills when upgrading legacy tools', async () => {
      // Create legacy command directory
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.claude', 'commands', 'openspec', 'proposal.md'),
        '<!-- OPENSPEC:START -->\ncontent\n<!-- OPENSPEC:END -->\n'
      );

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Default profile is core, so only core workflows should be generated.
      const skillNames = [
        'openspec-propose',
        'openspec-explore',
        'openspec-apply-change',
        'openspec-sync-specs',
        'openspec-archive-change',
      ];

      const skillsDir = path.join(testDir, '.claude', 'skills');
      for (const skillName of skillNames) {
        const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
        const exists = await FileSystemUtils.fileExists(skillFile);
        expect(exists).toBe(true);
      }

      const nonCoreSkill = path.join(skillsDir, 'openspec-new-change', 'SKILL.md');
      expect(await FileSystemUtils.fileExists(nonCoreSkill)).toBe(false);
    });

    it('should create skills and no commands when upgrading legacy tools', async () => {
      // Create legacy command directory
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.claude', 'commands', 'openspec', 'proposal.md'),
        '<!-- OPENSPEC:START -->\ncontent\n<!-- OPENSPEC:END -->\n'
      );

      // Create update command with force option
      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      // Skills replace the legacy commands; no opsx commands are written.
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.directoryExists(
        path.join(testDir, '.claude', 'commands', 'opsx')
      )).toBe(false);
    });

    it('should not inject non-profile workflows when upgrading legacy tools', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['explore'],
      });

      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.claude', 'commands', 'openspec', 'proposal.md'),
        '<!-- OPENSPEC:START -->\ncontent\n<!-- OPENSPEC:END -->\n'
      );

      const forceUpdateCommand = new UpdateCommand({ force: true });
      await forceUpdateCommand.execute(testDir);

      const skillsDir = path.join(testDir, '.claude', 'skills');
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md')
      )).toBe(false);

      expect(await FileSystemUtils.directoryExists(
        path.join(testDir, '.claude', 'commands', 'opsx')
      )).toBe(false);
    });
  });

  describe('profile-aware updates', () => {
    it('should prune EasyCode profile changes and its generated commands while preserving user files', async () => {
      await new InitCommand({ tools: 'easycode', force: true }).execute(testDir);

      // Commands 1.x generated for the core profile, beside the user's own.
      const coreWorkflows = ['propose', 'explore', 'apply', 'update', 'sync', 'archive'];
      for (const workflow of coreWorkflows) {
        await writeGeneratedCommand(testDir, 'easycode', workflow, coreWorkflows);
      }
      const commandsDir = path.join(testDir, '.easycode', 'commands', 'opsx');
      const skillsDir = path.join(testDir, '.easycode', 'skills');
      const userCommand = path.join(commandsDir, 'personal.toml');
      const userSkill = path.join(skillsDir, 'personal', 'SKILL.md');
      await fs.writeFile(userCommand, 'prompt = "Keep my command"\n');
      await fs.mkdir(path.dirname(userSkill), { recursive: true });
      await fs.writeFile(userSkill, 'Keep my skill');

      setMockConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills', workflows: ['explore', 'new'] });
      await updateCommand.execute(testDir);

      expect(await fs.readdir(commandsDir)).toEqual(['personal.toml']);
      for (const skillName of ['openspec-explore', 'openspec-new-change']) {
        expect(await fs.readFile(path.join(skillsDir, skillName, 'SKILL.md'), 'utf-8')).toContain(`name: ${skillName}`);
      }
      expect(await FileSystemUtils.fileExists(path.join(skillsDir, 'openspec-propose', 'SKILL.md'))).toBe(false);
      expect(await fs.readFile(userCommand, 'utf-8')).toBe('prompt = "Keep my command"\n');
      expect(await fs.readFile(userSkill, 'utf-8')).toBe('Keep my skill');
    });

    it('should sync an AtomCode profile change, remove its generated commands, and preserve custom files', async () => {
      setMockConfig({
        featureFlags: {}, profile: 'custom', delivery: 'both', workflows: ['explore', 'new'],
      });
      await new InitCommand({ tools: 'atomcode', force: true }).execute(testDir);

      const skillsDir = path.join(testDir, '.atomcode', 'skills');
      const commandsDir = path.join(testDir, '.atomcode', 'commands');
      // AtomCode reads the one shared copy of OpenSpec's skills.
      const sharedDir = path.join(testDir, '.agents', 'skills');
      // Commands 1.x generated for that profile, beside the user's own files.
      const generated = [
        await writeGeneratedCommand(testDir, 'atomcode', 'explore', ['explore', 'new']),
        await writeGeneratedCommand(testDir, 'atomcode', 'new', ['explore', 'new']),
      ];
      const customSkill = path.join(skillsDir, 'my-custom-skill', 'SKILL.md');
      const customCommand = path.join(commandsDir, 'opsx-custom.md');
      await fs.mkdir(path.dirname(customSkill), { recursive: true });
      await fs.writeFile(customSkill, 'my custom skill');
      await fs.writeFile(customCommand, 'my custom command');

      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });
      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(sharedDir, 'openspec-new-change', 'SKILL.md')
      )).toBe(false);
      for (const skillName of ['openspec-propose', 'openspec-explore']) {
        expect(await FileSystemUtils.fileExists(path.join(sharedDir, skillName, 'SKILL.md'))).toBe(true);
      }
      for (const file of generated) {
        expect(await FileSystemUtils.fileExists(file)).toBe(false);
      }
      expect(await fs.readdir(commandsDir)).toEqual(['opsx-custom.md']);
      expect(await fs.readFile(customSkill, 'utf-8')).toBe('my custom skill');
      expect(await fs.readFile(customCommand, 'utf-8')).toBe('my custom command');
      expect(getConfiguredToolsForProfileSync(testDir)).toContain('atomcode');

      const consoleSpy = vi.spyOn(console, 'log');
      await updateCommand.execute(testDir);
      expect(consoleSpy.mock.calls.flat().map(String).some((line) => line.includes('up to date')))
        .toBe(true);
    });

    it('should detect an AtomCode commands-only install and move it to skills', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });
      const commandFile = await writeGeneratedCommand(testDir, 'atomcode', 'explore');

      expect(getConfiguredToolsForProfileSync(testDir)).toContain('atomcode');
      expect(scanInstalledWorkflows(testDir, ['atomcode'])).toEqual(['explore']);

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(commandFile)).toBe(false);
      expect(await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8'
      )).toContain('name: openspec-explore');
      expect(getConfiguredToolsForProfileSync(testDir)).toContain('atomcode');
    });

    it('should generate only profile workflows when custom profile is set', async () => {
      // Set custom profile with only explore and new
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['explore', 'new'],
      });

      // Set up a configured tool
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      await updateCommand.execute(testDir);

      // Should create explore and new skills
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-new-change', 'SKILL.md')
      )).toBe(true);

      // Should NOT create non-profile skills
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-apply-change', 'SKILL.md')
      )).toBe(false);
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-propose', 'SKILL.md')
      )).toBe(false);
    });

    it.each(['skills', 'commands', 'both'] as const)(
      'should repair an archive profile missing sync from a 1.x install with %s',
      async (surfaces) => {
        const workflows = ['propose', 'explore', 'apply', 'archive'];
        setMockConfig({ featureFlags: {}, profile: 'custom', delivery: 'both', workflows });

        const archiveSkill = path.join(
          testDir,
          '.claude',
          'skills',
          'openspec-archive-change',
          'SKILL.md'
        );
        let archiveCommand: string | undefined;
        if (surfaces !== 'commands') {
          await fs.mkdir(path.dirname(archiveSkill), { recursive: true });
          await fs.writeFile(archiveSkill, 'old archive skill');
        }
        if (surfaces !== 'skills') {
          archiveCommand = await writeGeneratedCommand(testDir, 'claude', 'archive', workflows);
        }

        const consoleSpy = vi.spyOn(console, 'log');

        await updateCommand.execute(testDir);

        const calls = consoleSpy.mock.calls.map(call =>
          call.map(arg => String(arg)).join(' ')
        );
        expect(calls.some(call =>
          call.includes('Your custom profile is missing 1 core workflow: update')
        )).toBe(true);
        expect(calls.some(call =>
          call.includes('openspec config profile core')
        )).toBe(true);

        // Sync is installed as a skill, never as a command.
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'skills', 'openspec-sync-specs', 'SKILL.md')
        )).toBe(true);
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'commands', 'opsx', 'sync.md')
        )).toBe(false);
        if (archiveCommand) {
          expect(await FileSystemUtils.fileExists(archiveCommand)).toBe(false);
        }

        consoleSpy.mockRestore();
      }
    );

    it('should list a single missing core workflow when custom profile lacks only update', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
      });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      expect(calls.some(call =>
        call.includes('Your custom profile is missing 1 core workflow: update')
      )).toBe(true);
      expect(calls.some(call =>
        call.includes('to add it, or')
      )).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not display a missing-core note when custom profile covers core workflows', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'verify'],
      });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      expect(calls.some(call =>
        call.includes('Your custom profile is missing')
      )).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should name the workflows the core profile leaves out (#1076)', async () => {
      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      // The up-to-date path is where a user chasing a missing command lands:
      // troubleshooting tells them to run `openspec update` first.
      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const note = calls.find(call => call.includes('more workflows are available'));
      expect(note).toBeTruthy();
      for (const workflow of ['new', 'continue', 'ff', 'bulk-archive', 'verify', 'onboard']) {
        expect(note).toContain(workflow);
      }

      consoleSpy.mockRestore();
    });

    it('should not repeat the profile pointer when the missing-core note already gave it', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
      });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      expect(calls.some(call => call.includes('Your custom profile is missing'))).toBe(true);
      expect(calls.some(call => call.includes('more workflows are available'))).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not advertise missing workflows when the profile installs all of them', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: [...ALL_WORKFLOWS],
      });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      expect(calls.some(call => call.includes('more workflows are available'))).toBe(false);
      expect(calls.some(call => call.includes('more workflow is available'))).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should respect skills-only delivery setting', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      await updateCommand.execute(testDir);

      // Skills should be created
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md')
      )).toBe(true);

      // Commands should NOT be created
      const commandsDir = path.join(testDir, '.claude', 'commands', 'opsx');
      expect(await FileSystemUtils.fileExists(
        path.join(commandsDir, 'explore.md')
      )).toBe(false);

      // Skill content should name skills, not commands that were never
      // generated: the shared copy names them plainly.
      const skillContent = await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).not.toContain('/opsx:');
      expect(skillContent).not.toContain('/opsx-');
      expect(skillContent).toContain('`openspec-');

      // update-change references several other workflows; a command missing
      // from the reference map would leave a raw /opsx: reference behind
      const updateSkillContent = await fs.readFile(
        path.join(skillsDir, 'openspec-update-change', 'SKILL.md'),
        'utf-8'
      );
      expect(updateSkillContent).not.toContain('/opsx:');
      expect(updateSkillContent).not.toContain('/opsx-');
      expect(updateSkillContent).toContain('`openspec-');
    });

    it('should install skills even when delivery is set to commands', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      await updateCommand.execute(testDir);

      // The setting is still read but changes nothing: skills, no commands.
      expect(await fs.readFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'), 'utf-8'
      )).toContain('name: openspec-explore');
      expect(await FileSystemUtils.directoryExists(
        path.join(testDir, '.claude', 'commands')
      )).toBe(false);
    });

    it('should be a no-op on second update run for commands-only delivery', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // First run updates commands and removes skills
      await updateCommand.execute(testDir);

      const consoleSpy = vi.spyOn(console, 'log');

      // Second run should report all tools up to date without updating
      await updateCommand.execute(testDir);

      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('up to date'))).toBe(true);
      expect(logCalls.some((entry) => entry.includes('Updating 1 tool(s)'))).toBe(false);

      consoleSpy.mockRestore();
    });

    it.each(['both', 'skills', 'commands'] as const)(
      'should refresh Codex skills and not create global prompts when delivery=%s',
      async (delivery) => {
        setMockConfig({
          featureFlags: {},
          profile: 'core',
          delivery,
        });

        const skillsDir = path.join(testDir, '.agents', 'skills');
        await markCodexTarget(skillsDir);
        await writeReleasedSkill(skillsDir, 'openspec-explore');

        await updateCommand.execute(testDir);

        const skillFile = path.join(skillsDir, 'openspec-explore', 'SKILL.md');
        expect(await FileSystemUtils.fileExists(skillFile)).toBe(true);
        const skillContent = await fs.readFile(skillFile, 'utf-8');
        expect(skillContent).toContain('name: openspec-explore');

        const promptFile = path.join(process.env.CODEX_HOME!, 'prompts', 'opsx-explore.md');
        expect(await FileSystemUtils.fileExists(promptFile)).toBe(false);
      }
    );

    it.each(['both', 'skills'] as const)(
      'should refresh Grok Build skills and preserve user files when delivery=%s',
      async (delivery) => {
        setMockConfig({ featureFlags: {}, profile: 'core', delivery });

        const grokDir = path.join(testDir, '.grok');
        const skillsDir = path.join(grokDir, 'skills');
        const exploreSkill = path.join(skillsDir, 'openspec-explore', 'SKILL.md');
        const userNotes = path.join(skillsDir, 'openspec-explore', 'notes.md');
        const customSkill = path.join(skillsDir, 'my-custom-skill', 'SKILL.md');
        const userConfig = path.join(grokDir, 'settings.json');
        // Grok's own copy from before 2.0, with the user's notes beside it.
        await writeReleasedSkill(skillsDir, 'openspec-explore');
        await fs.writeFile(userNotes, 'my exploration notes');
        await fs.mkdir(path.dirname(customSkill), { recursive: true });
        await fs.writeFile(customSkill, 'my custom skill');
        await fs.writeFile(userConfig, '{"custom":true}\n');

        await updateCommand.execute(testDir);

        // Grok reads the one shared copy; its old SKILL.md is gone so it isn't
        // loaded twice, and the user's notes beside it stay.
        const sharedDir = path.join(testDir, '.agents', 'skills');
        for (const skillName of ['openspec-explore', 'openspec-update-change']) {
          const content = await fs.readFile(path.join(sharedDir, skillName, 'SKILL.md'), 'utf-8');
          expect(content).toContain(`name: ${skillName}`);
          expect(content).toContain('`openspec-');
          expect(content).not.toMatch(/\/opsx[:-]/);
        }
        expect(await FileSystemUtils.fileExists(exploreSkill)).toBe(false);
        expect(await fs.readFile(userNotes, 'utf-8')).toBe('my exploration notes');
        expect(await fs.readFile(customSkill, 'utf-8')).toBe('my custom skill');
        expect(await fs.readFile(userConfig, 'utf-8')).toBe('{"custom":true}\n');
        expect((await fs.readdir(grokDir)).sort()).toEqual(['settings.json', 'skills']);
      }
    );

    it('should sync Grok Build from a custom profile to core without removing unrelated files', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'custom',
        workflows: ['explore', 'new'],
        delivery: 'both',
      });
      await new InitCommand({ tools: 'grok', force: true }).execute(testDir);

      const grokDir = path.join(testDir, '.grok');
      const skillsDir = path.join(grokDir, 'skills');
      const sharedDir = path.join(testDir, '.agents', 'skills');
      const openspecSkills = async () =>
        (await fs.readdir(sharedDir)).filter((name) => name.startsWith('openspec-')).sort();
      expect(await openspecSkills()).toEqual(['openspec-explore', 'openspec-new-change']);
      const customSkill = path.join(skillsDir, 'openspec-custom', 'SKILL.md');
      await fs.mkdir(path.dirname(customSkill), { recursive: true });
      await fs.writeFile(customSkill, 'my custom skill');
      await fs.writeFile(path.join(grokDir, 'notes.md'), 'my Grok notes');

      setMockConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });
      await updateCommand.execute(testDir);

      expect(await openspecSkills()).toEqual([
        'openspec-apply-change',
        'openspec-archive-change',
        'openspec-explore',
        'openspec-propose',
        'openspec-sync-specs',
        'openspec-update-change',
      ]);
      expect(await fs.readdir(skillsDir)).toEqual(['openspec-custom']);
      expect(await fs.readFile(customSkill, 'utf-8')).toBe('my custom skill');
      expect(await fs.readFile(path.join(grokDir, 'notes.md'), 'utf-8')).toBe('my Grok notes');
      expect((await fs.readdir(grokDir)).sort()).toEqual(['notes.md', 'skills']);
    });

    it('should preserve managed global Codex prompts during non-interactive update without force', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      const skillsDir = path.join(testDir, '.agents', 'skills');
      await markCodexTarget(skillsDir);
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const promptDir = path.join(process.env.CODEX_HOME!, 'prompts');
      const managedPrompt = path.join(promptDir, 'opsx-explore.md');
      await fs.mkdir(promptDir, { recursive: true });
      await fs.writeFile(managedPrompt, releasedCodexPrompt('opsx-explore.md'));

      await updateCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(managedPrompt)).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md')
      )).toBe(true);
    });

    it('should refresh global MiniMax Code skills even with commands-only delivery', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const skillFile = path.join(
        testDir,
        'home',
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(skillFile), { recursive: true });
      await fs.writeFile(skillFile, 'existing global skill');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await updateCommand.execute(testDir);

      expect(await fs.readFile(skillFile, 'utf-8')).toContain('name: openspec-explore');
      expect(await FileSystemUtils.directoryExists(path.join(testDir, '.minimax'))).toBe(false);
      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Updated: MiniMax Code');
      consoleSpy.mockRestore();
    });

    it('should keep skills for tools without command adapters under commands-only delivery', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const { AI_TOOLS } = await import('../../src/core/config.js');
      const { resolveCommandSurfaceCapability } = await import('../../src/core/command-surface.js');
      // One with a folder of its own, where a pre-2.0 copy of its skill sits.
      const adapterlessTool = AI_TOOLS.find((tool) =>
        tool.skillsDir && tool.skillsDir !== '.agents' && resolveCommandSurfaceCapability(tool.value) === 'none'
      );
      expect(adapterlessTool).toBeDefined();
      if (!adapterlessTool?.skillsDir) {
        return;
      }

      const skillsDir = path.join(testDir, adapterlessTool.skillsDir, 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');
      await expect(updateCommand.execute(testDir)).resolves.toBeUndefined();

      // The tool keeps its skills (the one shared copy) and stays set up; no
      // "nothing remains" correction is due.
      expect(await fs.readFile(
        path.join(testDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf-8'
      )).toContain('name: openspec-explore');
      expect(getConfiguredToolsForProfileSync(testDir)).toEqual([adapterlessTool.value]);
      const logCalls = consoleSpy.mock.calls.flat().map(String);
      expect(logCalls.some((entry) => entry.includes('No skills or commands remain'))).toBe(false);
    });

    it('should apply config sync when templates are up to date', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'skills',
      });

      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as { version: string };
      await fs.writeFile(
        path.join(skillsDir, 'openspec-explore', 'SKILL.md'),
        `---
name: openspec-explore
metadata:
  generatedBy: "${packageJson.version}"
---
content
`
      );

      const commandsDir = path.join(testDir, '.claude', 'commands', 'opsx');
      await writeGeneratedCommand(testDir, 'claude', 'explore');

      await updateCommand.execute(testDir);

      // Command files should be removed due to delivery change, even though skill version is current
      expect(await FileSystemUtils.fileExists(
        path.join(commandsDir, 'explore.md')
      )).toBe(false);
    });

    it('should detect commands-only tool configuration', async () => {
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'commands',
      });

      const exploreCmd = await writeGeneratedCommand(testDir, 'claude', 'explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should not short-circuit with "No configured tools found"
      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasNoConfiguredMessage = calls.some(call =>
        call.includes('No configured tools found')
      );
      expect(hasNoConfiguredMessage).toBe(false);

      // Skills replace the generated command.
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(exploreCmd)).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should remove workflows outside profile during update sync', async () => {
      // Set core profile (propose, explore, apply, sync, archive)
      setMockConfig({
        featureFlags: {},
        profile: 'core',
        delivery: 'both',
      });

      // Set up tool with extra workflows beyond core profile
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      // Add a non-core workflow
      await writeReleasedSkill(skillsDir, 'openspec-new-change');
      const extraCommandFile = await writeGeneratedCommand(testDir, 'claude', 'new');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Deselected workflow artifacts should be removed for both delivery surfaces.
      expect(await FileSystemUtils.fileExists(
        path.join(skillsDir, 'openspec-new-change', 'SKILL.md')
      )).toBe(false);
      expect(await FileSystemUtils.fileExists(extraCommandFile)).toBe(false);

      // The generated command goes with every other generated command, and
      // the removal is reported.
      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      expect(calls.some(call =>
        call.includes('Removed: 1 command file (OpenSpec 2.0 installs skills only)')
      )).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('new tool detection', () => {
    it('should detect new tool directories not currently configured', async () => {
      // Set up a configured Claude tool
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(claudeSkillsDir, 'openspec-explore');

      // Create a Cursor directory (not configured — no skills)
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      // Should detect Cursor as a new tool
      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasNewToolMessage = calls.some(call =>
        call.includes("Detected new tool: Cursor. Run 'openspec init' to add it.")
      );
      expect(hasNewToolMessage).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should consolidate multiple new tools into one message', async () => {
      // Set up a configured Claude tool
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(claudeSkillsDir, 'openspec-explore');

      // Create two unconfigured tool directories
      await fs.mkdir(path.join(testDir, '.github'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.github', 'copilot-instructions.md'), '');
      await fs.mkdir(path.join(testDir, '.windsurf'), { recursive: true });

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );

      const consolidatedCalls = calls.filter(call =>
        call.includes('Detected new tools:')
      );
      expect(consolidatedCalls).toHaveLength(1);
      expect(consolidatedCalls[0]).toContain('GitHub Copilot');
      expect(consolidatedCalls[0]).toContain('Windsurf');
      expect(consolidatedCalls[0]).toContain("Run 'openspec init' to add them.");

      const repeatedSingularCalls = calls.filter(call =>
        call.includes('Detected new tool:')
      );
      expect(repeatedSingularCalls).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('should not show new tool message when no new tools detected', async () => {
      // Set up a configured tool (only Claude, no other tool directories)
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasNewToolMessage = calls.some(call =>
        call.includes('Detected new tool')
      );
      expect(hasNewToolMessage).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('scanInstalledWorkflows', () => {
    it('should detect installed workflows across tools', async () => {
      // Create skills for Claude
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(claudeSkillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'), 'content');
      await fs.mkdir(path.join(claudeSkillsDir, 'openspec-apply-change'), { recursive: true });
      await fs.writeFile(path.join(claudeSkillsDir, 'openspec-apply-change', 'SKILL.md'), 'content');

      const workflows = scanInstalledWorkflows(testDir, ['claude']);
      expect(workflows).toContain('explore');
      expect(workflows).toContain('apply');
      expect(workflows).not.toContain('propose');
    });

    it('should return union of workflows across multiple tools', async () => {
      // Claude has explore
      const claudeSkillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(claudeSkillsDir, 'openspec-explore'), { recursive: true });
      await fs.writeFile(path.join(claudeSkillsDir, 'openspec-explore', 'SKILL.md'), 'content');

      // Cursor has apply
      const cursorSkillsDir = path.join(testDir, '.cursor', 'skills');
      await fs.mkdir(path.join(cursorSkillsDir, 'openspec-apply-change'), { recursive: true });
      await fs.writeFile(path.join(cursorSkillsDir, 'openspec-apply-change', 'SKILL.md'), 'content');

      const workflows = scanInstalledWorkflows(testDir, ['claude', 'cursor']);
      expect(workflows).toContain('explore');
      expect(workflows).toContain('apply');
    });

    it('should only match workflows in ALL_WORKFLOWS', async () => {
      // Create a custom skill directory that doesn't match any workflow
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await fs.mkdir(path.join(skillsDir, 'my-custom-skill'), { recursive: true });
      await fs.writeFile(path.join(skillsDir, 'my-custom-skill', 'SKILL.md'), 'content');

      const workflows = scanInstalledWorkflows(testDir, ['claude']);
      expect(workflows).toHaveLength(0);
    });

    it('should return empty array when no tools have skills', async () => {
      const workflows = scanInstalledWorkflows(testDir, ['claude']);
      expect(workflows).toHaveLength(0);
    });

    it('should detect installed workflows from managed command files', async () => {
      const commandsDir = path.join(testDir, '.claude', 'commands', 'opsx');
      await fs.mkdir(commandsDir, { recursive: true });
      await fs.writeFile(path.join(commandsDir, 'explore.md'), 'content');

      const workflows = scanInstalledWorkflows(testDir, ['claude']);
      expect(workflows).toContain('explore');
    });
  });

  describe('tools output', () => {
    it('should list affected tools in output', async () => {
      const skillsDir = path.join(testDir, '.claude', 'skills');
      await writeReleasedSkill(skillsDir, 'openspec-explore');

      const consoleSpy = vi.spyOn(console, 'log');

      await updateCommand.execute(testDir);

      const calls = consoleSpy.mock.calls.map(call =>
        call.map(arg => String(arg)).join(' ')
      );
      const hasToolsList = calls.some(call =>
        call.includes('Tools:') && call.includes('Claude Code')
      );
      expect(hasToolsList).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
