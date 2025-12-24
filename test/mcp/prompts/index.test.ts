import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllPrompts } from '../../../src/mcp/prompts/index.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Prompts', () => {
  describe('registerAllPrompts', () => {
    it('should export registerAllPrompts function', () => {
      expect(typeof registerAllPrompts).toBe('function');
    });

    it('should register all 3 prompts with the MCP server', () => {
      const mockServer = {
        registerPrompt: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllPrompts(mockServer, mockPathConfig);

      // Should register 3 prompts: openspec-propose, openspec-apply, openspec-archive
      expect(mockServer.registerPrompt).toHaveBeenCalledTimes(3);

      // Verify prompt names
      const promptNames = (mockServer.registerPrompt as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: any[]) => call[0]
      );
      expect(promptNames).toContain('openspec-propose');
      expect(promptNames).toContain('openspec-apply');
      expect(promptNames).toContain('openspec-archive');
    });

    it('should register prompts with correct titles', () => {
      const mockServer = {
        registerPrompt: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllPrompts(mockServer, mockPathConfig);

      const calls = (mockServer.registerPrompt as ReturnType<typeof vi.fn>).mock.calls;
      
      // Verify each prompt has the correct title
      const proposeCall = calls.find((call: any[]) => call[0] === 'openspec-propose');
      expect(proposeCall?.[1]?.title).toBe('openspec-propose');

      const applyCall = calls.find((call: any[]) => call[0] === 'openspec-apply');
      expect(applyCall?.[1]?.title).toBe('openspec-apply');

      const archiveCall = calls.find((call: any[]) => call[0] === 'openspec-archive');
      expect(archiveCall?.[1]?.title).toBe('openspec-archive');
    });

    it('should pass pathConfig to each prompt registration', () => {
      const mockServer = {
        registerPrompt: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/custom/path',
        projectRoot: '/custom/path',
        isAutoProjectRoot: true,
      };

      registerAllPrompts(mockServer, mockPathConfig);

      // Each prompt registration receives the server and pathConfig
      expect(mockServer.registerPrompt).toHaveBeenCalledTimes(3);
    });
  });
});
