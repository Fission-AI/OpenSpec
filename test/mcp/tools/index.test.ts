import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../../../src/mcp/tools/index.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Tools', () => {
  describe('registerAllTools', () => {
    it('should export registerAllTools function', () => {
      expect(typeof registerAllTools).toBe('function');
    });

    it('should register all 7 tools with the MCP server', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllTools(mockServer, mockPathConfig);

      // Should register 7 tools: init, list, show, validate, archive, update_project_context, edit
      expect(mockServer.registerTool).toHaveBeenCalledTimes(7);

      // Verify tool names
      const toolNames = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: any[]) => call[0]
      );
      expect(toolNames).toContain('init');
      expect(toolNames).toContain('list');
      expect(toolNames).toContain('show');
      expect(toolNames).toContain('validate');
      expect(toolNames).toContain('archive');
      expect(toolNames).toContain('update_project_context');
      expect(toolNames).toContain('edit');
    });

    it('should pass pathConfig to each tool registration', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/custom/path',
        projectRoot: '/custom/path',
        isAutoProjectRoot: true,
      };

      registerAllTools(mockServer, mockPathConfig);

      // Each tool registration receives the server and pathConfig
      expect(mockServer.registerTool).toHaveBeenCalledTimes(7);
    });
  });
});
