import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProjectContextTool } from '../../../src/mcp/tools/project-context.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('MCP Project Context Tool', () => {
  let tempDir: string;
  let mockServer: {
    registerTool: ReturnType<typeof vi.fn>;
  };
  let registeredHandler: Function;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-mcp-project-context-test-${Date.now()}`);
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

  describe('registerProjectContextTool', () => {
    it('should register update_project_context tool with correct name and description', () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'update_project_context',
        expect.objectContaining({
          description: expect.stringContaining('Update'),
          inputSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should create project.md with full content', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        content: '# Project Context\n\nThis is my project context.',
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain('updated successfully');

      // Verify file was created
      const projectPath = path.join(tempDir, 'openspec', 'project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toBe('# Project Context\n\nThis is my project context.');
    });

    it('should update specific sections', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create initial project.md
      const openspecDir = path.join(tempDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      await fs.writeFile(
        path.join(openspecDir, 'project.md'),
        '# Project\n\n## Overview\nOriginal overview.\n\n## Tech Stack\nOriginal stack.'
      );

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        sections: {
          'Overview': 'Updated overview content.',
        },
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.updatedSections).toContain('Overview');

      // Verify file was updated
      const projectPath = path.join(tempDir, 'openspec', 'project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toContain('Updated overview content.');
      expect(content).toContain('## Tech Stack');
    });

    it('should add new sections when they do not exist', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      // Create initial project.md
      const openspecDir = path.join(tempDir, 'openspec');
      await fs.mkdir(openspecDir, { recursive: true });
      await fs.writeFile(
        path.join(openspecDir, 'project.md'),
        '# Project\n\n## Overview\nOriginal overview.'
      );

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        sections: {
          'New Section': 'Content for new section.',
        },
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);

      // Verify new section was added
      const projectPath = path.join(tempDir, 'openspec', 'project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toContain('## New Section');
      expect(content).toContain('Content for new section.');
    });

    it('should create project.md when updating sections on empty file', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        sections: {
          'Overview': 'New project overview.',
          'Tech Stack': 'Node.js, TypeScript',
        },
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);

      // Verify file was created with sections
      const projectPath = path.join(tempDir, 'openspec', 'project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toContain('## Overview');
      expect(content).toContain('New project overview.');
      expect(content).toContain('## Tech Stack');
      expect(content).toContain('Node.js, TypeScript');
    });

    it('should return error when neither content nor sections provided', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      // The Zod validation should fail
      await expect(registeredHandler({})).rejects.toThrow();
    });

    it('should handle multiple sections update', async () => {
      const pathConfig: PathConfig = {
        specsRoot: tempDir,
        projectRoot: tempDir,
        isAutoProjectRoot: false,
      };

      registerProjectContextTool(mockServer as unknown as McpServer, pathConfig);

      const result = await registeredHandler({
        sections: {
          'Overview': 'Project overview.',
          'Architecture': 'Microservices architecture.',
          'Dependencies': 'Express, PostgreSQL',
        },
      });

      expect(result.content).toBeDefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.updatedSections).toEqual(['Overview', 'Architecture', 'Dependencies']);

      // Verify all sections were added
      const projectPath = path.join(tempDir, 'openspec', 'project.md');
      const content = await fs.readFile(projectPath, 'utf-8');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Architecture');
      expect(content).toContain('## Dependencies');
    });
  });
});
