import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerChangesResources } from '../../../src/mcp/resources/changes.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('changes resources', () => {
  let testDir: string;
  let openspecDir: string;
  let changesDir: string;
  let mockServer: McpServer;
  let registerResourceSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-changes-test-${randomUUID()}`);
    openspecDir = path.join(testDir, 'openspec');
    changesDir = path.join(openspecDir, 'changes');
    await fs.mkdir(changesDir, { recursive: true });

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

  it('should register all change resources', () => {
    registerChangesResources(mockServer, createPathConfig());

    expect(registerResourceSpy).toHaveBeenCalledTimes(7);

    // Check changes list
    expect(registerResourceSpy.mock.calls[0][0]).toBe('changes-list');
    expect(registerResourceSpy.mock.calls[0][1]).toBe('openspec://changes');

    // Check individual change (full)
    expect(registerResourceSpy.mock.calls[1][0]).toBe('change');
    expect(registerResourceSpy.mock.calls[1][1]).toBeInstanceOf(ResourceTemplate);

    // Check proposal
    expect(registerResourceSpy.mock.calls[2][0]).toBe('change-proposal');
    expect(registerResourceSpy.mock.calls[2][1]).toBeInstanceOf(ResourceTemplate);

    // Check tasks
    expect(registerResourceSpy.mock.calls[3][0]).toBe('change-tasks');
    expect(registerResourceSpy.mock.calls[3][1]).toBeInstanceOf(ResourceTemplate);

    // Check design
    expect(registerResourceSpy.mock.calls[4][0]).toBe('change-design');
    expect(registerResourceSpy.mock.calls[4][1]).toBeInstanceOf(ResourceTemplate);

    // Check spec deltas list
    expect(registerResourceSpy.mock.calls[5][0]).toBe('change-specs-list');
    expect(registerResourceSpy.mock.calls[5][1]).toBeInstanceOf(ResourceTemplate);

    // Check individual spec delta
    expect(registerResourceSpy.mock.calls[6][0]).toBe('change-spec-delta');
    expect(registerResourceSpy.mock.calls[6][1]).toBeInstanceOf(ResourceTemplate);
  });

  describe('changes list resource', () => {
    it('should return markdown list when changes exist', async () => {
      await fs.mkdir(path.join(changesDir, 'add-feature'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'update-api'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[0][3];
      const mockUri = { href: 'openspec://changes' };
      const result = await handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# Active Changes');
      expect(result.contents[0].text).toContain('[add-feature](openspec://changes/add-feature)');
      expect(result.contents[0].text).toContain('[update-api](openspec://changes/update-api)');
      expect(result.contents[0].text).not.toContain('archive');
    });

    it('should return empty list message when no changes exist', async () => {
      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[0][3];
      const mockUri = { href: 'openspec://changes' };
      const result = await handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# Active Changes');
      expect(result.contents[0].text).toContain('No active changes.');
    });

    it('should handle missing changes directory gracefully', async () => {
      await fs.rm(changesDir, { recursive: true, force: true });

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[0][3];
      const mockUri = { href: 'openspec://changes' };
      const result = await handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('No active changes.');
    });
  });

  describe('individual change resource', () => {
    it('should return all change files when they exist', async () => {
      const changeId = 'add-feature';
      const changePath = path.join(changesDir, changeId);
      await fs.mkdir(changePath, { recursive: true });

      const proposal = '# Proposal\n\nWhy and what.';
      const tasks = '## Tasks\n\n- [ ] Task 1';
      const design = '# Design\n\nTechnical decisions.';

      await fs.writeFile(path.join(changePath, 'proposal.md'), proposal);
      await fs.writeFile(path.join(changePath, 'tasks.md'), tasks);
      await fs.writeFile(path.join(changePath, 'design.md'), design);

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[1][3];
      const mockUri = { href: `openspec://changes/${changeId}` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(3);
      expect(result.contents[0].text).toBe(proposal);
      expect(result.contents[0].uri).toBe(`openspec://changes/${changeId}/proposal`);
      expect(result.contents[1].text).toBe(tasks);
      expect(result.contents[1].uri).toBe(`openspec://changes/${changeId}/tasks`);
      expect(result.contents[2].text).toBe(design);
      expect(result.contents[2].uri).toBe(`openspec://changes/${changeId}/design`);
    });

    it('should return only existing files', async () => {
      const changeId = 'partial-change';
      const changePath = path.join(changesDir, changeId);
      await fs.mkdir(changePath, { recursive: true });

      const proposal = '# Proposal\n\nContent.';
      await fs.writeFile(path.join(changePath, 'proposal.md'), proposal);

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[1][3];
      const mockUri = { href: `openspec://changes/${changeId}` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe(proposal);
    });

    it('should return not found message when change does not exist', async () => {
      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[1][3];
      const mockUri = { href: 'openspec://changes/nonexistent' };
      const result = await handler(mockUri, { changeId: 'nonexistent' });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# nonexistent');
      expect(result.contents[0].text).toContain('Change not found.');
    });
  });

  describe('change file resources', () => {
    it('should return proposal content', async () => {
      const changeId = 'test-change';
      const changePath = path.join(changesDir, changeId);
      await fs.mkdir(changePath, { recursive: true });
      const proposal = '# Proposal\n\nTest proposal.';
      await fs.writeFile(path.join(changePath, 'proposal.md'), proposal);

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[2][3];
      const mockUri = { href: `openspec://changes/${changeId}/proposal` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe(proposal);
    });

    it('should return tasks content', async () => {
      const changeId = 'test-change';
      const changePath = path.join(changesDir, changeId);
      await fs.mkdir(changePath, { recursive: true });
      const tasks = '## Tasks\n\n- [x] Done';
      await fs.writeFile(path.join(changePath, 'tasks.md'), tasks);

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[3][3];
      const mockUri = { href: `openspec://changes/${changeId}/tasks` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe(tasks);
    });

    it('should return design content', async () => {
      const changeId = 'test-change';
      const changePath = path.join(changesDir, changeId);
      await fs.mkdir(changePath, { recursive: true });
      const design = '# Design\n\nTechnical design.';
      await fs.writeFile(path.join(changePath, 'design.md'), design);

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[4][3];
      const mockUri = { href: `openspec://changes/${changeId}/design` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe(design);
    });

    it('should return "Not found" when file does not exist', async () => {
      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[2][3];
      const mockUri = { href: 'openspec://changes/nonexistent/proposal' };
      const result = await handler(mockUri, { changeId: 'nonexistent' });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe('Not found');
    });
  });

  describe('spec deltas list resource', () => {
    it('should return markdown list when spec deltas exist', async () => {
      const changeId = 'add-feature';
      const changePath = path.join(changesDir, changeId, 'specs');
      await fs.mkdir(path.join(changePath, 'user-auth'), { recursive: true });
      await fs.mkdir(path.join(changePath, 'notifications'), { recursive: true });

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[5][3];
      const mockUri = { href: `openspec://changes/${changeId}/specs` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('# Spec Deltas for add-feature');
      expect(result.contents[0].text).toContain(
        '[user-auth](openspec://changes/add-feature/specs/user-auth)'
      );
      expect(result.contents[0].text).toContain(
        '[notifications](openspec://changes/add-feature/specs/notifications)'
      );
    });

    it('should return empty message when no spec deltas exist', async () => {
      const changeId = 'add-feature';
      await fs.mkdir(path.join(changesDir, changeId), { recursive: true });

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[5][3];
      const mockUri = { href: `openspec://changes/${changeId}/specs` };
      const result = await handler(mockUri, { changeId });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('No spec deltas defined.');
    });

    it('should handle missing specs directory gracefully', async () => {
      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[5][3];
      const mockUri = { href: 'openspec://changes/nonexistent/specs' };
      const result = await handler(mockUri, { changeId: 'nonexistent' });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('No spec deltas defined.');
    });
  });

  describe('individual spec delta resource', () => {
    it('should return spec delta content', async () => {
      const changeId = 'add-feature';
      const capability = 'user-auth';
      const specPath = path.join(changesDir, changeId, 'specs', capability);
      await fs.mkdir(specPath, { recursive: true });

      const specContent = '## ADDED Requirements\n\n### Requirement: OAuth Login';
      await fs.writeFile(path.join(specPath, 'spec.md'), specContent);

      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[6][3];
      const mockUri = { href: `openspec://changes/${changeId}/specs/${capability}` };
      const result = await handler(mockUri, { changeId, capability });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toBe(specContent);
    });

    it('should return not found message when spec delta does not exist', async () => {
      registerChangesResources(mockServer, createPathConfig());

      const handler = registerResourceSpy.mock.calls[6][3];
      const mockUri = { href: 'openspec://changes/test/specs/missing' };
      const result = await handler(mockUri, { changeId: 'test', capability: 'missing' });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('Spec delta for missing not found.');
    });
  });
});
