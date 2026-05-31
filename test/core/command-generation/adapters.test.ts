import { describe, it, expect } from 'vitest';
import os from 'os';
import path from 'path';
import { claudeAdapter } from '../../../src/core/command-generation/adapters/claude.js';
import { codexAdapter } from '../../../src/core/command-generation/adapters/codex.js';
import { cursorAdapter } from '../../../src/core/command-generation/adapters/cursor.js';
import { geminiAdapter } from '../../../src/core/command-generation/adapters/gemini.js';
import { githubCopilotAdapter } from '../../../src/core/command-generation/adapters/github-copilot.js';
import type { CommandContent } from '../../../src/core/command-generation/types.js';

describe('command-generation/adapters', () => {
  const sampleContent: CommandContent = {
    id: 'explore',
    name: 'Pscode Explore',
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
      expect(filePath).toBe(path.join('.claude', 'commands', 'ps', 'explore.md'));
    });

    it('should generate correct file path for different command IDs', () => {
      expect(claudeAdapter.getFilePath('new')).toBe(path.join('.claude', 'commands', 'ps', 'new.md'));
      expect(claudeAdapter.getFilePath('bulk-archive')).toBe(path.join('.claude', 'commands', 'ps', 'bulk-archive.md'));
    });

    it('should format file with correct YAML frontmatter', () => {
      const output = claudeAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: Pscode Explore');
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

  describe('codexAdapter', () => {
    it('should have correct toolId', () => {
      expect(codexAdapter.toolId).toBe('codex');
    });

    it('should return an absolute path', () => {
      const filePath = codexAdapter.getFilePath('explore');
      expect(path.isAbsolute(filePath)).toBe(true);
    });

    it('should generate path ending with correct structure', () => {
      const filePath = codexAdapter.getFilePath('explore');
      expect(filePath).toMatch(/prompts[/\\]ps-explore\.md$/);
    });

    it('should default to homedir/.codex', () => {
      const original = process.env.CODEX_HOME;
      delete process.env.CODEX_HOME;
      try {
        const filePath = codexAdapter.getFilePath('explore');
        const expected = path.join(os.homedir(), '.codex', 'prompts', 'ps-explore.md');
        expect(filePath).toBe(expected);
      } finally {
        if (original !== undefined) {
          process.env.CODEX_HOME = original;
        }
      }
    });

    it('should respect CODEX_HOME env var', () => {
      const original = process.env.CODEX_HOME;
      process.env.CODEX_HOME = '/custom/codex-home';
      try {
        const filePath = codexAdapter.getFilePath('explore');
        expect(filePath).toBe(path.join(path.resolve('/custom/codex-home'), 'prompts', 'ps-explore.md'));
      } finally {
        if (original !== undefined) {
          process.env.CODEX_HOME = original;
        } else {
          delete process.env.CODEX_HOME;
        }
      }
    });

    it('should format file with description and argument-hint', () => {
      const output = codexAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('argument-hint: command arguments');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('cursorAdapter', () => {
    it('should have correct toolId', () => {
      expect(cursorAdapter.toolId).toBe('cursor');
    });

    it('should generate correct file path with ps- prefix', () => {
      const filePath = cursorAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.cursor', 'commands', 'ps-explore.md'));
    });

    it('should generate correct file paths for different commands', () => {
      expect(cursorAdapter.getFilePath('new')).toBe(path.join('.cursor', 'commands', 'ps-new.md'));
      expect(cursorAdapter.getFilePath('bulk-archive')).toBe(path.join('.cursor', 'commands', 'ps-bulk-archive.md'));
    });

    it('should format file with Cursor-specific frontmatter', () => {
      const output = cursorAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: /ps-explore');
      expect(output).toContain('id: ps-explore');
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

  describe('geminiAdapter', () => {
    it('should have correct toolId', () => {
      expect(geminiAdapter.toolId).toBe('gemini');
    });

    it('should generate correct file path with .toml extension', () => {
      const filePath = geminiAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.gemini', 'commands', 'ps', 'explore.toml'));
    });

    it('should format file in TOML format', () => {
      const output = geminiAdapter.formatFile(sampleContent);
      expect(output).toContain('description = "Enter explore mode for thinking"');
      expect(output).toContain('prompt = """');
      expect(output).toContain('This is the command body.');
      expect(output).toContain('"""');
    });
  });

  describe('githubCopilotAdapter', () => {
    it('should have correct toolId', () => {
      expect(githubCopilotAdapter.toolId).toBe('github-copilot');
    });

    it('should generate correct file path with .prompt.md extension', () => {
      const filePath = githubCopilotAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.github', 'prompts', 'ps-explore.prompt.md'));
    });

    it('should format file with description frontmatter', () => {
      const output = githubCopilotAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('cross-platform path handling', () => {
    it('Claude adapter uses path.join for paths', () => {
      const filePath = claudeAdapter.getFilePath('test');
      expect(filePath.split(path.sep)).toEqual(['.claude', 'commands', 'ps', 'test.md']);
    });

    it('Cursor adapter uses path.join for paths', () => {
      const filePath = cursorAdapter.getFilePath('test');
      expect(filePath.split(path.sep)).toEqual(['.cursor', 'commands', 'ps-test.md']);
    });

    it('All adapters produce valid paths', () => {
      const adapters = [claudeAdapter, codexAdapter, cursorAdapter, geminiAdapter, githubCopilotAdapter];
      for (const adapter of adapters) {
        const filePath = adapter.getFilePath('test');
        expect(filePath.length).toBeGreaterThan(0);
        expect(filePath.includes(path.sep) || filePath.includes('.')).toBe(true);
      }
    });
  });
});
