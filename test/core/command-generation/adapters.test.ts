import { describe, it, expect } from 'vitest';
import path from 'path';
import { claudeAdapter } from '../../../src/core/command-generation/adapters/claude.js';
import { cursorAdapter } from '../../../src/core/command-generation/adapters/cursor.js';
import { windsurfAdapter } from '../../../src/core/command-generation/adapters/windsurf.js';
import type { CommandContent } from '../../../src/core/command-generation/types.js';

describe('command-generation/adapters', () => {
  const sampleContent: CommandContent = {
    id: 'explore',
    name: 'OpenSpec Explore',
    description: 'Enter explore mode for thinking',
    category: 'Workflow',
    tags: ['workflow', 'explore', 'experimental'],
    body: 'This is the command body.\n\nWith multiple lines.',
  };

  describe('claudeAdapter', () => {
    it('should have correct toolId', () => {
      expect(claudeAdapter.toolId).toBe('claude');
    });

    it('should generate correct file path', () => {
      const filePath = claudeAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.claude', 'commands', 'opsx', 'explore.md'));
    });

    it('should generate correct file path for different command IDs', () => {
      expect(claudeAdapter.getFilePath('new')).toBe(path.join('.claude', 'commands', 'opsx', 'new.md'));
      expect(claudeAdapter.getFilePath('bulk-archive')).toBe(path.join('.claude', 'commands', 'opsx', 'bulk-archive.md'));
    });

    it('should format file with correct YAML frontmatter', () => {
      const output = claudeAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('tags: [workflow, explore, experimental]');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.\n\nWith multiple lines.');
    });

    it('should handle empty tags', () => {
      const contentNoTags: CommandContent = { ...sampleContent, tags: [] };
      const output = claudeAdapter.formatFile(contentNoTags);
      expect(output).toContain('tags: []');
    });
  });

  describe('cursorAdapter', () => {
    it('should have correct toolId', () => {
      expect(cursorAdapter.toolId).toBe('cursor');
    });

    it('should generate correct file path with opsx- prefix', () => {
      const filePath = cursorAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.cursor', 'commands', 'opsx-explore.md'));
    });

    it('should generate correct file paths for different commands', () => {
      expect(cursorAdapter.getFilePath('new')).toBe(path.join('.cursor', 'commands', 'opsx-new.md'));
      expect(cursorAdapter.getFilePath('bulk-archive')).toBe(path.join('.cursor', 'commands', 'opsx-bulk-archive.md'));
    });

    it('should format file with Cursor-specific frontmatter', () => {
      const output = cursorAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: /opsx-explore');
      expect(output).toContain('id: opsx-explore');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });

    it('should not include tags in Cursor format', () => {
      const output = cursorAdapter.formatFile(sampleContent);
      expect(output).not.toContain('tags:');
    });
  });

  describe('windsurfAdapter', () => {
    it('should have correct toolId', () => {
      expect(windsurfAdapter.toolId).toBe('windsurf');
    });

    it('should generate correct file path', () => {
      const filePath = windsurfAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.windsurf', 'commands', 'opsx', 'explore.md'));
    });

    it('should format file similar to Claude format', () => {
      const output = windsurfAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('tags: [workflow, explore, experimental]');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('cross-platform path handling', () => {
    it('Claude adapter uses path.join for paths', () => {
      // path.join handles platform-specific separators
      const filePath = claudeAdapter.getFilePath('test');
      // On any platform, path.join returns the correct separator
      expect(filePath.split(path.sep)).toEqual(['.claude', 'commands', 'opsx', 'test.md']);
    });

    it('Cursor adapter uses path.join for paths', () => {
      const filePath = cursorAdapter.getFilePath('test');
      expect(filePath.split(path.sep)).toEqual(['.cursor', 'commands', 'opsx-test.md']);
    });

    it('Windsurf adapter uses path.join for paths', () => {
      const filePath = windsurfAdapter.getFilePath('test');
      expect(filePath.split(path.sep)).toEqual(['.windsurf', 'commands', 'opsx', 'test.md']);
    });
  });
});
