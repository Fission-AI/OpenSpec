import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerValidateTool } from '../../../src/mcp/tools/validate.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Validate Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: Function;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-mcp-validate-test-${Date.now()}`);
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
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('registerValidateTool', () => {
    it('should register validate tool with correct name and description', () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'validate',
        expect.objectContaining({
          description: expect.stringContaining('Validate'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should validate a spec', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a valid spec
      const specDir = path.join(tempDir, 'openspec', 'specs', 'valid-spec');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `# Valid Spec

## Purpose
This is a test specification.

## Requirements

### Requirement: Test requirement SHALL pass validation

#### Scenario: Validation succeeds
- **GIVEN** a valid spec
- **WHEN** validation runs
- **THEN** it passes`
      );

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        itemName: 'valid-spec',
        type: 'spec',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should validate a change with deltas', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create a change with delta specs
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'valid-change');
      const deltaDir = path.join(changeDir, 'specs', 'alpha');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Valid Change\n\n## Why\nTest reason.\n\n## What Changes\n- **alpha:** Test change'
      );
      await fs.writeFile(
        path.join(deltaDir, 'spec.md'),
        `## ADDED Requirements

### Requirement: New feature SHALL work correctly

#### Scenario: Feature works
- **GIVEN** the new feature
- **WHEN** it is used
- **THEN** it works correctly`
      );

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        itemName: 'valid-change',
        type: 'change',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should validate all changes with --changes flag', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        changes: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should validate all specs with --specs flag', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        specs: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should validate all with --all flag', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        all: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should support strict mode', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerValidateTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        all: true,
        strict: true,
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });
});
