import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllResources } from '../../../src/mcp/resources/index.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Resources', () => {
  describe('registerAllResources', () => {
    it('should export registerAllResources function', () => {
      expect(typeof registerAllResources).toBe('function');
    });

    it('should register all resource types', () => {
      const mockServer = {
        registerResource: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllResources(mockServer, mockPathConfig);

      // Should register: instructions, project, specs-list, spec, changes-list, change, change-proposal, change-tasks, change-design, change-specs-list, change-spec-delta, archive
      expect(mockServer.registerResource).toHaveBeenCalledTimes(12);
    });

    it('should accept McpServer and PathConfig parameters', () => {
      const mockServer = {
        registerResource: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      expect(() => {
        registerAllResources(mockServer, mockPathConfig);
      }).not.toThrow();
    });
  });
});
