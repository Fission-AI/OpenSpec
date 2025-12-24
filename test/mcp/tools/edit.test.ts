import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerEditTool } from '../../../src/mcp/tools/edit.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Edit Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: Function;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    tempDir = path.join(tmpBase, `openspec-mcp-edit-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredHandler = handler;
      }),
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function createPathConfig(): PathConfig {
    return {
      specsRoot: tempDir,
      projectRoot: tempDir,
      isAutoProjectRoot: false,
    };
  }

  describe('registerEditTool', () => {
    it('should register edit tool with correct name and description', () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'edit',
        expect.objectContaining({
          description: expect.stringContaining('Create or update'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should create proposal.md', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'proposal',
        content: '# Change: Add Feature\n\n## Why\n\nReason here.',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.resourceType).toBe('proposal');
      expect(parsed.resourceUri).toBe('openspec://changes/add-feature/proposal');

      const proposalPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'proposal.md'
      );
      const content = await fs.readFile(proposalPath, 'utf-8');
      expect(content).toBe('# Change: Add Feature\n\n## Why\n\nReason here.');
    });

    it('should create tasks.md', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'tasks',
        content: '## 1. Implementation\n\n- [ ] 1.1 Create model',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.resourceType).toBe('tasks');
      expect(parsed.resourceUri).toBe('openspec://changes/add-feature/tasks');

      const tasksPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'tasks.md'
      );
      const content = await fs.readFile(tasksPath, 'utf-8');
      expect(content).toBe('## 1. Implementation\n\n- [ ] 1.1 Create model');
    });

    it('should create design.md', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'design',
        content: '## Context\n\nArchitectural decisions.',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.resourceType).toBe('design');
      expect(parsed.resourceUri).toBe('openspec://changes/add-feature/design');

      const designPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'design.md'
      );
      const content = await fs.readFile(designPath, 'utf-8');
      expect(content).toBe('## Context\n\nArchitectural decisions.');
    });

    it('should create spec delta', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'spec',
        capability: 'user-auth',
        content: '## ADDED Requirements\n\n### Requirement: OAuth Login',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.resourceType).toBe('spec');
      expect(parsed.capability).toBe('user-auth');
      expect(parsed.resourceUri).toBe('openspec://changes/add-feature/specs/user-auth');

      const specPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'specs',
        'user-auth',
        'spec.md'
      );
      const content = await fs.readFile(specPath, 'utf-8');
      expect(content).toBe('## ADDED Requirements\n\n### Requirement: OAuth Login');
    });

    it('should fail when spec type is used without capability', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      await expect(
        registeredHandler({
          changeId: 'add-feature',
          resourceType: 'spec',
          content: '## ADDED Requirements',
        })
      ).rejects.toThrow();
    });

    it('should update existing files', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      // Create initial file
      await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'proposal',
        content: 'Initial content',
      });

      // Update the file
      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'proposal',
        content: 'Updated content',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);

      const proposalPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'proposal.md'
      );
      const content = await fs.readFile(proposalPath, 'utf-8');
      expect(content).toBe('Updated content');
    });

    it('should create multiple spec deltas for different capabilities', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'spec',
        capability: 'user-auth',
        content: '## ADDED Requirements\n\n### Requirement: OAuth',
      });

      await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'spec',
        capability: 'notifications',
        content: '## ADDED Requirements\n\n### Requirement: Email Notifications',
      });

      const authPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'specs',
        'user-auth',
        'spec.md'
      );
      const notifyPath = path.join(
        tempDir,
        'openspec',
        'changes',
        'add-feature',
        'specs',
        'notifications',
        'spec.md'
      );

      const authContent = await fs.readFile(authPath, 'utf-8');
      const notifyContent = await fs.readFile(notifyPath, 'utf-8');

      expect(authContent).toContain('OAuth');
      expect(notifyContent).toContain('Email Notifications');
    });

    it('should return suggested next actions for proposal', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'proposal',
        content: '# Proposal',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.suggestedNextActions).toContain(
        "Create tasks using edit tool with resourceType='tasks'"
      );
    });

    it('should return suggested next actions for spec', async () => {
      registerEditTool(mockServer as unknown as McpServer, createPathConfig());

      const result = await registeredHandler({
        changeId: 'add-feature',
        resourceType: 'spec',
        capability: 'user-auth',
        content: '## ADDED Requirements',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.suggestedNextActions).toContainEqual(
        expect.stringContaining('openspec://changes/add-feature/specs/user-auth')
      );
    });
  });
});
