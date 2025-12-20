import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerArchiveResource } from '../../../src/mcp/resources/archive.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('archive resource', () => {
  let testDir: string;
  let openspecDir: string;
  let archiveDir: string;
  let mockServer: McpServer;
  let registerResourceSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-archive-test-${randomUUID()}`);
    openspecDir = path.join(testDir, 'openspec');
    archiveDir = path.join(openspecDir, 'changes', 'archive');
    await fs.mkdir(archiveDir, { recursive: true });

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

  it('should register archive resource', () => {
    registerArchiveResource(mockServer, createPathConfig());

    expect(registerResourceSpy).toHaveBeenCalledTimes(1);
    const call = registerResourceSpy.mock.calls[0];
    expect(call[0]).toBe('archive');
    expect(call[1]).toBe('openspec://archive');
    expect(call[2]).toMatchObject({
      title: 'Archived Changes',
      description: expect.stringContaining('archived'),
      mimeType: 'text/markdown',
    });
  });

  it('should return markdown list when archived changes exist', async () => {
    await fs.mkdir(path.join(archiveDir, '2024-01-15-add-feature'), {
      recursive: true,
    });
    await fs.mkdir(path.join(archiveDir, '2024-01-20-update-api'), {
      recursive: true,
    });
    await fs.mkdir(path.join(archiveDir, '2024-01-10-fix-bug'), {
      recursive: true,
    });

    registerArchiveResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://archive' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('# Archived Changes');
    expect(result.contents[0].text).toContain('- 2024-01-20-update-api');
    expect(result.contents[0].text).toContain('- 2024-01-15-add-feature');
    expect(result.contents[0].text).toContain('- 2024-01-10-fix-bug');
    // Should be sorted newest first
    const lines = result.contents[0].text.split('\n');
    const updateApiIndex = lines.findIndex((l) => l.includes('update-api'));
    const addFeatureIndex = lines.findIndex((l) => l.includes('add-feature'));
    const fixBugIndex = lines.findIndex((l) => l.includes('fix-bug'));
    expect(updateApiIndex).toBeLessThan(addFeatureIndex);
    expect(addFeatureIndex).toBeLessThan(fixBugIndex);
  });

  it('should return empty list message when no archived changes exist', async () => {
    registerArchiveResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://archive' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('# Archived Changes');
    expect(result.contents[0].text).toContain('No archived changes yet.');
  });

  it('should handle missing archive directory gracefully', async () => {
    await fs.rm(archiveDir, { recursive: true, force: true });

    registerArchiveResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://archive' };
    const result = await handler(mockUri);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('No archived changes yet.');
  });

  it('should only include directories, not files', async () => {
    await fs.mkdir(path.join(archiveDir, '2024-01-15-change'), {
      recursive: true,
    });
    await fs.writeFile(path.join(archiveDir, 'readme.txt'), 'Not a change');

    registerArchiveResource(mockServer, createPathConfig());

    const handler = registerResourceSpy.mock.calls[0][3];
    const mockUri = { href: 'openspec://archive' };
    const result = await handler(mockUri);

    expect(result.contents[0].text).toContain('2024-01-15-change');
    expect(result.contents[0].text).not.toContain('readme.txt');
  });
});
