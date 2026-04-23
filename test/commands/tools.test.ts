import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock global config so tests don't depend on real config file
vi.mock('../../src/core/global-config.js', () => ({
  getGlobalConfig: vi.fn(() => ({ profile: 'core', delivery: 'both' })),
  saveGlobalConfig: vi.fn(),
}));

import { registerToolsCommand } from '../../src/commands/tools.js';
import { Command } from 'commander';
import { AI_TOOLS } from '../../src/core/config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Run the tools command programmatically, resolving or rejecting based on
 * process.exit calls and error throws.
 */
async function runToolsCommand(
  args: string[],
  projectDir: string
): Promise<{ exitCode: number | null }> {
  let capturedExitCode: number | null = null;

  const exitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((code?: number | string | null | undefined) => {
      capturedExitCode = typeof code === 'number' ? code : 0;
      throw new Error(`process.exit(${capturedExitCode})`);
    });

  const program = new Command();
  program.exitOverride();
  registerToolsCommand(program);

  try {
    await program.parseAsync(['tools', ...args], {
      from: 'user',
    });
    return { exitCode: 0 };
  } catch (err: any) {
    if (err?.message?.startsWith('process.exit(')) {
      return { exitCode: capturedExitCode };
    }
    // Commander throws on --help and unknown commands
    if (err?.code === 'commander.helpDisplayed' || err?.code === 'commander.unknownOption') {
      return { exitCode: 0 };
    }
    throw err;
  } finally {
    exitSpy.mockRestore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('tools command', () => {
  let testDir: string;
  let configTempDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-tools-cmd-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    configTempDir = path.join(os.tmpdir(), `openspec-config-tools-${Date.now()}`);
    await fs.mkdir(configTempDir, { recursive: true });
    process.env.XDG_CONFIG_HOME = configTempDir;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization guard
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization guard', () => {
    it('exits with code 1 when project is not initialized', async () => {
      // testDir has no openspec/config.yaml
      const result = await runToolsCommand(['--add', 'claude', testDir], testDir);
      expect(result.exitCode).toBe(1);
    });

    it('proceeds when project is initialized (openspec/config.yaml exists)', async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');

      const result = await runToolsCommand(['--add', 'claude', testDir], testDir);
      expect(result.exitCode).toBe(0);
    });

    it('also accepts openspec/config.yml', async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'openspec', 'config.yml'), 'schema: spec-driven\n');

      const result = await runToolsCommand(['--add', 'claude', testDir], testDir);
      expect(result.exitCode).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // --add flag
  // ─────────────────────────────────────────────────────────────────────────

  describe('--add flag', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    });

    it('creates skill and command files for the specified tool', async () => {
      const result = await runToolsCommand(['--add', 'claude', testDir], testDir);
      expect(result.exitCode).toBe(0);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);

      const commandFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
      expect(await fileExists(commandFile)).toBe(true);
    });

    it('supports comma-separated tool list', async () => {
      const result = await runToolsCommand(['--add', 'claude,cursor', testDir], testDir);
      expect(result.exitCode).toBe(0);

      const claudeSkill = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const cursorSkill = path.join(testDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(claudeSkill)).toBe(true);
      expect(await fileExists(cursorSkill)).toBe(true);
    });

    it('exits with code 1 for an unknown tool ID', async () => {
      const result = await runToolsCommand(['--add', 'totally-unknown-tool', testDir], testDir);
      expect(result.exitCode).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // --remove flag
  // ─────────────────────────────────────────────────────────────────────────

  describe('--remove flag', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    });

    it('removes OpenSpec skill and command files', async () => {
      // First add, then remove
      await runToolsCommand(['--add', 'claude', testDir], testDir);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(skillFile)).toBe(true);

      const result = await runToolsCommand(['--remove', 'claude', testDir], testDir);
      expect(result.exitCode).toBe(0);

      expect(await fileExists(skillFile)).toBe(false);
    });

    it('leaves the tool directory intact after removal', async () => {
      await runToolsCommand(['--add', 'claude', testDir], testDir);

      // Add a non-OpenSpec file
      const customFile = path.join(testDir, '.claude', 'custom.md');
      await fs.writeFile(customFile, '# Custom\n');

      await runToolsCommand(['--remove', 'claude', testDir], testDir);

      expect(await directoryExists(path.join(testDir, '.claude'))).toBe(true);
      expect(await fileExists(customFile)).toBe(true);
    });

    it('is safe when the tool was never configured (no-op)', async () => {
      const result = await runToolsCommand(['--remove', 'claude', testDir], testDir);
      expect(result.exitCode).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // --add and --remove together (no overlap)
  // ─────────────────────────────────────────────────────────────────────────

  describe('--add and --remove together', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    });

    it('adds and removes non-overlapping tools in one pass', async () => {
      // Pre-configure windsurf so we can remove it
      await runToolsCommand(['--add', 'windsurf', testDir], testDir);

      const windsurfSkill = path.join(testDir, '.windsurf', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(windsurfSkill)).toBe(true);

      // Now add claude and remove windsurf
      const result = await runToolsCommand(
        ['--add', 'claude', '--remove', 'windsurf', testDir],
        testDir
      );
      expect(result.exitCode).toBe(0);

      const claudeSkill = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      expect(await fileExists(claudeSkill)).toBe(true);
      expect(await fileExists(windsurfSkill)).toBe(false);
    });

    it('exits with code 1 when the same tool appears in both --add and --remove', async () => {
      const result = await runToolsCommand(
        ['--add', 'claude', '--remove', 'claude', testDir],
        testDir
      );
      expect(result.exitCode).toBe(1);
    });
  });
});
