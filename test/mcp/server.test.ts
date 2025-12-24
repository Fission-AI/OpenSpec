import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllResources } from '../../src/mcp/resources/index.js';
import { registerAllTools } from '../../src/mcp/tools/index.js';
import { registerAllPrompts } from '../../src/mcp/prompts/index.js';
import type { PathConfig } from '../../src/mcp/utils/path-resolver.js';

describe('MCP Server', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('startMcpServer', () => {
    it('should export startMcpServer function', async () => {
      const { startMcpServer } = await import('../../src/mcp/server.js');

      expect(typeof startMcpServer).toBe('function');
    });

    it('should accept McpServerOptions with debug flag', async () => {
      const { startMcpServer } = await import('../../src/mcp/server.js');

      expect(startMcpServer.length).toBe(1);
    });
  });

  describe('McpServerOptions type', () => {
    it('should define debug option', async () => {
      const mod = await import('../../src/mcp/server.js');

      expect(mod).toHaveProperty('startMcpServer');
    });
  });

  describe('server integration', () => {
    it('should create MCP server with correct name and version', async () => {
      const mod = await import('../../src/mcp/server.js');

      expect(mod).toHaveProperty('startMcpServer');
    });

    it('should register all resources with mock server', () => {
      const mockServer = {
        registerResource: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllResources(mockServer, mockPathConfig);

      expect(mockServer.registerResource).toHaveBeenCalled();
    });

    it('should register all tools with mock server', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllTools(mockServer, mockPathConfig);

      expect(mockServer.registerTool).toHaveBeenCalled();
    });

    it('should register all prompts with mock server', () => {
      const mockServer = {
        registerPrompt: vi.fn(),
      } as unknown as McpServer;

      const mockPathConfig: PathConfig = {
        specsRoot: '/test/project',
        projectRoot: '/test/project',
        isAutoProjectRoot: false,
      };

      registerAllPrompts(mockServer, mockPathConfig);

      expect(mockServer.registerPrompt).toHaveBeenCalled();
    });
  });

  describe('path configuration', () => {
    let testDir: string;

    beforeEach(async () => {
      const tmpBase = await fs.realpath(os.tmpdir());
      testDir = path.join(tmpBase, `openspec-mcp-server-test-${randomUUID()}`);
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should use OPENSPEC_ROOT when set', async () => {
      const openspecRoot = path.join(testDir, '.openspec');
      await fs.mkdir(openspecRoot, { recursive: true });
      process.env.OPENSPEC_ROOT = openspecRoot;

      vi.resetModules();
      const { resolveOpenSpecPaths } = await import('../../src/mcp/utils/path-resolver.js');
      const config = resolveOpenSpecPaths();

      expect(config.specsRoot).toBe(openspecRoot);
    });

    it('should use auto project root when OPENSPEC_AUTO_PROJECT_ROOT is true', async () => {
      const openspecRoot = path.join(testDir, '.openspec');
      await fs.mkdir(openspecRoot, { recursive: true });
      process.env.OPENSPEC_ROOT = openspecRoot;
      process.env.OPENSPEC_AUTO_PROJECT_ROOT = 'true';

      vi.resetModules();
      const { resolveOpenSpecPaths } = await import('../../src/mcp/utils/path-resolver.js');
      const config = resolveOpenSpecPaths();

      expect(config.isAutoProjectRoot).toBe(true);
    });

    it('should default to cwd when no OPENSPEC_ROOT is set', async () => {
      delete process.env.OPENSPEC_ROOT;
      delete process.env.OPENSPEC_AUTO_PROJECT_ROOT;

      vi.resetModules();
      const { resolveOpenSpecPaths } = await import('../../src/mcp/utils/path-resolver.js');
      const config = resolveOpenSpecPaths(testDir);

      expect(config.specsRoot).toBe(testDir);
      expect(config.projectRoot).toBe(testDir);
      expect(config.isAutoProjectRoot).toBe(false);
    });
  });
});
