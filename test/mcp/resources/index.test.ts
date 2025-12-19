import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllResources } from '../../../src/mcp/resources/index.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Resources', () => {
  describe('registerAllResources', () => {
    it('should export registerAllResources function', () => {
      expect(typeof registerAllResources).toBe('function');
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
        registerAllResources(mockServer, mockPathConfig);
      }).not.toThrow();
    });

    it('should be a no-op stub pending Task 3 implementation', () => {
      const mockServer = {
        resource: vi.fn(),
        resourceTemplate: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllResources(mockServer, mockPathConfig);

      // Currently a stub - no resources registered yet
      expect(mockServer.resource).not.toHaveBeenCalled();
    });
  });
});
