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
  hasOpenSpecMarkers,
  isOnlyOpenSpecContent,
  removeMarkerBlock,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  LEGACY_CONFIG_FILES,
  LEGACY_SLASH_COMMAND_PATHS,
} from '../../src/core/legacy-cleanup.js';
import { OPENSPEC_MARKERS } from '../../src/core/config.js';

describe('legacy-cleanup', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-legacy-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    // Create openspec directory structure
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('hasOpenSpecMarkers', () => {
    it('should return true when both markers are present', () => {
      const content = `Some content
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}
More content`;
      expect(hasOpenSpecMarkers(content)).toBe(true);
    });

    it('should return false when start marker is missing', () => {
      const content = `Some content
OpenSpec content
${OPENSPEC_MARKERS.end}`;
      expect(hasOpenSpecMarkers(content)).toBe(false);
    });

    it('should return false when end marker is missing', () => {
      const content = `${OPENSPEC_MARKERS.start}
OpenSpec content
Some content`;
      expect(hasOpenSpecMarkers(content)).toBe(false);
    });

    it('should return false when no markers are present', () => {
      const content = 'Plain content without markers';
      expect(hasOpenSpecMarkers(content)).toBe(false);
    });
  });

  describe('isOnlyOpenSpecContent', () => {
    it('should return true when content is only markers and whitespace outside', () => {
      const content = `${OPENSPEC_MARKERS.start}
OpenSpec content here
${OPENSPEC_MARKERS.end}`;
      expect(isOnlyOpenSpecContent(content)).toBe(true);
    });

    it('should return true with whitespace before and after markers', () => {
      const content = `

${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}

`;
      expect(isOnlyOpenSpecContent(content)).toBe(true);
    });

    it('should return false when content exists before markers', () => {
      const content = `User content here
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`;
      expect(isOnlyOpenSpecContent(content)).toBe(false);
    });

    it('should return false when content exists after markers', () => {
      const content = `${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}
User content here`;
      expect(isOnlyOpenSpecContent(content)).toBe(false);
    });

    it('should return false when markers are missing', () => {
      const content = 'Plain content without markers';
      expect(isOnlyOpenSpecContent(content)).toBe(false);
    });

    it('should return false when end marker comes before start marker', () => {
      const content = `${OPENSPEC_MARKERS.end}
Content
${OPENSPEC_MARKERS.start}`;
      expect(isOnlyOpenSpecContent(content)).toBe(false);
    });
  });

  describe('removeMarkerBlock', () => {
    it('should remove marker block and preserve content before', () => {
      const content = `User content before
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`;
      const result = removeMarkerBlock(content);
      expect(result).toBe('User content before\n');
      expect(result).not.toContain(OPENSPEC_MARKERS.start);
      expect(result).not.toContain(OPENSPEC_MARKERS.end);
    });

    it('should remove marker block and preserve content after', () => {
      const content = `${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}
User content after`;
      const result = removeMarkerBlock(content);
      expect(result).toBe('User content after\n');
    });

    it('should remove marker block and preserve content before and after', () => {
      const content = `User content before
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}
User content after`;
      const result = removeMarkerBlock(content);
      expect(result).toContain('User content before');
      expect(result).toContain('User content after');
      expect(result).not.toContain(OPENSPEC_MARKERS.start);
    });

    it('should clean up double blank lines', () => {
      const content = `Line 1


${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}


Line 2`;
      const result = removeMarkerBlock(content);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should return empty string when only markers remain', () => {
      const content = `${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`;
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
      const content = `${OPENSPEC_MARKERS.end}
Content
${OPENSPEC_MARKERS.start}`;
      const result = removeMarkerBlock(content);
      expect(result).toContain(OPENSPEC_MARKERS.end);
      expect(result).toContain(OPENSPEC_MARKERS.start);
    });
  });

  describe('detectLegacyConfigFiles', () => {
    it('should detect CLAUDE.md with OpenSpec markers', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`);

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toContain('CLAUDE.md');
      expect(result.filesToDelete).toContain('CLAUDE.md');
      expect(result.filesWithMixedContent).not.toContain('CLAUDE.md');
    });

    it('should categorize files with mixed content correctly', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `User instructions here
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`);

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toContain('CLAUDE.md');
      expect(result.filesToDelete).not.toContain('CLAUDE.md');
      expect(result.filesWithMixedContent).toContain('CLAUDE.md');
    });

    it('should not detect files without OpenSpec markers', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, 'Plain instructions without markers');

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).not.toContain('CLAUDE.md');
    });

    it('should detect multiple config files', async () => {
      // Create multiple config files with markers
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `${OPENSPEC_MARKERS.start}\nContent\n${OPENSPEC_MARKERS.end}`);
      await fs.writeFile(path.join(testDir, 'CLINE.md'), `${OPENSPEC_MARKERS.start}\nContent\n${OPENSPEC_MARKERS.end}`);
      await fs.writeFile(path.join(testDir, 'QODER.md'), `${OPENSPEC_MARKERS.start}\nContent\n${OPENSPEC_MARKERS.end}`);

      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toHaveLength(3);
      expect(result.allFiles).toContain('CLAUDE.md');
      expect(result.allFiles).toContain('CLINE.md');
      expect(result.allFiles).toContain('QODER.md');
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await detectLegacyConfigFiles(testDir);
      expect(result.allFiles).toHaveLength(0);
      expect(result.filesToDelete).toHaveLength(0);
      expect(result.filesWithMixedContent).toHaveLength(0);
    });
  });

  describe('detectLegacySlashCommands', () => {
    it('should detect legacy Claude slash command directory', async () => {
      const dirPath = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'proposal.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.directories).toContain('.claude/commands/openspec');
    });

    it('should detect legacy Cursor slash command files', async () => {
      const dirPath = path.join(testDir, '.cursor', 'commands');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'openspec-proposal.md'), 'content');
      await fs.writeFile(path.join(dirPath, 'openspec-apply.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.cursor/commands/openspec-proposal.md');
      expect(result.files).toContain('.cursor/commands/openspec-apply.md');
    });

    it('should detect legacy Windsurf workflow files', async () => {
      const dirPath = path.join(testDir, '.windsurf', 'workflows');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'openspec-archive.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.windsurf/workflows/openspec-archive.md');
    });

    it('should detect multiple tool directories and files', async () => {
      // Create directory-based
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.qoder', 'commands', 'openspec'), { recursive: true });

      // Create file-based
      await fs.mkdir(path.join(testDir, '.cursor', 'commands'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.cursor', 'commands', 'openspec-proposal.md'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.directories).toContain('.claude/commands/openspec');
      expect(result.directories).toContain('.qoder/commands/openspec');
      expect(result.files).toContain('.cursor/commands/openspec-proposal.md');
    });

    it('should not detect non-openspec files', async () => {
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
      await fs.writeFile(path.join(dirPath, 'openspec-proposal.toml'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.qwen/commands/openspec-proposal.toml');
    });

    it('should detect Continue prompt files', async () => {
      const dirPath = path.join(testDir, '.continue', 'prompts');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'openspec-apply.prompt'), 'content');

      const result = await detectLegacySlashCommands(testDir);
      expect(result.files).toContain('.continue/prompts/openspec-apply.prompt');
    });
  });

  describe('detectLegacyStructureFiles', () => {
    it('should detect openspec/AGENTS.md', async () => {
      const agentsPath = path.join(testDir, 'openspec', 'AGENTS.md');
      await fs.writeFile(agentsPath, '# AGENTS.md content');

      const result = await detectLegacyStructureFiles(testDir);
      expect(result.hasOpenspecAgents).toBe(true);
    });

    it('should detect openspec/project.md', async () => {
      const projectPath = path.join(testDir, 'openspec', 'project.md');
      await fs.writeFile(projectPath, '# Project content');

      const result = await detectLegacyStructureFiles(testDir);
      expect(result.hasProjectMd).toBe(true);
    });

    it('should detect root AGENTS.md with OpenSpec markers', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, `${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`);

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
      expect(result.hasOpenspecAgents).toBe(false);
      expect(result.hasProjectMd).toBe(false);
      expect(result.hasRootAgentsWithMarkers).toBe(false);
    });
  });

  describe('detectLegacyArtifacts', () => {
    it('should return hasLegacyArtifacts: false when nothing is found', async () => {
      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(false);
    });

    it('should return hasLegacyArtifacts: true when config files are found', async () => {
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `${OPENSPEC_MARKERS.start}\nContent\n${OPENSPEC_MARKERS.end}`);

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.configFiles).toContain('CLAUDE.md');
    });

    it('should return hasLegacyArtifacts: true when slash commands are found', async () => {
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.slashCommandDirs).toContain('.claude/commands/openspec');
    });

    it('should return hasLegacyArtifacts: true when openspec/AGENTS.md is found', async () => {
      await fs.writeFile(path.join(testDir, 'openspec', 'AGENTS.md'), 'content');

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.hasOpenspecAgents).toBe(true);
    });

    it('should NOT count project.md as legacy artifact (it is preserved)', async () => {
      await fs.writeFile(path.join(testDir, 'openspec', 'project.md'), 'content');

      const result = await detectLegacyArtifacts(testDir);
      // project.md alone should not trigger hasLegacyArtifacts
      expect(result.hasLegacyArtifacts).toBe(false);
      expect(result.hasProjectMd).toBe(true);
    });

    it('should combine all detection results', async () => {
      // Create various legacy artifacts
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), `${OPENSPEC_MARKERS.start}\nContent\n${OPENSPEC_MARKERS.end}`);
      await fs.mkdir(path.join(testDir, '.claude', 'commands', 'openspec'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'openspec', 'AGENTS.md'), 'content');
      await fs.writeFile(path.join(testDir, 'openspec', 'project.md'), 'content');

      const result = await detectLegacyArtifacts(testDir);
      expect(result.hasLegacyArtifacts).toBe(true);
      expect(result.configFiles).toContain('CLAUDE.md');
      expect(result.slashCommandDirs).toContain('.claude/commands/openspec');
      expect(result.hasOpenspecAgents).toBe(true);
      expect(result.hasProjectMd).toBe(true);
    });
  });

  describe('cleanupLegacyArtifacts', () => {
    it('should delete config files that are 100% OpenSpec content', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `${OPENSPEC_MARKERS.start}\nContent\n${OPENSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedFiles).toContain('CLAUDE.md');
      await expect(fs.access(claudePath)).rejects.toThrow();
    });

    it('should remove marker block from files with mixed content', async () => {
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, `User instructions
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.modifiedFiles).toContain('CLAUDE.md');
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('User instructions');
      expect(content).not.toContain(OPENSPEC_MARKERS.start);
    });

    it('should delete legacy slash command directories', async () => {
      const dirPath = path.join(testDir, '.claude', 'commands', 'openspec');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'proposal.md'), 'content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedDirs).toContain('.claude/commands/openspec');
      await expect(fs.access(dirPath)).rejects.toThrow();
      // Parent directory should still exist
      await expect(fs.access(path.join(testDir, '.claude', 'commands'))).resolves.not.toThrow();
    });

    it('should delete legacy slash command files', async () => {
      const dirPath = path.join(testDir, '.cursor', 'commands');
      await fs.mkdir(dirPath, { recursive: true });
      const filePath = path.join(dirPath, 'openspec-proposal.md');
      await fs.writeFile(filePath, 'content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedFiles).toContain('.cursor/commands/openspec-proposal.md');
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should delete openspec/AGENTS.md', async () => {
      const agentsPath = path.join(testDir, 'openspec', 'AGENTS.md');
      await fs.writeFile(agentsPath, 'content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedFiles).toContain('openspec/AGENTS.md');
      await expect(fs.access(agentsPath)).rejects.toThrow();
      // openspec directory should still exist
      await expect(fs.access(path.join(testDir, 'openspec'))).resolves.not.toThrow();
    });

    it('should NOT delete openspec/project.md', async () => {
      const projectPath = path.join(testDir, 'openspec', 'project.md');
      await fs.writeFile(projectPath, 'User project content');

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.projectMdNeedsMigration).toBe(true);
      expect(result.deletedFiles).not.toContain('openspec/project.md');
      await expect(fs.access(projectPath)).resolves.not.toThrow();
    });

    it('should handle root AGENTS.md with mixed content', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, `User content
${OPENSPEC_MARKERS.start}
OpenSpec content
${OPENSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.modifiedFiles).toContain('AGENTS.md');
      const content = await fs.readFile(agentsPath, 'utf-8');
      expect(content).toContain('User content');
      expect(content).not.toContain(OPENSPEC_MARKERS.start);
    });

    it('should delete root AGENTS.md when only OpenSpec content', async () => {
      const agentsPath = path.join(testDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, `${OPENSPEC_MARKERS.start}\nOpenSpec content\n${OPENSPEC_MARKERS.end}`);

      const detection = await detectLegacyArtifacts(testDir);
      const result = await cleanupLegacyArtifacts(testDir, detection);

      expect(result.deletedFiles).toContain('AGENTS.md');
      await expect(fs.access(agentsPath)).rejects.toThrow();
    });

    it('should report errors without stopping cleanup', async () => {
      // Create a valid detection result with a non-existent file to simulate error
      const detection = {
        configFiles: ['NON_EXISTENT.md'],
        configFilesToDelete: ['NON_EXISTENT.md'],
        configFilesWithMixedContent: [],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasOpenspecAgents: false,
        hasProjectMd: false,
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
        projectMdNeedsMigration: false,
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
        deletedDirs: ['.claude/commands/openspec'],
        projectMdNeedsMigration: false,
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('✓ Removed .claude/commands/openspec/ (replaced by /opsx:*)');
    });

    it('should format modified files', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: ['AGENTS.md'],
        deletedDirs: [],
        projectMdNeedsMigration: false,
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('✓ Removed OpenSpec markers from AGENTS.md');
    });

    it('should include migration hint for project.md', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: [],
        deletedDirs: [],
        projectMdNeedsMigration: true,
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toContain('Manual migration needed:');
      expect(summary).toContain('openspec/project.md still exists');
      expect(summary).toContain('config.yaml');
    });

    it('should include errors', () => {
      const result = {
        deletedFiles: [],
        modifiedFiles: [],
        deletedDirs: [],
        projectMdNeedsMigration: false,
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
        projectMdNeedsMigration: false,
        errors: [],
      };

      const summary = formatCleanupSummary(result);
      expect(summary).toBe('');
    });
  });

  describe('formatDetectionSummary', () => {
    it('should format config files', () => {
      const detection = {
        configFiles: ['CLAUDE.md', 'CLINE.md'],
        configFilesToDelete: ['CLAUDE.md'],
        configFilesWithMixedContent: ['CLINE.md'],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasOpenspecAgents: false,
        hasProjectMd: false,
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Config files with OpenSpec markers:');
      expect(summary).toContain('• CLAUDE.md');
      expect(summary).toContain('• CLINE.md');
    });

    it('should format slash command directories', () => {
      const detection = {
        configFiles: [],
        configFilesToDelete: [],
        configFilesWithMixedContent: [],
        slashCommandDirs: ['.claude/commands/openspec'],
        slashCommandFiles: [],
        hasOpenspecAgents: false,
        hasProjectMd: false,
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Legacy slash command directories:');
      expect(summary).toContain('• .claude/commands/openspec/');
    });

    it('should format slash command files', () => {
      const detection = {
        configFiles: [],
        configFilesToDelete: [],
        configFilesWithMixedContent: [],
        slashCommandDirs: [],
        slashCommandFiles: ['.cursor/commands/openspec-proposal.md'],
        hasOpenspecAgents: false,
        hasProjectMd: false,
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Legacy slash command files:');
      expect(summary).toContain('• .cursor/commands/openspec-proposal.md');
    });

    it('should format structure files', () => {
      const detection = {
        configFiles: [],
        configFilesToDelete: [],
        configFilesWithMixedContent: [],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasOpenspecAgents: true,
        hasProjectMd: false,
        hasRootAgentsWithMarkers: false,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('Legacy structure files:');
      expect(summary).toContain('• openspec/AGENTS.md');
    });

    it('should format root AGENTS.md with markers separately', () => {
      const detection = {
        configFiles: [],
        configFilesToDelete: [],
        configFilesWithMixedContent: [],
        slashCommandDirs: [],
        slashCommandFiles: [],
        hasOpenspecAgents: false,
        hasProjectMd: false,
        hasRootAgentsWithMarkers: true,
        hasLegacyArtifacts: true,
      };

      const summary = formatDetectionSummary(detection);
      expect(summary).toContain('• AGENTS.md (has OpenSpec markers)');
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
        path: '.claude/commands/openspec',
      });

      expect(LEGACY_SLASH_COMMAND_PATHS['cursor']).toEqual({
        type: 'files',
        pattern: '.cursor/commands/openspec-*.md',
      });

      expect(LEGACY_SLASH_COMMAND_PATHS['windsurf']).toEqual({
        type: 'files',
        pattern: '.windsurf/workflows/openspec-*.md',
      });
    });

    it('should cover all tools from the SlashCommandRegistry', () => {
      const expectedTools = [
        'claude', 'codebuddy', 'qoder', 'cursor', 'windsurf', 'kilocode',
        'opencode', 'codex', 'github-copilot', 'amazon-q', 'factory',
        'gemini', 'auggie', 'cline', 'crush', 'costrict', 'qwen',
        'roocode', 'antigravity', 'iflow', 'continue',
      ];

      for (const tool of expectedTools) {
        expect(LEGACY_SLASH_COMMAND_PATHS).toHaveProperty(tool);
      }
    });
  });
});
