import { describe, it, expect } from 'vitest';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';

describe('command-generation/registry', () => {
  describe('get', () => {
    it('should return Claude adapter for "claude"', () => {
      const adapter = CommandAdapterRegistry.get('claude');
      expect(adapter).toBeDefined();
      expect(adapter?.toolId).toBe('claude');
    });

    it('should return Cursor adapter for "cursor"', () => {
      const adapter = CommandAdapterRegistry.get('cursor');
      expect(adapter).toBeDefined();
      expect(adapter?.toolId).toBe('cursor');
    });

    it('should return Codex adapter for "codex"', () => {
      const adapter = CommandAdapterRegistry.get('codex');
      expect(adapter).toBeDefined();
      expect(adapter?.toolId).toBe('codex');
    });

    it('should return Gemini adapter for "gemini"', () => {
      const adapter = CommandAdapterRegistry.get('gemini');
      expect(adapter).toBeDefined();
      expect(adapter?.toolId).toBe('gemini');
    });

    it('should return GitHub Copilot adapter for "github-copilot"', () => {
      const adapter = CommandAdapterRegistry.get('github-copilot');
      expect(adapter).toBeDefined();
      expect(adapter?.toolId).toBe('github-copilot');
    });

    it('should return undefined for removed tools', () => {
      expect(CommandAdapterRegistry.get('windsurf')).toBeUndefined();
      expect(CommandAdapterRegistry.get('cline')).toBeUndefined();
      expect(CommandAdapterRegistry.get('opencode')).toBeUndefined();
    });

    it('should return undefined for unregistered tool', () => {
      const adapter = CommandAdapterRegistry.get('unknown-tool');
      expect(adapter).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const adapter = CommandAdapterRegistry.get('');
      expect(adapter).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return exactly 5 adapters', () => {
      const adapters = CommandAdapterRegistry.getAll();
      expect(adapters.length).toBe(5);
    });

    it('should include all 5 supported tools', () => {
      const adapters = CommandAdapterRegistry.getAll();
      const toolIds = adapters.map((a) => a.toolId);

      expect(toolIds).toContain('claude');
      expect(toolIds).toContain('codex');
      expect(toolIds).toContain('cursor');
      expect(toolIds).toContain('gemini');
      expect(toolIds).toContain('github-copilot');
    });
  });

  describe('has', () => {
    it('should return true for all 5 supported tools', () => {
      expect(CommandAdapterRegistry.has('claude')).toBe(true);
      expect(CommandAdapterRegistry.has('codex')).toBe(true);
      expect(CommandAdapterRegistry.has('cursor')).toBe(true);
      expect(CommandAdapterRegistry.has('gemini')).toBe(true);
      expect(CommandAdapterRegistry.has('github-copilot')).toBe(true);
    });

    it('should return false for removed or unknown tools', () => {
      expect(CommandAdapterRegistry.has('windsurf')).toBe(false);
      expect(CommandAdapterRegistry.has('cline')).toBe(false);
      expect(CommandAdapterRegistry.has('unknown')).toBe(false);
      expect(CommandAdapterRegistry.has('')).toBe(false);
    });
  });

  describe('adapter functionality', () => {
    it('registered adapters should have working getFilePath', () => {
      expect(CommandAdapterRegistry.get('claude')?.getFilePath('test')).toContain('.claude');
      expect(CommandAdapterRegistry.get('cursor')?.getFilePath('test')).toContain('.cursor');
      expect(CommandAdapterRegistry.get('gemini')?.getFilePath('test')).toContain('.gemini');
      expect(CommandAdapterRegistry.get('github-copilot')?.getFilePath('test')).toContain('.github');
    });

    it('registered adapters should have working formatFile', () => {
      const content = {
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        category: 'Test',
        tags: ['tag1'],
        body: 'Body content',
      };

      // Tools that don't use standard YAML frontmatter
      const noYamlFrontmatter = ['gemini'];

      const adapters = CommandAdapterRegistry.getAll();
      for (const adapter of adapters) {
        const output = adapter.formatFile(content);
        expect(output).toContain('Body content');
        if (!noYamlFrontmatter.includes(adapter.toolId)) {
          expect(output).toContain('---');
        }
      }
    });
  });
});
