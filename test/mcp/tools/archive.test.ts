import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerArchiveTool } from '../../../src/mcp/tools/archive.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Archive Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: Function;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-mcp-archive-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create OpenSpec structure
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'archive'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });

    mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredHandler = handler;
      }),
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('registerArchiveTool', () => {
    it('should register archive tool with correct name and description', () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerArchiveTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'archive',
        expect.objectContaining({
          description: expect.stringContaining('Archive'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should archive a change successfully', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2'
      );

      registerArchiveTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        changeName: 'test-change',
        skipSpecs: true,
        noValidate: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.changeName).toBe('test-change');
      expect(parsed.message).toContain('archived successfully');

      // Verify change was moved to archive
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      expect(archives[0]).toContain('test-change');
    });

    it('should return error for non-existent change', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerArchiveTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        changeName: 'non-existent',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('not found');
    });

    it('should respect skipSpecs option', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change with specs
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'skip-specs-change');
      const changeSpecDir = path.join(changeDir, 'specs', 'alpha');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] Done'
      );
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: Test\n\n#### Scenario: Test\nGiven test\nWhen test\nThen test'
      );

      registerArchiveTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        changeName: 'skip-specs-change',
        skipSpecs: true,
        noValidate: true,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);

      // Verify main spec was NOT created
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'alpha', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
    });

    it('should respect noValidate option', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'no-validate-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] Task'
      );

      registerArchiveTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        changeName: 'no-validate-change',
        noValidate: true,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });
});
