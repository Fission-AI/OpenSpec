import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { claudeAdapter } from '../../src/core/command-generation/adapters/claude.js';

vi.mock('../../src/ui/welcome-screen.js', () => ({
  showWelcomeScreen: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: vi.fn(),
}));

describe('Global Init', () => {
  let globalRoot: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    globalRoot = path.join(os.tmpdir(), `openspec-global-test-${Date.now()}`);
    await fs.mkdir(globalRoot, { recursive: true });
    configTempDir = path.join(os.tmpdir(), `openspec-config-global-${Date.now()}`);
    await fs.mkdir(configTempDir, { recursive: true });
    originalEnv = { ...process.env };
    process.env.OPENSPEC_GLOBAL_ROOT = globalRoot;
    process.env.XDG_CONFIG_HOME = configTempDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(globalRoot, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('openspec init --global --tools claude', () => {
    it('should write skills to global path', async () => {
      const initCommand = new InitCommand({ tools: 'claude', global: true });
      await initCommand.executeGlobal();

      const claudeRoot = path.join(globalRoot, 'claude');
      const skillsDir = path.join(claudeRoot, 'skills');
      const skillEntries = await fs.readdir(skillsDir);
      expect(skillEntries.some((e) => e.startsWith('openspec-'))).toBe(true);
    });

    it('should write commands to global path', async () => {
      const initCommand = new InitCommand({ tools: 'claude', global: true });
      await initCommand.executeGlobal();

      const claudeRoot = path.join(globalRoot, 'claude');
      const commandsDir = path.join(claudeRoot, 'commands', 'opsx');
      const cmdEntries = await fs.readdir(commandsDir);
      expect(cmdEntries.some((e) => e.endsWith('.md'))).toBe(true);
    });

    it('should not create openspec/ directory structure', async () => {
      const initCommand = new InitCommand({ tools: 'claude', global: true });
      await initCommand.executeGlobal();

      // No openspec/ should exist in globalRoot
      const entries = await fs.readdir(globalRoot);
      expect(entries).not.toContain('openspec');
    });
  });

  describe('openspec init --global without --tools', () => {
    it('should throw an error requiring --tools', async () => {
      const initCommand = new InitCommand({ global: true });
      await expect(initCommand.executeGlobal()).rejects.toThrow('--tools is required with --global');
    });
  });

  describe('openspec init --global --tools all', () => {
    it('should install for all tools with global support', async () => {
      const initCommand = new InitCommand({ tools: 'all', global: true });
      await initCommand.executeGlobal();

      // Claude, OpenCode, and Codex all have native global support
      // With OPENSPEC_GLOBAL_ROOT set, all adapters get a path — but "all" resolves
      // via getGlobalAdapters() which only returns natively-supported ones
      const entries = await fs.readdir(globalRoot);
      expect(entries).toContain('claude');
      expect(entries).toContain('opencode');
      expect(entries).toContain('codex');
    });
  });

  describe('openspec init --global --tools claude,opencode', () => {
    it('should install for multiple comma-separated tools', async () => {
      const initCommand = new InitCommand({ tools: 'claude,opencode', global: true });
      await initCommand.executeGlobal();

      const entries = await fs.readdir(globalRoot);
      expect(entries).toContain('claude');
      expect(entries).toContain('opencode');
    });
  });

  describe('openspec init --global --tools cursor', () => {
    it('should error when all specified tools lack global support', async () => {
      // With OPENSPEC_GLOBAL_ROOT set, cursor will actually have a path
      // So we need to unset it and use the adapter's native getGlobalRoot which returns null
      delete process.env.OPENSPEC_GLOBAL_ROOT;
      const initCommand = new InitCommand({ tools: 'cursor', global: true });
      await expect(initCommand.executeGlobal()).rejects.toThrow('No tools with global support found');
    });
  });

  describe('openspec init --global --tools claude,cursor (mixed support)', () => {
    it('should install for supported tools and skip unsupported ones', async () => {
      delete process.env.OPENSPEC_GLOBAL_ROOT;
      const initCommand = new InitCommand({ tools: 'claude,cursor', global: true });
      await initCommand.executeGlobal();

      // Claude should be installed at its native global root
      const claudeRoot = claudeAdapter.getGlobalRoot!();
      const skillsDir = path.join(claudeRoot, 'skills');
      const hasSkills = await fs.readdir(skillsDir).then(
        (entries) => entries.some((e) => e.startsWith('openspec-')),
        () => false
      );
      expect(hasSkills).toBe(true);
    });
  });

  describe('openspec init --global --tools (empty)', () => {
    it('should error on empty tools value', async () => {
      const initCommand = new InitCommand({ tools: '', global: true });
      await expect(initCommand.executeGlobal()).rejects.toThrow('--tools requires at least one tool ID');
    });

    it('should error on whitespace-only tools value', async () => {
      const initCommand = new InitCommand({ tools: '  ', global: true });
      await expect(initCommand.executeGlobal()).rejects.toThrow('--tools requires at least one tool ID');
    });
  });

  describe('openspec update --global', () => {
    it('should update globally-installed files', async () => {
      // First install globally
      const initCommand = new InitCommand({ tools: 'claude', global: true });
      await initCommand.executeGlobal();

      // Then update
      const updateCommand = new UpdateCommand({ global: true });
      await updateCommand.executeGlobal();

      // Verify files still exist
      const claudeRoot = path.join(globalRoot, 'claude');
      const skillsDir = path.join(claudeRoot, 'skills');
      const skillEntries = await fs.readdir(skillsDir);
      expect(skillEntries.some((e) => e.startsWith('openspec-'))).toBe(true);
    });

    it('should regenerate content on update', async () => {
      // First install globally
      const initCommand = new InitCommand({ tools: 'claude', global: true });
      await initCommand.executeGlobal();

      // Tamper with a skill file
      const claudeRoot = path.join(globalRoot, 'claude');
      const skillsDir = path.join(claudeRoot, 'skills');
      const skillEntries = await fs.readdir(skillsDir);
      const firstSkill = skillEntries.find((e) => e.startsWith('openspec-'))!;
      const skillFile = path.join(skillsDir, firstSkill, 'SKILL.md');
      await fs.writeFile(skillFile, '# tampered content\n');

      // Update should regenerate
      const updateCommand = new UpdateCommand({ global: true });
      await updateCommand.executeGlobal();

      const content = await fs.readFile(skillFile, 'utf-8');
      expect(content).not.toBe('# tampered content\n');
      expect(content).toContain('---');
    });

    it('should show message when no global files exist', async () => {
      const updateCommand = new UpdateCommand({ global: true });
      await updateCommand.executeGlobal();

      // Should not throw, just show a message
    });
  });
});
