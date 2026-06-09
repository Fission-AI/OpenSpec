import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  detectLegacyArtifacts,
  detectLegacyConfigFiles,
  detectLegacySlashCommands,
  detectLegacyStructureFiles,
  hasClearSpecMarkers,
  isOnlyClearSpecContent,
  removeMarkerBlock,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  getToolsFromLegacyArtifacts,
  LEGACY_CONFIG_FILES,
  LEGACY_SLASH_COMMAND_PATHS,
} from '../../src/core/legacy-cleanup.js';
import { CLEARSPEC_MARKERS } from '../../src/core/config.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/registry.js';

describe('legacy-cleanup', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `clearspec-legacy-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    // Create clearspec directory structure
    await fs.mkdir(path.join(testDir, 'clearspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('hasClearSpecMarkers', () => {
    it('should return true when both markers are present', () => {
      const content = `Some content
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}
More content`;
      expect(hasClearSpecMarkers(content)).toBe(true);
    });

    it('should return false when start marker is missing', () => {
      const content = `Some content
ClearSpec content
${CLEARSPEC_MARKERS.end}`;
      expect(hasClearSpecMarkers(content)).toBe(false);
    });

    it('should return false when end marker is missing', () => {
      const content = `${CLEARSPEC_MARKERS.start}
ClearSpec content
Some content`;
      expect(hasClearSpecMarkers(content)).toBe(false);
    });

    it('should return false when no markers are present', () => {
      const content = 'Plain content without markers';
      expect(hasClearSpecMarkers(content)).toBe(false);
    });
  });

  describe('isOnlyClearSpecContent', () => {
    it('should return true when content is only markers and whitespace outside', () => {
      const content = `${CLEARSPEC_MARKERS.start}
ClearSpec content here
${CLEARSPEC_MARKERS.end}`;
      expect(isOnlyClearSpecContent(content)).toBe(true);
    });

    it('should return true with whitespace before and after markers', () => {
      const content = `

${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}

`;
      expect(isOnlyClearSpecContent(content)).toBe(true);
    });

    it('should return false when content exists before markers', () => {
      const content = `User content here
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`;
      expect(isOnlyClearSpecContent(content)).toBe(false);
    });

    it('should return false when content exists after markers', () => {
      const content = `${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}
User content here`;
      expect(isOnlyClearSpecContent(content)).toBe(false);
    });

    it('should return false when markers are missing', () => {
      const content = 'Plain content without markers';
      expect(isOnlyClearSpecContent(content)).toBe(false);
    });

    it('should return false when end marker comes before start marker', () => {
      const content = `${CLEARSPEC_MARKERS.end}
Content
${CLEARSPEC_MARKERS.start}`;
      expect(isOnlyClearSpecContent(content)).toBe(false);
    });
  });

  describe('removeMarkerBlock', () => {
    it('should remove marker block and preserve content before', () => {
      const content = `User content before
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`;
      const result = removeMarkerBlock(content);
      expect(result).toBe('User content before\n');
      expect(result).not.toContain(CLEARSPEC_MARKERS.start);
      expect(result).not.toContain(CLEARSPEC_MARKERS.end);
    });

    it('should remove marker block and preserve content after', () => {
      const content = `${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}
User content after`;
      const result = removeMarkerBlock(content);
      expect(result).toBe('User content after\n');
    });

    it('should remove marker block and preserve content before and after', () => {
      const content = `User content before
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}
User content after`;
      const result = removeMarkerBlock(content);
      expect(result).toContain('User content before');
      expect(result).toContain('User content after');
      expect(result).not.toContain(CLEARSPEC_MARKERS.start);
    });

    it('should clean up double blank lines', () => {
      const content = `Line 1


${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}


