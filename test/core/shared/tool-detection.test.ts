import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  SKILL_NAMES,
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  extractGeneratedByVersion,
  getToolVersionStatus,
  getConfiguredTools,
  getAllToolVersionStatus,
} from '../../../src/core/shared/tool-detection.js';

describe('tool-detection', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-'));
    vi.stubEnv('XDG_CONFIG_HOME', path.join(testDir, 'config'));
    vi.stubEnv('HOME', path.join(testDir, 'home'));
    vi.stubEnv('USERPROFILE', path.join(testDir, 'home'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
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
      expect(tools).toContain('codeartsagent');
      expect(tools).toContain('cursor');
      expect(tools).toContain('devin');
      expect(tools).toContain('dsh');
      // `--tools all` resolves to exactly this list, so `agents` being here is what
      // puts the shared target in an `--tools all` run.
      expect(tools).toContain('agents');
      expect(tools).toContain('minimax-code');
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

    it('should detect legacy Codex skills before they are migrated', async () => {
      const skillDir = path.join(testDir, '.codex', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'legacy content');

      expect(getToolSkillStatus(testDir, 'codex').configured).toBe(true);
      expect(getConfiguredTools(testDir)).toContain('codex');
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

    it('should detect MiniMax Code only from its global OpenSpec skill target', async () => {
      const globalSkill = path.join(
        testDir,
        'home',
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(globalSkill), { recursive: true });
      await fs.writeFile(globalSkill, 'test content');

      expect(getToolSkillStatus(testDir, 'minimax-code')).toMatchObject({
        configured: true,
        fullyConfigured: false,
        skillCount: 1,
      });

      await fs.rm(path.join(testDir, 'home'), { recursive: true, force: true });
      const localSkill = path.join(
        testDir,
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(localSkill), { recursive: true });
      await fs.writeFile(localSkill, 'test content');

      expect(getToolSkillStatus(testDir, 'minimax-code').configured).toBe(false);
    });

    it('should detect DeepSeek Harness skills under project .dsh/skills', async () => {
      const skillDir = path.join(testDir, '.dsh', 'skills', 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'test content');

      expect(getToolSkillStatus(testDir, 'dsh')).toMatchObject({
        configured: true,
        fullyConfigured: false,
        skillCount: 1,
      });
      expect(getConfiguredTools(testDir)).toEqual(['dsh']);
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

    it('should expose only the marked owner of a shared skill tree as configured', async () => {
      const skillsDir = path.join(testDir, '.agents', 'skills');
      const skillDir = path.join(skillsDir, 'openspec-explore');
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), 'test content');
      await fs.writeFile(path.join(skillsDir, '.openspec-target'), 'agents\n');

      const states = getToolStates(testDir);
      expect(states.get('agents')?.configured).toBe(true);
      expect(states.get('codex')?.configured).toBe(false);
      expect(getToolSkillStatus(testDir, 'agents').configured).toBe(true);
      expect(getToolSkillStatus(testDir, 'codex').configured).toBe(false);
      expect(getToolVersionStatus(testDir, 'codex', '0.23.0').configured).toBe(false);
    });

    it('should preserve global tool state while reconciling a shared project root', async () => {
      const sharedSkills = path.join(testDir, '.agents', 'skills');
      const sharedSkill = path.join(sharedSkills, 'openspec-explore', 'SKILL.md');
      const globalSkill = path.join(
        testDir,
        'home',
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(sharedSkill), { recursive: true });
      await fs.writeFile(sharedSkill, 'content');
      await fs.writeFile(path.join(sharedSkills, '.openspec-target'), 'agents\n');
      await fs.mkdir(path.dirname(globalSkill), { recursive: true });
      await fs.writeFile(globalSkill, 'content');

      const states = getToolStates(testDir);
      expect(states.get('agents')?.configured).toBe(true);
      expect(states.get('codex')?.configured).toBe(false);
      expect(states.get('minimax-code')?.configured).toBe(true);
      expect(getConfiguredTools(testDir)).toEqual(['minimax-code', 'agents']);
    });

    it('should preserve marker-only ownership when delivery intentionally has no skills', async () => {
      const skillsDir = path.join(testDir, '.agents', 'skills');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.writeFile(path.join(skillsDir, '.openspec-target'), 'agents\n');

      const states = getToolStates(testDir);
      expect(states.get('agents')).toEqual({
        configured: true,
        fullyConfigured: false,
        skillCount: 0,
      });
      expect(states.get('codex')?.configured).toBe(false);
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

    it('should detect configured status and version match for commands-only setup', async () => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const { version } = await import('../../../package.json');
      const status = getToolVersionStatus(testDir, 'claude', version, {
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      });

      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBe(version);
      expect(status.needsUpdate).toBe(false);
    });

    // Command paths vary in shape across adapters: a nested directory with a
    // per-tool extension (gemini writes TOML), a flat opsx-* file, and — for
    // cline — a directory that is not the tool's skillsDir at all.
    it.each([
      ['gemini', path.join('.gemini', 'commands', 'opsx', 'explore.toml')],
      ['cursor', path.join('.cursor', 'commands', 'opsx-explore.md')],
      ['cline', path.join('.clinerules', 'workflows', 'opsx-explore.md')],
    ])('should fingerprint commands-only %s installs', async (toolId, explorePath) => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const initCommand = new InitCommand({ tools: toolId, force: true });
      await initCommand.execute(testDir);

      const { version } = await import('../../../package.json');
      const coreWorkflows = ['propose', 'explore', 'apply', 'update', 'sync', 'archive'];

      // cline's commands live outside its skillsDir (.cline), so a commands-only
      // install leaves that directory absent entirely.
      expect(getConfiguredTools(testDir)).toContain(toolId);

      const fresh = getToolVersionStatus(testDir, toolId, version, { workflows: coreWorkflows });
      expect(fresh.configured).toBe(true);
      expect(fresh.generatedByVersion).toBe(version);
      expect(fresh.needsUpdate).toBe(false);

      await fs.writeFile(path.join(testDir, explorePath), 'stale content');

      const drifted = getToolVersionStatus(testDir, toolId, version, { workflows: coreWorkflows });
      expect(drifted.generatedByVersion).toBeNull();
      expect(drifted.needsUpdate).toBe(true);
    });

    it('should fingerprint a custom profile against its own workflow subset', async () => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      const customWorkflows = ['explore', 'apply'];
      saveGlobalConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'commands',
        workflows: customWorkflows,
      });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      const { version } = await import('../../../package.json');
      const status = getToolVersionStatus(testDir, 'claude', version, {
        workflows: customWorkflows,
      });

      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBe(version);
      expect(status.needsUpdate).toBe(false);

      // The core set is a superset of this profile, so comparing against it must
      // report drift — the fingerprint has to use the workflows actually selected.
      const againstCore = getToolVersionStatus(testDir, 'claude', version, {
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      });
      expect(againstCore.needsUpdate).toBe(true);
    });

    it('should treat CRLF line endings and a BOM as up to date, not as drift', async () => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // A Windows clone with core.autocrlf re-materializes committed command
      // files with CRLF endings; that is a checkout artifact, not content drift.
      const commandsDir = path.join(testDir, '.claude', 'commands', 'opsx');
      for (const entry of await fs.readdir(commandsDir)) {
        const file = path.join(commandsDir, entry);
        const content = await fs.readFile(file, 'utf-8');
        await fs.writeFile(file, '\ufeff' + content.replace(/\r?\n/g, '\r\n'));
      }

      const { version } = await import('../../../package.json');
      const status = getToolVersionStatus(testDir, 'claude', version, {
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      });

      expect(status.generatedByVersion).toBe(version);
      expect(status.needsUpdate).toBe(false);
    });

    it('should detect needsUpdate when a deselected workflow left a command file behind', async () => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // A workflow that is no longer selected still has a command file on disk
      const strayFile = path.join(testDir, '.claude', 'commands', 'opsx', 'verify.md');
      await fs.writeFile(strayFile, 'stray command from a previous profile');

      const { version } = await import('../../../package.json');
      const status = getToolVersionStatus(testDir, 'claude', version, {
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      });

      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(true);
    });

    it('should not let matching command files mask an unreadable skill version', async () => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both' });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // Corrupt a skill file so its generatedBy version can no longer be read,
      // while every command file still matches the current generated content.
      const skillFile = path.join(testDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      await fs.writeFile(skillFile, 'truncated skill file');

      const { version } = await import('../../../package.json');
      const status = getToolVersionStatus(testDir, 'claude', version, {
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      });

      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(true);
    });

    it('should detect needsUpdate when command file content differs in commands-only setup', async () => {
      const { InitCommand } = await import('../../../src/core/init.js');
      const { saveGlobalConfig } = await import('../../../src/core/global-config.js');
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      // Modify one command file
      const cmdFile = path.join(testDir, '.claude', 'commands', 'opsx', 'explore.md');
      await fs.writeFile(cmdFile, 'outdated content');

      const { version } = await import('../../../package.json');
      const status = getToolVersionStatus(testDir, 'claude', version, {
        workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      });

      expect(status.configured).toBe(true);
      expect(status.generatedByVersion).toBeNull();
      expect(status.needsUpdate).toBe(true);
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

    it('should treat a marker-only target as configured', async () => {
      const skillsDir = path.join(testDir, '.agents', 'skills');
      await fs.mkdir(skillsDir, { recursive: true });
      await fs.writeFile(path.join(skillsDir, '.openspec-target'), 'agents\n');

      const statuses = getAllToolVersionStatus(testDir, '0.23.0');
      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toMatchObject({
        toolId: 'agents',
        configured: true,
        needsUpdate: true,
      });
    });
  });
});
