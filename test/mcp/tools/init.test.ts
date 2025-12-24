import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Init Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-mcp-init-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    mockServer = {
      registerTool: vi.fn(),
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('registerInitTool', () => {
    it('should register init tool with correct name and description', async () => {
      const { registerInitTool } = await import('../../../src/mcp/tools/init.js');
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerInitTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'init',
        expect.objectContaining({
          description: expect.stringContaining('Initialize OpenSpec'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should not define tools parameter in input schema', async () => {
      const { registerInitTool } = await import('../../../src/mcp/tools/init.js');
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerInitTool(mockServer as unknown as McpServer, pathConfig);

      const toolCall = mockServer.registerTool.mock.calls[0];
      const config = toolCall[1];
      const schema = config.inputSchema;
      
      // Verify the schema does NOT have a tools parameter
      expect(schema).not.toHaveProperty('tools');
    });

    it('should accept pathConfig with auto project root', async () => {
      const { registerInitTool } = await import('../../../src/mcp/tools/init.js');
      const customPath = path.join(tempDir, 'custom');
      await fs.mkdir(customPath, { recursive: true });
      
      const pathConfig: PathConfig = {
        specsRoot: customPath,
        projectRoot: tempDir,
        isAutoProjectRoot: true,
      };

      registerInitTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    });
  });
});
