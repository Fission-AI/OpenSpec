import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllPrompts } from '../../../src/mcp/prompts/index.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Prompts', () => {
  describe('registerAllPrompts', () => {
    it('should export registerAllPrompts function', () => {
      expect(typeof registerAllPrompts).toBe('function');
    });

    it('should accept McpServer and PathConfig parameters', () => {
      const mockServer = {} as McpServer;
      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      // Should not throw - currently a stub
      expect(() => {
        registerAllPrompts(mockServer, mockPathConfig);
      }).not.toThrow();
    });

    it('should be a no-op stub pending Task 5 implementation', () => {
      const mockServer = {
        prompt: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllPrompts(mockServer, mockPathConfig);

      // Currently a stub - no prompts registered yet
      expect(mockServer.prompt).not.toHaveBeenCalled();
    });
  });
});
