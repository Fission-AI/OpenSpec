import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListTool } from '../../../src/mcp/tools/list.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP List Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: Function;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-mcp-list-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create OpenSpec structure
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });

    mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredHandler = handler;
      }),
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('registerListTool', () => {
    it('should register list tool with correct name and description', () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerListTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'list',
        expect.objectContaining({
          description: expect.stringContaining('List active changes'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should list changes mode by default', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1');

      registerListTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({});

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.mode).toBe('changes');
    });

    it('should list specs when mode is specs', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a spec
      const specDir = path.join(tempDir, 'openspec', 'specs', 'test-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(path.join(specDir, 'spec.md'), '# Test Spec\n\n## Purpose\nTest purpose.\n\n## Requirements\n');

      registerListTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({ mode: 'specs' });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.mode).toBe('specs');
    });

    it('should handle empty directories gracefully', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerListTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({ mode: 'changes' });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should return error when openspec directory does not exist', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const pathConfig: PathConfig = {
        specsRoot: emptyDir,
        projectRoot: emptyDir,
        isAutoProjectRoot: false,
      };

      registerListTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({ mode: 'changes' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
    });
  });
});
