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

    it('should return Windsurf adapter for "windsurf"', () => {
      const adapter = CommandAdapterRegistry.get('windsurf');
      expect(adapter).toBeDefined();
      expect(adapter?.toolId).toBe('windsurf');
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
    it('should return array of all registered adapters', () => {
      const adapters = CommandAdapterRegistry.getAll();
      expect(Array.isArray(adapters)).toBe(true);
      expect(adapters.length).toBeGreaterThanOrEqual(3); // At least Claude, Cursor, Windsurf
    });

    it('should include Claude, Cursor, and Windsurf adapters', () => {
      const adapters = CommandAdapterRegistry.getAll();
      const toolIds = adapters.map((a) => a.toolId);

      expect(toolIds).toContain('claude');
      expect(toolIds).toContain('cursor');
      expect(toolIds).toContain('windsurf');
    });
  });

  describe('has', () => {
    it('should return true for registered tools', () => {
      expect(CommandAdapterRegistry.has('claude')).toBe(true);
      expect(CommandAdapterRegistry.has('cursor')).toBe(true);
      expect(CommandAdapterRegistry.has('windsurf')).toBe(true);
    });

    it('should return false for unregistered tools', () => {
      expect(CommandAdapterRegistry.has('unknown')).toBe(false);
      expect(CommandAdapterRegistry.has('')).toBe(false);
    });
  });

  describe('adapter functionality', () => {
    it('registered adapters should have working getFilePath', () => {
      const claudeAdapter = CommandAdapterRegistry.get('claude');
      const cursorAdapter = CommandAdapterRegistry.get('cursor');
      const windsurfAdapter = CommandAdapterRegistry.get('windsurf');

      expect(claudeAdapter?.getFilePath('test')).toContain('.claude');
      expect(cursorAdapter?.getFilePath('test')).toContain('.cursor');
      expect(windsurfAdapter?.getFilePath('test')).toContain('.windsurf');
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

      // Tools that don't use YAML frontmatter (markdown headers or TOML or plain)
      const noYamlFrontmatter = ['cline', 'kilocode', 'roocode', 'gemini', 'qwen'];

      const adapters = CommandAdapterRegistry.getAll();
      for (const adapter of adapters) {
        const output = adapter.formatFile(content);
        // All adapters should include the body content
        expect(output).toContain('Body content');
        // Only check for YAML frontmatter for tools that use it
        if (!noYamlFrontmatter.includes(adapter.toolId)) {
          expect(output).toContain('---');
        }
      }
    });
  });
});
