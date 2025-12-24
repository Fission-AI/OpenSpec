import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerInstructionsResource } from '../../../src/mcp/resources/instructions.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('instructions resource', () => {
  let testDir: string;
  let openspecDir: string;
  let mockServer: McpServer;
  let registerResourceSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-instructions-test-${randomUUID()}`);
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

  it('should register instructions resource', () => {
    registerInstructionsResource(mockServer, createPathConfig());

    expect(registerResourceSpy).toHaveBeenCalledTimes(1);
    const call = registerResourceSpy.mock.calls[0];
    expect(call[0]).toBe('instructions');
    expect(call[1]).toBe('openspec://instructions');
    expect(call[2]).toMatchObject({
      title: 'OpenSpec Instructions',
      description: expect.stringContaining('AGENTS.md'),
      mimeType: 'text/markdown',
    });
  });

  it('should return AGENTS.md content when file exists', async () => {
    const content = '# Custom Agents Instructions\n\nTest content here.';
    await fs.writeFile(path.join(openspecDir, 'AGENTS.md'), content);

    registerInstructionsResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://instructions' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toBe(content);
    expect(result.contents[0].uri).toBe('openspec://instructions');
    expect(result.contents[0].mimeType).toBe('text/markdown');
  });

  it('should return default template when AGENTS.md does not exist', async () => {
    registerInstructionsResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://instructions' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('# OpenSpec Instructions');
  });

  it('should return default template when openspec directory does not exist', async () => {
    await fs.rm(openspecDir, { recursive: true, force: true });

    registerInstructionsResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://instructions' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('# OpenSpec Instructions');
  });
});