Line 2`;
      const result = removeMarkerBlock(content);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should return empty string when only markers remain', () => {
      const content = `${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`;
      const result = removeMarkerBlock(content);
      expect(result).toBe('');
    });

    it('should return original content when markers are missing', () => {
      const content = 'Plain content without markers';
      const result = removeMarkerBlock(content);
      // When no markers found, content is returned trimmed (no trailing newline added)
      expect(result).toBe('Plain content without markers');
    });

    it('should return original content when markers are in wrong order', () => {
      const content = `${CLEARSPEC_MARKERS.end}
Content
${CLEARSPEC_MARKERS.start}`;
      const result = removeMarkerBlock(content);
      expect(result).toContain(CLEARSPEC_MARKERS.end);
      expect(result).toContain(CLEARSPEC_MARKERS.start);
    });

    it('should ignore inline mentions of markers and only remove actual block', () => {
      const content = `Intro referencing ${CLEARSPEC_MARKERS.start} and ${CLEARSPEC_MARKERS.end} inline.

${CLEARSPEC_MARKERS.start}
Managed content here
${CLEARSPEC_MARKERS.end}
After content`;
      const result = removeMarkerBlock(content);
      // Inline mentions preserved
      expect(result).toContain('Intro referencing');
      expect(result).toContain(CLEARSPEC_MARKERS.start);
      expect(result).toContain(CLEARSPEC_MARKERS.end);
      // Managed content removed
      expect(result).not.toContain('Managed content here');
      expect(result).toContain('After content');
    });
  });

  describe('detectLegacyConfigFiles', () => {
    it('should detect CLAUDE.md with ClearSpec markers and put in update list', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`);

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toContain('CLAUDE.md');
      // Config files are NEVER deleted, always updated (markers removed)
      expect(result.filesToUpdate).toContain('CLAUDE.md');
    });

    it('should detect files with mixed content and put in update list', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `User instructions here
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`);

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toContain('CLAUDE.md');
      expect(result.filesToUpdate).toContain('CLAUDE.md');
    });

    it('should not detect files without ClearSpec markers', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, 'Plain instructions without markers');

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).not.toContain('CLAUDE.md');
    });

    it('should detect multiple config files', async () => {
      // Create multiple config files with markers
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `${CLEARSPEC_MARKERS.start}\nContent\n${CLEARSPEC_MARKERS.end}`);
      await fs.writeFile(path.join(testDir, 'CLINE.md'), `${CLEARSPEC_MARKERS.start}\nContent\n${CLEARSPEC_MARKERS.end}`);
      await fs.writeFile(path.join(testDir, 'QODER.md'), `${CLEARSPEC_MARKERS.start}\nContent\n${CLEARSPEC_MARKERS.end}`);

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toHaveLength(3);
      expect(result.allFiles).toContain('CLAUDE.md');
      expect(result.allFiles).toContain('CLINE.md');
      expect(result.allFiles).toContain('QODER.md');
      // All should be in update list, none deleted
      expect(result.filesToUpdate).toHaveLength(3);
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toHaveLength(0);
      expect(result.filesToUpdate).toHaveLength(0);
    });
  });

  describe('detectLegacySlashCommands', () => {
    it('should detect legacy Claude slash command directory', async () => {
      const dirPath = path.join(testDir, '.claude', 'commands', 'clearspec');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'proposal.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.directories).toContain('.claude/commands/clearspec');
    });

    it('should detect legacy Cursor slash command files', async () => {
      const dirPath = path.join(testDir, '.cursor', 'commands');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clearspec-proposal.md'), 'content');
      await fs.writeFile(path.join(dirPath, 'clearspec-apply.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.cursor/commands/clearspec-proposal.md');
      expect(result.files).toContain('.cursor/commands/clearspec-apply.md');
    });

    it('should detect legacy Windsurf workflow files', async () => {
      const dirPath = path.join(testDir, '.windsurf', 'workflows');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clearspec-archive.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.windsurf/workflows/clearspec-archive.md');
    });

    it('should detect multiple tool directories and files', async () => {
      // Create directory-based
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'clearspec'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.qoder', 'commands', 'clearspec'), { recursive: true });

      // Create file-based
      await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.cursor', 'commands', 'clearspec-proposal.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.directories).toContain('.claude/commands/clearspec');
      expect(result.directories).toContain('.qoder/commands/clearspec');
      expect(result.files).toContain('.cursor/commands/clearspec-proposal.md');
    });

    it('should not detect non-clearspec files', async () => {
      const dirPath = path.join(testDir, '.cursor', 'commands');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'other-command.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).not.toContain('.cursor/commands/other-command.md');
    });

    it('should handle non-existent directories gracefully', async () => {
      const result = await detectLegacySlashCommands(testDir);
      expect(result.directories).toHaveLength(0);
      expect(result.files).toHaveLength(0);
    });

    it('should detect TOML-based slash commands for Qwen', async () => {
      const dirPath = path.join(testDir, '.qwen', 'commands');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clearspec-proposal.toml'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.qwen/commands/clearspec-proposal.toml');
    });

    it('should detect Continue prompt files', async () => {
      const dirPath = path.join(testDir, '.continue', 'prompts');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clearspec-apply.prompt'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.continue/prompts/clearspec-apply.prompt');
    });

    it('should detect legacy OpenCode clsx-* command files', async () => {
      const dirPath = path.join(testDir, '.opencode', 'command');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clsx-propose.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.opencode/command/clsx-propose.md');
    });

    it('should detect legacy OpenCode clearspec-* command files', async () => {
      const dirPath = path.join(testDir, '.opencode', 'command');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clearspec-new.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.opencode/command/clearspec-new.md');
    });

    it('should detect both clsx-* and clearspec-* OpenCode command files', async () => {
      const dirPath = path.join(testDir, '.opencode', 'command');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'clsx-propose.md'), 'content');
      await fs.writeFile(path.join(dirPath, 'clearspec-new.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.opencode/command/clsx-propose.md');
      expect(result.files).toContain('.opencode/command/clearspec-new.md');
    });
  });

  describe('detectLegacyStructureFiles', () => {
    it('should detect root AGENTS.md with ClearSpec markers', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, `${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`);

      const result = await detectLegacyStructureFiles(testDir);
      expect(result.hasRootAgentsWithMarkers).toBe(true);
    });

    it('should not detect root AGENTS.md without markers', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, 'Plain content without markers');

      const result = await detectLegacyStructureFiles(testDir);
      expect(result.hasRootAgentsWithMarkers).toBe(false);
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await detectLegacyStructureFiles(testDir);
      expect(result.hasRootAgentsWithMarkers).toBe(false);
    });
  });

  describe('detectLegacyArtifacts', () => {
    it('should return hasLegacyArtifacts: false when nothing is found', async () => {
      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(false);
    });

    it('should return hasLegacyArtifacts: true when config files are found', async () => {
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `${CLEARSPEC_MARKERS.start}\nContent\n${CLEARSPEC_MARKERS.end}`);

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.configFiles).toContain('CLAUDE.md');
    });

    it('should return hasLegacyArtifacts: true when slash commands are found', async () => {
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'clearspec'), { recursive: true });

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.slashCommandDirs).toContain('.claude/commands/clearspec');
    });

    it('should combine all detection results', async () => {
      // Create various legacy artifacts
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `${CLEARSPEC_MARKERS.start}\nContent\n${CLEARSPEC_MARKERS.end}`);
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'clearspec'), { recursive: true });

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.configFiles).toContain('CLAUDE.md');
      expect(result.slashCommandDirs).toContain('.claude/commands/clearspec');
    });
  });

  describe('cleanupLegacyArtifacts', () => {
    it('should remove markers from config files that have only ClearSpec content (never delete)', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `${CLEARSPEC_MARKERS.start}\nContent\n${CLEARSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      // Config files should NEVER be deleted, only have markers removed
      expect(result.deletedFiles).not.toContain('CLAUDE.md');
      expect(result.modifiedFiles).toContain('CLAUDE.md');
      // File should still exist
      await expect(fs.access(claudePath)).resolves.not.toThrow();
      // File should be empty or have markers removed
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).not.toContain(CLEARSPEC_MARKERS.start);
      expect(content).not.toContain(CLEARSPEC_MARKERS.end);
    });

    it('should remove marker block from files with mixed content', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `User instructions
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.modifiedFiles).toContain('CLAUDE.md');
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('User instructions');
      expect(content).not.toContain(CLEARSPEC_MARKERS.start);
    });

    it('should delete legacy slash command directories', async () => {
      const dirPath = path.join(testDir, '.claude', 'commands', 'clearspec');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'proposal.md'), 'content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedDirs).toContain('.claude/commands/clearspec');
      await expect(fs.access(dirPath)).rejects.toThrow();
      // Parent directory should still exist
      await expect(fs.access(path.join(testDir, '.claude', 'commands'))).resolves.not.toThrow();
    });

    it('should delete legacy slash command files', async () => {
      const dirPath = path.join(testDir, '.cursor', 'commands');
      await fs.mkdir(dirPath, { recursive: true });
      const filePath = path.join(dirPath, 'clearspec-proposal.md');
      await fs.writeFile(filePath, 'content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedFiles).toContain('.cursor/commands/clearspec-proposal.md');
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should handle root AGENTS.md with mixed content', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, `User content
${CLEARSPEC_MARKERS.start}
ClearSpec content
${CLEARSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.modifiedFiles).toContain('AGENTS.md');
      const content = await fs.readFile(agentsPath, 'utf-8');
      expect(content).toContain('User content');
      expect(content).not.toContain(CLEARSPEC_MARKERS.start);
    });

    it('should remove markers from root AGENTS.md even when only ClearSpec content (never delete)', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, `${CLEARSPEC_MARKERS.start}\nClearSpec content\n${CLEARSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      // Root AGENTS.md should NEVER be deleted, only have markers removed
      expect(result.deletedFiles).not.toContain('AGENTS.md');
      expect(result.modifiedFiles).toContain('AGENTS.md');
      // File should still exist
      await expect(fs.access(agentsPath)).resolves.not.toThrow();
    });

    it('should report errors without stopping cleanup', async () => {
      // Create a valid detection result with a non-existent file to simulate error
      const detection = {
        configFiles: ['NON_EXISTENT.md'],
        configFilesToUpdate: ['NON_EXISTENT.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const result = await cleanupLegacyArtifacts(testDir, detection);

      // Should not throw, but should record the error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('NON_EXISTENT.md');
    });
  });

  describe('formatCleanupSummary', () => {
    it('should format deleted files', () => {
      const result = {
        deletedFiles: ['CLAUDE.md', 'CLINE.md'],
        modifiedFiles: [],
        deletedDirs: [],
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('Cleaned up legacy files:');
      expect(summary).toContain('✓ Removed CLAUDE.md');
      expect(summary).toContain('✓ Removed CLINE.md');
    });

    it('should format deleted directories', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: [],
        deletedDirs: ['.claude/commands/clearspec'],
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('✓ Removed .claude/commands/clearspec/ (replaced by /clsx:*)');
    });

    it('should format modified files', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: ['AGENTS.md'],
        deletedDirs: [],
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('✓ Removed ClearSpec markers from AGENTS.md');
    });

    it('should include errors', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: [],
        deletedDirs: [],
        errors: ['Failed to delete CLAUDE.md: Permission denied'],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('Errors during cleanup:');
      expect(summary).toContain('Failed to delete CLAUDE.md');
    });

    it('should return empty string when nothing to report', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: [],
        deletedDirs: [],
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toBe('');
    });
  });

  describe('formatDetectionSummary', () => {
    it('should include welcoming upgrade header and explanation', () => {
      const detection = {
        configFiles: ['CLAUDE.md'],
        configFilesToUpdate: ['CLAUDE.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Upgrading to the new ClearSpec');
      expect(summary).toContain('agent skills');
      expect(summary).toContain('keeping everything working');
    });

    it('should format config files as files to update (never remove)', () => {
      const detection = {
        configFiles: ['CLAUDE.md'],
        configFilesToUpdate: ['CLAUDE.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      // Config files should be in "Files to update", not "Files to remove"
      expect(summary).toContain('Files to update');
      expect(summary).toContain('• CLAUDE.md');
      // Should NOT be in removals
      expect(summary).not.toContain('No user content to preserve');
    });

    it('should format files to be updated', () => {
      const detection = {
        configFiles: ['CLINE.md'],
        configFilesToUpdate: ['CLINE.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Files to update');
      expect(summary).toContain('markers will be removed');
      expect(summary).toContain('your content preserved');
      expect(summary).toContain('• CLINE.md');
    });

    it('should format slash command directories', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: ['.claude/commands/clearspec'],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Files to remove');
      expect(summary).toContain('• .claude/commands/clearspec/');
    });

    it('should format slash command files', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.cursor/commands/clearspec-proposal.md'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Files to remove');
      expect(summary).toContain('• .cursor/commands/clearspec-proposal.md');
    });

    it('should list config files in the "Files to update" section', () => {
      const detection = {
        configFiles: ['CLAUDE.md'],
        configFilesToUpdate: ['CLAUDE.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      // Config files now in "Files to update", not "Files to remove"
      expect(summary).toContain('Files to update');
      expect(summary).toContain('CLAUDE.md');
    });

    it('should group both removals and updates correctly', () => {
      const detection = {
        configFiles: ['CLAUDE.md', 'CLINE.md'],
        configFilesToUpdate: ['CLAUDE.md', 'CLINE.md'],
        slashCommandDirs: ['.claude/commands/clearspec'],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      // Check both sections exist
      expect(summary).toContain('Files to remove');
      expect(summary).toContain('Files to update');
      // Check removals (only slash commands)
      expect(summary).toContain('• .claude/commands/clearspec/');
      // Check updates (all config files)
      expect(summary).toContain('• CLAUDE.md');
      expect(summary).toContain('• CLINE.md');
    });

    it('should return empty string when nothing is detected', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: false,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toBe('');
    });
  });

  describe('LEGACY_CONFIG_FILES', () => {
    it('should include expected config file names', () => {
      expect(LEGACY_CONFIG_FILES).toContain('CLAUDE.md');
      expect(LEGACY_CONFIG_FILES).toContain('CLINE.md');
      expect(LEGACY_CONFIG_FILES).toContain('CODEBUDDY.md');
      expect(LEGACY_CONFIG_FILES).toContain('COSTRICT.md');
      expect(LEGACY_CONFIG_FILES).toContain('QODER.md');
      expect(LEGACY_CONFIG_FILES).toContain('IFLOW.md');
      expect(LEGACY_CONFIG_FILES).toContain('AGENTS.md');
      expect(LEGACY_CONFIG_FILES).toContain('QWEN.md');
    });
  });

  describe('LEGACY_SLASH_COMMAND_PATHS', () => {
    it('should include expected tool patterns', () => {
      expect(LEGACY_SLASH_COMMAND_PATHS['claude']).toEqual({
        type: 'directory',
        path: '.claude/commands/clearspec',
      });

      expect(LEGACY_SLASH_COMMAND_PATHS['cursor']).toEqual({
        type: 'files',
        pattern: '.cursor/commands/clearspec-*.md',
      });

      expect(LEGACY_SLASH_COMMAND_PATHS['windsurf']).toEqual({
        type: 'files',
        pattern: '.windsurf/workflows/clearspec-*.md',
      });
    });

    it('should only include legacy tool IDs that are present in the CommandAdapterRegistry', () => {
      const registeredTools = new Set(CommandAdapterRegistry.getAll().map(adapter => adapter.toolId));

      // Verify all legacy map entries correspond to known adapters
      for (const tool of Object.keys(LEGACY_SLASH_COMMAND_PATHS)) {
        expect(registeredTools.has(tool)).toBe(true);
      }

      // Pi was never a pre-1.0 legacy tool
      expect(LEGACY_SLASH_COMMAND_PATHS).not.toHaveProperty('pi');
    });
  });

  describe('getToolsFromLegacyArtifacts', () => {
    it('should extract claude from directory-based legacy artifacts', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: ['.claude/commands/clearspec'],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('claude');
      expect(tools).toHaveLength(1);
    });

    it('should extract cursor from file-based legacy artifacts', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.cursor/commands/clearspec-proposal.md'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('cursor');
      expect(tools).toHaveLength(1);
    });

    it('should extract multiple tools from mixed legacy artifacts', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: ['.claude/commands/clearspec', '.qoder/commands/clearspec'],
        slashCommandFiles: ['.cursor/commands/clearspec-apply.md', '.windsurf/workflows/clearspec-archive.md'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('claude');
      expect(tools).toContain('qoder');
      expect(tools).toContain('cursor');
      expect(tools).toContain('windsurf');
      expect(tools).toHaveLength(4);
    });

    it('should deduplicate tools when multiple files match same tool', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: [
          '.cursor/commands/clearspec-proposal.md',
          '.cursor/commands/clearspec-apply.md',
          '.cursor/commands/clearspec-archive.md',
        ],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('cursor');
      expect(tools).toHaveLength(1);
    });

    it('should return empty array when no legacy artifacts', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: false,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toHaveLength(0);
    });

    it('should handle qwen TOML-based legacy files', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.qwen/commands/clearspec-proposal.toml'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('qwen');
      expect(tools).toHaveLength(1);
    });

    it('should handle continue prompt files', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.continue/prompts/clearspec-apply.prompt'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('continue');
      expect(tools).toHaveLength(1);
    });

    it('should handle github-copilot prompt files', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.github/prompts/clearspec-apply.prompt.md'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('github-copilot');
      expect(tools).toHaveLength(1);
    });

    it('should handle opencode clsx-* legacy files', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.opencode/command/clsx-propose.md'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('opencode');
      expect(tools).toHaveLength(1);
    });

    it('should handle opencode clearspec-* legacy files', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.opencode/command/clearspec-new.md'],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('opencode');
      expect(tools).toHaveLength(1);
    });

    it('should deduplicate opencode when both clsx-* and clearspec-* files exist', () => {
      const detection = {
        configFiles: [],
        configFilesToUpdate: [],
        slashCommandDirs: [],
        slashCommandFiles: [
          '.opencode/command/clsx-propose.md',
          '.opencode/command/clearspec-new.md',
        ],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toContain('opencode');
      expect(tools).toHaveLength(1);
    });

    it('should not extract tools from config files only', () => {
      // Config files don't indicate which tools were configured
      // Only slash command dirs/files tell us which tools to upgrade
      const detection = {
        configFiles: ['CLAUDE.md'],
        configFilesToUpdate: ['CLAUDE.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const tools = getToolsFromLegacyArtifacts(detection);
      expect(tools).toHaveLength(0);
    });
  });

  describe('coexistence with a separately installed OpenSpec', () => {
    it('leaves a pre-existing openspec/ directory and its files completely untouched', async () => {
      await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
      const openspecAgentsPath = path.join(testDir, 'openspec', 'AGENTS.md');
      const openspecProjectPath = path.join(testDir, 'openspec', 'project.md');
      await fs.writeFile(openspecAgentsPath, '# OpenSpec AGENTS.md content');
      await fs.writeFile(openspecProjectPath, '# OpenSpec project content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      // Both OpenSpec files should still exist
      await expect(fs.access(openspecAgentsPath)).resolves.not.toThrow();
      await expect(fs.access(openspecProjectPath)).resolves.not.toThrow();

      // Nothing referencing openspec should have been deleted
      expect(result.deletedFiles.some((f) => f.includes('openspec'))).toBe(false);
    });

    it('does not detect or remove OpenSpec marker blocks in shared config files', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      const original = `# Project instructions
<!-- OPENSPEC:START -->
(openspec content)
<!-- OPENSPEC:END -->
`;
      await fs.writeFile(claudePath, original);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      // OpenSpec marker blocks must not be treated as ClearSpec artifacts
      expect(detection.configFiles).not.toContain('CLAUDE.md');
      expect(result.modifiedFiles).not.toContain('CLAUDE.md');

      // File content must be unchanged
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toBe(original);
    });

    it('still removes ClearSpec marker blocks from shared config files', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `# Project instructions
${CLEARSPEC_MARKERS.start}
content
${CLEARSPEC_MARKERS.end}
`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      // ClearSpec markers should still be cleaned up normally
      expect(result.modifiedFiles).toContain('CLAUDE.md');
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).not.toContain(CLEARSPEC_MARKERS.start);
      expect(content).not.toContain(CLEARSPEC_MARKERS.end);
    });
  });
});
