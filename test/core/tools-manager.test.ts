import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock global config so tests don't depend on real config file
vi.mock('../../src/core/global-config.js', () => ({
  getGlobalConfig: vi.fn(() => ({ profile: 'core', delivery: 'both' })),
  saveGlobalConfig: vi.fn(),
}));

import {
  addTool,
  removeTool,
  getCurrentToolIds,
  getEligibleTools,
  resolveToolsArg,
  removeOpenSpecSkillDirs,
  removeOpenSpecCommandFiles,
} from '../../src/core/tools-manager.js';
import { AI_TOOLS } from '../../src/core/config.js';
import { SKILL_NAMES } from '../../src/core/shared/index.js';

// Helper utilities
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

describe('tools-manager', () => {
  let testDir: string;
  let configTempDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-tm-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    configTempDir = path.join(os.tmpdir(), `openspec-config-tm-${Date.now()}`);
    await fs.mkdir(configTempDir, { recursive: true });
    process.env.XDG_CONFIG_HOME = configTempDir;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addTool
  // ─────────────────────────────────────────────────────────────────────────

  describe('addTool', () => {
    it('creates skill files for claude', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      // Core profile includes 'propose', 'explore', 'apply', 'archive'
      const expectedSkillDirs = [
        'openspec-propose',
        'openspec-explore',
        'openspec-apply-change',
        'openspec-archive-change',
      ];
      for (const dirName of expectedSkillDirs) {
        const skillFile = path.join(testDir, '.claude', 'skills', dirName, 'SKILL.md');
        expect(await fileExists(skillFile)).toBe(true);
      }
    });

    it('creates the skillsDir if it does not exist', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'cursor')!;
      expect(await directoryExists(path.join(testDir, '.cursor'))).toBe(false);

      await addTool(testDir, tool);

      expect(await directoryExists(path.join(testDir, '.cursor'))).toBe(true);
    });

    it('creates command files for claude', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const commandFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
      expect(await fileExists(commandFile)).toBe(true);
    });

    it('skill files have valid YAML frontmatter', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name:');
      expect(content).toContain('description:');
      expect(content).toContain('generatedBy:');
    });

    it('throws for a tool without skillsDir', async () => {
      const tool = AI_TOOLS.find((t) => !t.skillsDir);
      if (!tool) return; // Skip if all tools have skillsDir

      await expect(addTool(testDir, tool)).rejects.toThrow(
        /does not support skill generation/
      );
    });

    it('is idempotent: re-running overwrites existing files', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      await fs.writeFile(skillFile, '# Modified\n');

      await addTool(testDir, tool);

      const content = await fs.readFile(skillFile, 'utf-8');
      expect(content).not.toBe('# Modified\n');
      expect(content).toMatch(/^---\n/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // removeTool
  // ─────────────────────────────────────────────────────────────────────────

  describe('removeTool', () => {
    it('removes OpenSpec skill dirs for a configured tool', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      expect(await directoryExists(skillDir)).toBe(true);

      await removeTool(testDir, tool);

      expect(await directoryExists(skillDir)).toBe(false);
    });

    it('removes OpenSpec command files for a configured tool', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const commandFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
      expect(await fileExists(commandFile)).toBe(true);

      await removeTool(testDir, tool);

      expect(await fileExists(commandFile)).toBe(false);
    });

    it('leaves the skillsDir itself intact', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const dotClaudeDir = path.join(testDir, '.claude');
      await removeTool(testDir, tool);

      expect(await directoryExists(dotClaudeDir)).toBe(true);
    });

    it('leaves non-OpenSpec files in the tool directory intact', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      // Add a custom non-OpenSpec file
      const customFile = path.join(testDir, '.claude', 'my-custom-prompt.md');
      await fs.writeFile(customFile, '# My custom prompt\n');

      await removeTool(testDir, tool);

      expect(await fileExists(customFile)).toBe(true);
    });

    it('returns correct removal counts', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const counts = await removeTool(testDir, tool);

      // Core profile creates 4 skills (propose, explore, apply, archive)
      expect(counts.removedSkillCount).toBeGreaterThan(0);
      expect(counts.removedCommandCount).toBeGreaterThan(0);
    });

    it('is safe on unconfigured tool (no-op)', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      const counts = await removeTool(testDir, tool);
      expect(counts.removedSkillCount).toBe(0);
      expect(counts.removedCommandCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // removeOpenSpecSkillDirs
  // ─────────────────────────────────────────────────────────────────────────

  describe('removeOpenSpecSkillDirs', () => {
    it('only removes openspec-* named dirs', async () => {
      const skillsDir = path.join(testDir, 'skills');
      await fs.mkdir(path.join(skillsDir, 'openspec-explore'), { recursive: true });
      await fs.mkdir(path.join(skillsDir, 'my-custom-skill'), { recursive: true });

      await removeOpenSpecSkillDirs(skillsDir);

      expect(await directoryExists(path.join(skillsDir, 'openspec-explore'))).toBe(false);
      expect(await directoryExists(path.join(skillsDir, 'my-custom-skill'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCurrentToolIds
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCurrentToolIds', () => {
    it('returns empty set when no tools are configured', () => {
      const ids = getCurrentToolIds(testDir);
      expect(ids.size).toBe(0);
    });

    it('returns configured tool IDs after addTool', async () => {
      const tool = AI_TOOLS.find((t) => t.value === 'claude')!;
      await addTool(testDir, tool);

      const ids = getCurrentToolIds(testDir);
      expect(ids.has('claude')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getEligibleTools
  // ─────────────────────────────────────────────────────────────────────────

  describe('getEligibleTools', () => {
    it('returns only tools with a skillsDir', () => {
      const eligible = getEligibleTools();
      for (const tool of eligible) {
        expect(tool.skillsDir).toBeTruthy();
      }
    });

    it('includes common tools like claude and cursor', () => {
      const eligible = getEligibleTools();
      const ids = eligible.map((t) => t.value);
      expect(ids).toContain('claude');
      expect(ids).toContain('cursor');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // resolveToolsArg
  // ─────────────────────────────────────────────────────────────────────────

  describe('resolveToolsArg', () => {
    it('"all" returns every eligible tool', () => {
      const all = resolveToolsArg('all');
      const eligible = getEligibleTools().map((t) => t.value);
      expect(all).toEqual(eligible);
    });

    it('"none" returns empty array', () => {
      expect(resolveToolsArg('none')).toEqual([]);
    });

    it('comma-separated list is parsed correctly', () => {
      expect(resolveToolsArg('claude,cursor')).toEqual(['claude', 'cursor']);
    });

    it('whitespace around IDs is trimmed', () => {
      expect(resolveToolsArg(' claude , cursor ')).toEqual(['claude', 'cursor']);
    });

    it('deduplicates IDs', () => {
      expect(resolveToolsArg('claude,claude')).toEqual(['claude']);
    });

    it('throws for unknown tool IDs', () => {
      expect(() => resolveToolsArg('totally-unknown-tool')).toThrow(/Invalid tool/);
    });

    it('throws when mixing "all" with specific IDs', () => {
      expect(() => resolveToolsArg('all,claude')).toThrow(/Cannot combine/);
    });

    it('throws for empty string', () => {
      expect(() => resolveToolsArg('')).toThrow();
    });
  });
});
