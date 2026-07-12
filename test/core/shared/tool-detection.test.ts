import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  SKILL_NAMES,
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  extractGeneratedByVersion,
  getToolVersionStatus,
  getConfiguredTools,
  getAllToolVersionStatus,
  resolveSkillsDir,
  resolveMarkerDir,
} from '../../../src/core/shared/tool-detection.js';
import { AI_TOOLS } from '../../../src/core/config.js';

describe('tool-detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('SKILL_NAMES', () => {
    it('should contain all skill names matching COMMAND_IDS', () => {
      expect(SKILL_NAMES).toHaveLength(12);
      expect(SKILL_NAMES).toContain('openspec-explore');
      expect(SKILL_NAMES).toContain('openspec-new-change');
      expect(SKILL_NAMES).toContain('openspec-continue-change');
      expect(SKILL_NAMES).toContain('openspec-apply-change');
      expect(SKILL_NAMES).toContain('openspec-update-change');
      expect(SKILL_NAMES).toContain('openspec-ff-change');
      expect(SKILL_NAMES).toContain('openspec-sync-specs');
      expect(SKILL_NAMES).toContain('openspec-archive-change');
      expect(SKILL_NAMES).toContain('openspec-bulk-archive-change');
      expect(SKILL_NAMES).toContain('openspec-verify-change');
      expect(SKILL_NAMES).toContain('openspec-onboard');
      expect(SKILL_NAMES).toContain('openspec-propose');
    });
  });

  describe('getToolsWithSkillsDir', () => {
    it('should return tools that have skillsDir configured', () => {
      const tools = getToolsWithSkillsDir();
      expect(tools).toContain('claude');
      expect(tools).toContain('cursor');
      expect(tools).toContain('windsurf');
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('getToolSkillStatus', () => {
    it('should return not configured for unknown tool', () => {
      const status = getToolSkillStatus(testDir, 'unknown-tool');
      expect(status.configured).toBe(false);
      expect(status.fullyConfigured).toBe(false);
      expect(status.skillCount).toBe(0);
    });

    it('should return not configured when no skills exist', () => {
      const status = getToolSkillStatus(testDir, 'claude');
      expect(status.configured).toBe(false);
      expect(status.fullyConfigured).toBe(false);
      expect(status.skillCount).toBe(0);
    });

    it('should detect when one skill exists', async () => {
      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'test content');

      const status = getToolSkillStatus(testDir, 'claude');
      expect(status.configured).toBe(true);
      expect(status.fullyConfigured).toBe(false);
      expect(status.skillCount).toBe(1);
    });

    it('should detect when all skills exist', async () => {
      for (const skillName of SKILL_NAMES) {
        const skillDir = path.join(testDir, '.claude', 'skills', skillName);
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'test content');
      }

      const status = getToolSkillStatus(testDir, 'claude');
      expect(status.configured).toBe(true);
      expect(status.fullyConfigured).toBe(true);
      expect(status.skillCount).toBe(SKILL_NAMES.length);
    });
  });

  describe('getToolStates', () => {
    it('should return status for all tools with skillsDir', () => {
      const states = getToolStates(testDir);
      expect(states.has('claude')).toBe(true);
      expect(states.has('cursor')).toBe(true);

      const claudeStatus = states.get('claude');
      expect(claudeStatus?.configured).toBe(false);
    });

    it('should detect configured tools', async () => {
      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'test content');

      const states = getToolStates(testDir);
      expect(states.get('claude')?.configured).toBe(true);
      expect(states.get('cursor')?.configured).toBe(false);
    });
  });

  describe('extractGeneratedByVersion', () => {
    it('should return null for non-existent file', () => {
      const version = extractGeneratedByVersion(path.join(testDir, 'missing.md'));
      expect(version).toBeNull();
    });

    it('should return null when generatedBy is not present', async () => {
      const filePath = path.join(testDir, 'skill.md');
      await fs.writeFile(filePath, `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
---

Content here
`);

      const version = extractGeneratedByVersion(filePath);
      expect(version).toBeNull();
    });

    it('should extract generatedBy version with double quotes', async () => {
      const filePath = path.join(testDir, 'skill.md');
      await fs.writeFile(filePath, `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "0.23.0"
---

Content here
`);

      const version = extractGeneratedByVersion(filePath);
      expect(version).toBe('0.23.0');
    });

    it('should extract generatedBy version with single quotes', async () => {
      const filePath = path.join(testDir, 'skill.md');
      await fs.writeFile(filePath, `---
name: openspec-explore
metadata:
  generatedBy: '0.24.0'
---

Content here
`);

      const version = extractGeneratedByVersion(filePath);
      expect(version).toBe('0.24.0');
    });

    it('should extract generatedBy version without quotes', async () => {
      const filePath = path.join(testDir, 'skill.md');
      await fs.writeFile(filePath, `---
name: openspec-explore
metadata:
  generatedBy: 0.25.0
---

Content here
`);

      const version = extractGeneratedByVersion(filePath);
      expect(version).toBe('0.25.0');
    });
  });

  describe('getToolVersionStatus', () => {
    it('should return not configured for unknown tool', () => {
      const status = getToolVersionStatus(testDir, 'unknown-tool', '0.23.0');
      expect(status.configured).toBe(false);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(false);
    });

    it('should return not configured when no skills exist', () => {
      const status = getToolVersionStatus(testDir, 'claude', '0.23.0');
      expect(status.configured).toBe(false);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(false);
    });

    it('should detect needsUpdate when generatedBy is missing', async () => {
      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
---

Content here
`);

      const status = getToolVersionStatus(testDir, 'claude', '0.23.0');
      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(true);
    });

    it('should detect needsUpdate when version differs', async () => {
      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "0.22.0"
---

Content here
`);

      const status = getToolVersionStatus(testDir, 'claude', '0.23.0');
      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBe('0.22.0');
      expect(status.needsUpdate).toBe(true);
    });

    it('should not need update when version matches', async () => {
      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), `---
name: openspec-explore
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "0.23.0"
---

Content here
`);

      const status = getToolVersionStatus(testDir, 'claude', '0.23.0');
      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBe('0.23.0');
      expect(status.needsUpdate).toBe(false);
    });

    it('should include tool name in status', async () => {
      const skillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'content');

      const status = getToolVersionStatus(testDir, 'claude', '0.23.0');
      expect(status.toolId).toBe('claude');
      expect(status.toolName).toBe('Claude Code');
    });
  });

  describe('getConfiguredTools', () => {
    it('should return empty array when no tools are configured', () => {
      const tools = getConfiguredTools(testDir);
      expect(tools).toEqual([]);
    });

    it('should return configured tools', async () => {
      // Setup Claude
      const claudeSkillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(claudeSkillDir, { recursive: true });
      await fs.writeFile(path.join(claudeSkillDir, 'SKILL.md'), 'content');

      // Setup Cursor
      const cursorSkillDir = path.join(testDir, '.cursor', 'skills', 'openspec-explore');
      await fs.mkdir(cursorSkillDir, { recursive: true });
      await fs.writeFile(path.join(cursorSkillDir, 'SKILL.md'), 'content');

      const tools = getConfiguredTools(testDir);
      expect(tools).toContain('claude');
      expect(tools).toContain('cursor');
      expect(tools).toHaveLength(2);
    });
  });

  describe('getAllToolVersionStatus', () => {
    it('should return empty array when no tools are configured', () => {
      const statuses = getAllToolVersionStatus(testDir, '0.23.0');
      expect(statuses).toEqual([]);
    });

    it('should return version status for all configured tools', async () => {
      // Setup Claude with old version
      const claudeSkillDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
      await fs.mkdir(claudeSkillDir, { recursive: true });
      await fs.writeFile(path.join(claudeSkillDir, 'SKILL.md'), `---
metadata:
  generatedBy: "0.22.0"
---
`);

      // Setup Cursor with current version
      const cursorSkillDir = path.join(testDir, '.cursor', 'skills', 'openspec-explore');
      await fs.mkdir(cursorSkillDir, { recursive: true });
      await fs.writeFile(path.join(cursorSkillDir, 'SKILL.md'), `---
metadata:
  generatedBy: "0.23.0"
---
`);

      const statuses = getAllToolVersionStatus(testDir, '0.23.0');
      expect(statuses).toHaveLength(2);

      const claudeStatus = statuses.find(s => s.toolId === 'claude');
      expect(claudeStatus?.generatedByVersion).toBe('0.22.0');
      expect(claudeStatus?.needsUpdate).toBe(true);

      const cursorStatus = statuses.find(s => s.toolId === 'cursor');
      expect(cursorStatus?.generatedByVersion).toBe('0.23.0');
      expect(cursorStatus?.needsUpdate).toBe(false);
    });
  });

  describe('resolveSkillsDir', () => {
    it('should return project-local path for tools without installDir', () => {
      const claude = AI_TOOLS.find(t => t.value === 'claude')!;
      const result = resolveSkillsDir(claude, '/project');
      expect(result).toBe(path.join('/project', '.claude', 'skills'));
    });

    it('should expand ~ to home directory for global-install tools', () => {
      const hermes = AI_TOOLS.find(t => t.value === 'hermes')!;
      const result = resolveSkillsDir(hermes, '/project');
      expect(result).toBe(path.resolve(path.join(os.homedir(), '.hermes', 'skills')));
      expect(result).not.toContain('~');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should ignore projectRoot for global-install tools', () => {
      const hermes = AI_TOOLS.find(t => t.value === 'hermes')!;
      const result = resolveSkillsDir(hermes, '/some/other/project');
      const expected = path.resolve(path.join(os.homedir(), '.hermes', 'skills'));
      expect(result).toBe(expected);
    });
  });

  describe('resolveMarkerDir', () => {
    it('should return project-local path for all tools', () => {
      const hermes = AI_TOOLS.find(t => t.value === 'hermes')!;
      const result = resolveMarkerDir(hermes, '/project');
      expect(result).toBe(path.join('/project', '.hermes', 'skills'));
    });

    it('should return project-local path for tools without installDir', () => {
      const claude = AI_TOOLS.find(t => t.value === 'claude')!;
      const result = resolveMarkerDir(claude, '/project');
      expect(result).toBe(path.join('/project', '.claude', 'skills'));
    });
  });

  describe('getToolSkillStatus (Hermes global-install)', () => {
    let fakeHome: string;
    let homedirSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      // Redirect os.homedir() to a temp dir so the global ~/.hermes/skills
      // path is fully under our control (deterministic skill counts).
      fakeHome = path.join(os.tmpdir(), `openspec-hermes-home-${randomUUID()}`);
      await fs.mkdir(fakeHome, { recursive: true });
      homedirSpy = vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);
    });

    afterEach(async () => {
      homedirSpy.mockRestore();
      await fs.rm(fakeHome, { recursive: true, force: true });
    });

    /**
     * Create a SKILL.md fixture with the given generatedBy version in the
     * fake global ~/.hermes/skills directory.
     */
    async function createGlobalSkill(skillName: string, generatedBy?: string): Promise<void> {
      const skillFile = path.join(fakeHome, '.hermes', 'skills', skillName, 'SKILL.md');
      await fs.mkdir(path.dirname(skillFile), { recursive: true });
      const frontmatter = generatedBy
        ? `---\nmetadata:\n  generatedBy: "${generatedBy}"\n---\n`
        : `---\n---\n`;
      await fs.writeFile(skillFile, frontmatter, 'utf-8');
    }

    it('should return not configured when marker directory does not exist', () => {
      const status = getToolSkillStatus(testDir, 'hermes');
      expect(status.configured).toBe(false);
      expect(status.fullyConfigured).toBe(false);
      expect(status.skillCount).toBe(0);
    });

    it('should return configured with exact skillCount when marker and global skills exist', async () => {
      // Marker directory (project-local)
      await fs.mkdir(path.join(testDir, '.hermes', 'skills'), { recursive: true });
      // Two global skills
      await createGlobalSkill('openspec-explore', '1.6.0');
      await createGlobalSkill('openspec-new-change', '1.6.0');

      const status = getToolSkillStatus(testDir, 'hermes');
      expect(status.configured).toBe(true);
      expect(status.skillCount).toBe(2);
      expect(status.fullyConfigured).toBe(false);
    });

    it('should return fullyConfigured when all skills exist globally', async () => {
      await fs.mkdir(path.join(testDir, '.hermes', 'skills'), { recursive: true });
      for (const skillName of SKILL_NAMES) {
        await createGlobalSkill(skillName, '1.6.0');
      }

      const status = getToolSkillStatus(testDir, 'hermes');
      expect(status.configured).toBe(true);
      expect(status.skillCount).toBe(SKILL_NAMES.length);
      expect(status.fullyConfigured).toBe(true);
    });

    it('should return configured with zero skills when marker exists but global is empty', async () => {
      await fs.mkdir(path.join(testDir, '.hermes', 'skills'), { recursive: true });

      const status = getToolSkillStatus(testDir, 'hermes');
      expect(status.configured).toBe(true);
      expect(status.skillCount).toBe(0);
      expect(status.fullyConfigured).toBe(false);
    });
  });

  describe('getToolVersionStatus (Hermes global-install)', () => {
    let fakeHome: string;
    let homedirSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      fakeHome = path.join(os.tmpdir(), `openspec-hermes-home-${randomUUID()}`);
      await fs.mkdir(fakeHome, { recursive: true });
      homedirSpy = vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);
    });

    afterEach(async () => {
      homedirSpy.mockRestore();
      await fs.rm(fakeHome, { recursive: true, force: true });
    });

    async function createGlobalSkill(skillName: string, generatedBy?: string): Promise<void> {
      const skillFile = path.join(fakeHome, '.hermes', 'skills', skillName, 'SKILL.md');
      await fs.mkdir(path.dirname(skillFile), { recursive: true });
      const frontmatter = generatedBy
        ? `---\nmetadata:\n  generatedBy: "${generatedBy}"\n---\n`
        : `---\n---\n`;
      await fs.writeFile(skillFile, frontmatter, 'utf-8');
    }

    it('should return not configured when marker directory does not exist', () => {
      const status = getToolVersionStatus(testDir, 'hermes', '1.6.0');
      expect(status.configured).toBe(false);
      expect(status.needsUpdate).toBe(false);
    });

    it('should report matching version without update needed', async () => {
      await fs.mkdir(path.join(testDir, '.hermes', 'skills'), { recursive: true });
      await createGlobalSkill('openspec-explore', '1.6.0');

      const status = getToolVersionStatus(testDir, 'hermes', '1.6.0');
      expect(status.toolId).toBe('hermes');
      expect(status.toolName).toBe('Hermes Agent');
      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBe('1.6.0');
      expect(status.needsUpdate).toBe(false);
    });

    it('should report needsUpdate when version differs', async () => {
      await fs.mkdir(path.join(testDir, '.hermes', 'skills'), { recursive: true });
      await createGlobalSkill('openspec-explore', '1.5.0');

      const status = getToolVersionStatus(testDir, 'hermes', '1.6.0');
      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBe('1.5.0');
      expect(status.needsUpdate).toBe(true);
    });

    it('should report needsUpdate when generatedBy is missing from skill file', async () => {
      await fs.mkdir(path.join(testDir, '.hermes', 'skills'), { recursive: true });
      await createGlobalSkill('openspec-explore');

      const status = getToolVersionStatus(testDir, 'hermes', '1.6.0');
      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(true);
    });
  });

  describe('getToolsWithSkillsDir', () => {
    it('should include hermes in the list', () => {
      const tools = getToolsWithSkillsDir();
      expect(tools).toContain('hermes');
    });
  });
});
