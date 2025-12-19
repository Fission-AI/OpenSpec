import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../../../src/mcp/tools/index.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Tools', () => {
  describe('registerAllTools', () => {
    it('should export registerAllTools function', () => {
      expect(typeof registerAllTools).toBe('function');
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
        registerAllTools(mockServer, mockPathConfig);
      }).not.toThrow();
    });

    it('should be a no-op stub pending Task 4 implementation', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllTools(mockServer, mockPathConfig);

      // Currently a stub - no tools registered yet
      expect(mockServer.tool).not.toHaveBeenCalled();
    });
  });
});
