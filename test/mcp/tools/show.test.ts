import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerShowTool } from '../../../src/mcp/tools/show.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Show Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: Function;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-mcp-show-test-${Date.now()}`);
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

  describe('registerShowTool', () => {
    it('should register show tool with correct name and description', () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerShowTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'show',
        expect.objectContaining({
          description: expect.stringContaining('Show details'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should show a change', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Test Change\n\n## Why\nTest reason.\n\n## What Changes\n- **alpha:** Test change'
      );

      registerShowTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        itemName: 'test-change',
        type: 'change',
        json: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.itemName).toBe('test-change');
      expect(parsed.type).toBe('change');
    });

    it('should show a spec', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a spec
      const specDir = path.join(tempDir, 'openspec', 'specs', 'test-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        '# Test Spec\n\n## Purpose\nTest purpose.\n\n## Requirements\n\n### Requirement: Test requirement\n\n#### Scenario: Test scenario\nGiven a test condition\nWhen an action occurs\nThen expected result happens'
      );

      registerShowTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        itemName: 'test-spec',
        type: 'spec',
        json: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.itemName).toBe('test-spec');
      expect(parsed.type).toBe('spec');
    });

    it('should auto-detect type when not provided', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'auto-detect');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Auto Detect Change\n\n## Why\nTest reason.\n\n## What Changes\n- **alpha:** Test change'
      );

      registerShowTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        itemName: 'auto-detect',
        json: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.type).toBe('change');
    });

    it('should return error for non-existent item', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerShowTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        itemName: 'non-existent',
        json: true,
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('not found');
    });
  });
});
