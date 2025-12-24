import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSpecsResources } from '../../../src/mcp/resources/specs.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('specs resources', () => {
  let testDir: string;
  let openspecDir: string;
  let specsDir: string;
  let mockServer: McpServer;
  let registerResourceSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-specs-test-${randomUUID()}`);
    openspecDir = path.join(testDir, 'openspec');
    specsDir = path.join(openspecDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

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

  it('should register specs list and individual spec resources', () => {
    registerSpecsResources(mockServer, createPathConfig());

    expect(registerResourceSpy).toHaveBeenCalledTimes(2);

    // Check specs list registration
    const listCall = registerResourceSpy.mock.calls[0];
    expect(listCall[0]).toBe('specs-list');
    expect(listCall[1]).toBe('openspec://specs');

    // Check individual spec registration
    const specCall = registerResourceSpy.mock.calls[1];
    expect(specCall[0]).toBe('spec');
    expect(specCall[1]).toBeInstanceOf(ResourceTemplate);
  });

  describe('specs list resource', () => {
    it('should return markdown list when specs exist', async () => {
      await fs.mkdir(path.join(specsDir, 'user-auth'), { recursive: true });
      await fs.mkdir(path.join(specsDir, 'payment'), { recursive: true });

      registerSpecsResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[0][3];
      const mockUri = { href: 'openspec://specs' };
      const result = await handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# Specifications');
      expect(result.contents[0].text).toContain('[user-auth](openspec://specs/user-auth)');
      expect(result.contents[0].text).toContain('[payment](openspec://specs/payment)');
    });

    it('should return empty list message when no specs exist', async () => {
      registerSpecsResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[0][3];
      const mockUri = { href: 'openspec://specs' };
      const result = await handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# Specifications');
      expect(result.contents[0].text).toContain('No specifications found.');
    });

    it('should handle missing specs directory gracefully', async () => {
      await fs.rm(specsDir, { recursive: true, force: true });

      registerSpecsResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[0][3];
      const mockUri = { href: 'openspec://specs' };
      const result = await handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('No specifications found.');
    });
  });

  describe('individual spec resource', () => {
    it('should return spec content when spec.md exists', async () => {
      const capability = 'user-auth';
      const specContent = '# User Authentication\n\nSpec content here.';
      await fs.mkdir(path.join(specsDir, capability), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, capability, 'spec.md'),
        specContent
      );

      registerSpecsResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[1][3];
      const mockUri = { href: `openspec://specs/${capability}` };
      const result = await handler(mockUri, { capability });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe(specContent);
      expect(result.contents[0].uri).toBe(`openspec://specs/${capability}`);
      expect(result.contents[0].mimeType).toBe('text/markdown');
    });

    it('should return not found message when spec does not exist', async () => {
      registerSpecsResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[1][3];
      const mockUri = { href: 'openspec://specs/nonexistent' };
      const result = await handler(mockUri, { capability: 'nonexistent' });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# nonexistent');
      expect(result.contents[0].text).toContain('Specification not found.');
    });
  });
});
