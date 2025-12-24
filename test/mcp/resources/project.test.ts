import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProjectResource } from '../../../src/mcp/resources/project.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('project resource', () => {
  let testDir: string;
  let openspecDir: string;
  let mockServer: McpServer;
  let registerResourceSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-project-test-${randomUUID()}`);
    openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });

    registerResourceSpy = vi.fn();
    mockServer = {
      registerResource: registerResourceSpy,
    } as unknown as McpServer;
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  function createPathConfig(): PathConfig {
    return {
      specsRoot: testDir,
      projectRoot: testDir,
      isAutoProjectRoot: false,
    };
  }

  it('should register project resource', () => {
    registerProjectResource(mockServer, createPathConfig());

    expect(registerResourceSpy).toHaveBeenCalledTimes(1);
    const call = registerResourceSpy.mock.calls[0];
    expect(call[0]).toBe('project');
    expect(call[1]).toBe('openspec://project');
    expect(call[2]).toMatchObject({
      title: 'Project Context',
      mimeType: 'text/markdown',
    });
    expect(call[2].description.toLowerCase()).toContain('project context');
  });

  it('should return project.md content when file exists', async () => {
    const content = '# My Project\n\nCustom project details.';
    await fs.writeFile(path.join(openspecDir, 'project.md'), content);

    registerProjectResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://project' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toBe(content);
    expect(result.contents[0].uri).toBe('openspec://project');
    expect(result.contents[0].mimeType).toBe('text/markdown');
  });

  it('should return default template when project.md does not exist', async () => {
    registerProjectResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://project' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('# Project Context');
  });

  it('should return default template when openspec directory does not exist', async () => {
    await fs.rm(openspecDir, { recursive: true, force: true });

    registerProjectResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://project' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('# Project Context');
  });
});
