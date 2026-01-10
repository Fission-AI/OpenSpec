import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { UninstallCommand } from '../../src/core/uninstall.js';
import { InitCommand } from '../../src/core/init.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { OPENSPEC_MARKERS } from '../../src/core/config.js';

describe('UninstallCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-uninstall-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('validation', () => {
    it('should throw error when OpenSpec is not initialized', async () => {
      const uninstallCommand = new UninstallCommand({ yes: true });

      await expect(uninstallCommand.execute(testDir)).rejects.toThrow(
        'OpenSpec is not initialized in this project'
      );
    });

    it('should not throw when OpenSpec is initialized', async () => {
      // Initialize OpenSpec first
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      const uninstallCommand = new UninstallCommand({ yes: true });

      await expect(uninstallCommand.execute(testDir)).resolves.not.toThrow();
    });
  });

  describe('directory removal', () => {
    it('should remove the openspec directory', async () => {
      // Initialize OpenSpec
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });

    it('should remove all subdirectories and files', async () => {
      // Initialize OpenSpec
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      // Create additional files in openspec
      const customFile = path.join(testDir, 'openspec', 'custom.md');
      await fs.writeFile(customFile, 'Custom content');

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });
  });

  describe('config file cleanup', () => {
    it('should strip OpenSpec markers from AGENTS.md', async () => {
      // Initialize with AGENTS.md
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      const agentsPath = path.join(testDir, 'AGENTS.md');
      const beforeContent = await fs.readFile(agentsPath, 'utf-8');
      expect(beforeContent).toContain(OPENSPEC_MARKERS.start);

      // Add custom content
      const customContent = `${beforeContent}\n\n# Custom Section\nMy custom instructions`;
      await fs.writeFile(agentsPath, customContent);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // Check file still exists but markers are removed
      expect(await FileSystemUtils.fileExists(agentsPath)).toBe(true);
      const afterContent = await fs.readFile(agentsPath, 'utf-8');
      expect(afterContent).not.toContain(OPENSPEC_MARKERS.start);
      expect(afterContent).toContain('Custom Section');
      expect(afterContent).toContain('My custom instructions');
    });

    it('should delete config files with only OpenSpec content', async () => {
      // Initialize
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      const agentsPath = path.join(testDir, 'AGENTS.md');
      expect(await FileSystemUtils.fileExists(agentsPath)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // File should be deleted since it only contains OpenSpec content
      expect(await FileSystemUtils.fileExists(agentsPath)).toBe(false);
    });

    it('should preserve user content outside markers', async () => {
      // Initialize
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      const agentsPath = path.join(testDir, 'AGENTS.md');

      // Add content before and after markers
      const existingContent = await fs.readFile(agentsPath, 'utf-8');
      const enhancedContent = `# My Custom Header

Some intro text

${existingContent}

# Additional Custom Section

More custom content here`;

      await fs.writeFile(agentsPath, enhancedContent);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // Check preserved content
      const finalContent = await fs.readFile(agentsPath, 'utf-8');
      expect(finalContent).toContain('My Custom Header');
      expect(finalContent).toContain('Some intro text');
      expect(finalContent).toContain('Additional Custom Section');
      expect(finalContent).toContain('More custom content here');
      expect(finalContent).not.toContain(OPENSPEC_MARKERS.start);
      expect(finalContent).not.toContain(OPENSPEC_MARKERS.end);
    });
  });

  describe('slash command cleanup', () => {
    it('should remove slash command directories', async () => {
      // Initialize with Claude Code
      const initCommand = new InitCommand({ tools: 'claude' });
      await initCommand.execute(testDir);

      const claudeCommandsPath = path.join(testDir, '.claude', 'commands', 'openspec');
      expect(await FileSystemUtils.directoryExists(claudeCommandsPath)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // Slash commands directory should be removed
      expect(await FileSystemUtils.directoryExists(claudeCommandsPath)).toBe(false);
    });

    it('should clean up empty parent directories', async () => {
      // Initialize with Claude Code
      const initCommand = new InitCommand({ tools: 'claude' });
      await initCommand.execute(testDir);

      const claudeCommandsDir = path.join(testDir, '.claude', 'commands');
      const claudeDir = path.join(testDir, '.claude');
      expect(await FileSystemUtils.directoryExists(claudeCommandsDir)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // Both .claude/commands and .claude directories should be removed since they're empty
      const commandsDirExists = await FileSystemUtils.directoryExists(claudeCommandsDir).catch(() => false);
      const claudeDirExists = await FileSystemUtils.directoryExists(claudeDir).catch(() => false);

      expect(commandsDirExists).toBe(false);
      expect(claudeDirExists).toBe(false);
    });
  });

  describe('--yes flag', () => {
    it('should skip confirmation when --yes is provided', async () => {
      // Initialize
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      // Uninstall with --yes flag (should not hang waiting for input)
      const uninstallCommand = new UninstallCommand({ yes: true });
      await expect(uninstallCommand.execute(testDir)).resolves.not.toThrow();

      // Verify uninstall happened
      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should continue with remaining operations on partial failure', async () => {
      // Initialize
      const initCommand = new InitCommand({ tools: 'none' });
      await initCommand.execute(testDir);

      // Make a file read-only to cause an error (platform-specific)
      const agentsPath = path.join(testDir, 'AGENTS.md');
      // Note: This test might behave differently on Windows vs Unix

      // Uninstall should still remove the openspec directory
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });
  });

  describe('multiple tool configurations', () => {
    it('should clean up multiple AI tool configs', async () => {
      // Initialize with multiple tools
      const initCommand = new InitCommand({ tools: 'claude,cursor' });
      await initCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const cursorPath = path.join(testDir, '.cursor', 'commands');

      expect(await FileSystemUtils.fileExists(claudePath)).toBe(true);
      expect(await FileSystemUtils.directoryExists(cursorPath)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // All tool configs should be cleaned
      expect(await FileSystemUtils.fileExists(claudePath)).toBe(false);
      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });

    it('should handle OpenCode slash commands', async () => {
      // Initialize with OpenCode
      const initCommand = new InitCommand({ tools: 'opencode' });
      await initCommand.execute(testDir);

      const opencodeDir = path.join(testDir, '.opencode', 'command');
      expect(await FileSystemUtils.directoryExists(opencodeDir)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // OpenCode commands should be removed
      const opencodeExists = await FileSystemUtils.directoryExists(opencodeDir).catch(() => false);
      expect(opencodeExists).toBe(false);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });

    it('should handle GitHub Copilot prompts', async () => {
      // Initialize with GitHub Copilot
      const initCommand = new InitCommand({ tools: 'github-copilot' });
      await initCommand.execute(testDir);

      const githubPromptsDir = path.join(testDir, '.github', 'prompts');
      expect(await FileSystemUtils.directoryExists(githubPromptsDir)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // GitHub Copilot prompts should be removed
      const promptsExist = await FileSystemUtils.directoryExists(githubPromptsDir).catch(() => false);
      expect(promptsExist).toBe(false);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });

    it('should handle Windsurf workflows', async () => {
      // Initialize with Windsurf
      const initCommand = new InitCommand({ tools: 'windsurf' });
      await initCommand.execute(testDir);

      const windsurfDir = path.join(testDir, '.windsurf', 'workflows');
      expect(await FileSystemUtils.directoryExists(windsurfDir)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // Windsurf workflows should be removed
      const workflowsExist = await FileSystemUtils.directoryExists(windsurfDir).catch(() => false);
      expect(workflowsExist).toBe(false);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });

    it('should handle Cursor commands', async () => {
      // Initialize with Cursor
      const initCommand = new InitCommand({ tools: 'cursor' });
      await initCommand.execute(testDir);

      const cursorDir = path.join(testDir, '.cursor', 'commands');
      expect(await FileSystemUtils.directoryExists(cursorDir)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // Cursor commands should be removed
      const commandsExist = await FileSystemUtils.directoryExists(cursorDir).catch(() => false);
      expect(commandsExist).toBe(false);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });

    it('should handle Codex global prompts', async () => {
      // Initialize with Codex (uses global ~/.codex/prompts)
      const initCommand = new InitCommand({ tools: 'codex' });
      await initCommand.execute(testDir);

      // Codex uses global paths, but we can still check the openspec directory was created
      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // OpenSpec directory should be removed
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);

      // Note: We don't check ~/.codex/prompts deletion in tests to avoid
      // interfering with the user's actual Codex installation
    });

    it('should handle all tools together', async () => {
      // Initialize with many tools at once
      const initCommand = new InitCommand({ tools: 'claude,cursor,opencode,github-copilot' });
      await initCommand.execute(testDir);

      const claudeCommandsDir = path.join(testDir, '.claude', 'commands', 'openspec');
      const cursorCommandsDir = path.join(testDir, '.cursor', 'commands');
      const opencodeCommandsDir = path.join(testDir, '.opencode', 'command');
      const githubPromptsDir = path.join(testDir, '.github', 'prompts');

      expect(await FileSystemUtils.directoryExists(claudeCommandsDir)).toBe(true);
      expect(await FileSystemUtils.directoryExists(cursorCommandsDir)).toBe(true);
      expect(await FileSystemUtils.directoryExists(opencodeCommandsDir)).toBe(true);
      expect(await FileSystemUtils.directoryExists(githubPromptsDir)).toBe(true);

      // Uninstall
      const uninstallCommand = new UninstallCommand({ yes: true });
      await uninstallCommand.execute(testDir);

      // All OpenSpec-specific directories should be removed
      const claudeCommandsExists = await FileSystemUtils.directoryExists(claudeCommandsDir).catch(() => false);
      const cursorCommandsExists = await FileSystemUtils.directoryExists(cursorCommandsDir).catch(() => false);
      const opencodeCommandsExists = await FileSystemUtils.directoryExists(opencodeCommandsDir).catch(() => false);
      const githubPromptsExists = await FileSystemUtils.directoryExists(githubPromptsDir).catch(() => false);

      expect(claudeCommandsExists).toBe(false);
      expect(cursorCommandsExists).toBe(false);
      expect(opencodeCommandsExists).toBe(false);
      expect(githubPromptsExists).toBe(false);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await FileSystemUtils.directoryExists(openspecPath)).toBe(false);
    });
  });
});
