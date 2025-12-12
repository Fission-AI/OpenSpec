import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { CompletionProvider } from '../../../src/core/completions/completion-provider.js';

describe('CompletionProvider', () => {
  let testDir: string;
  let provider: CompletionProvider;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    provider = new CompletionProvider(2000, testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getChangeIds', () => {
    it('should return empty array when no changes exist', async () => {
      const changeIds = await provider.getChangeIds();
      expect(changeIds).toEqual([]);
    });

    it('should return active change IDs', async () => {
      // Create openspec/changes directory structure
      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      // Create some changes
      await fs.mkdir(path.join(changesDir, 'change-1'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-1', 'proposal.md'), '# Change 1');

      await fs.mkdir(path.join(changesDir, 'change-2'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-2', 'proposal.md'), '# Change 2');

      const changeIds = await provider.getChangeIds();
      expect(changeIds).toEqual(['change-1', 'change-2']);
    });

    it('should exclude archive directory', async () => {
      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      // Create active change
      await fs.mkdir(path.join(changesDir, 'active-change'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'active-change', 'proposal.md'), '# Active');

      // Create archived change
      await fs.mkdir(path.join(changesDir, 'archive', 'old-change'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'archive', 'old-change', 'proposal.md'), '# Old');

      const changeIds = await provider.getChangeIds();
      expect(changeIds).toEqual(['active-change']);
    });

    it('should cache results for the TTL duration', async () => {
      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      await fs.mkdir(path.join(changesDir, 'change-1'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-1', 'proposal.md'), '# Change 1');

      // First call
      const firstResult = await provider.getChangeIds();
      expect(firstResult).toEqual(['change-1']);

      // Add another change
      await fs.mkdir(path.join(changesDir, 'change-2'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-2', 'proposal.md'), '# Change 2');

      // Second call should return cached result (still only change-1)
      const secondResult = await provider.getChangeIds();
      expect(secondResult).toEqual(['change-1']);
    });

    it('should refresh cache after TTL expires', async () => {
      // Use a very short TTL for testing
      const shortTTLProvider = new CompletionProvider(50, testDir);

      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      await fs.mkdir(path.join(changesDir, 'change-1'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-1', 'proposal.md'), '# Change 1');

      // First call
      const firstResult = await shortTTLProvider.getChangeIds();
      expect(firstResult).toEqual(['change-1']);

      // Add another change
      await fs.mkdir(path.join(changesDir, 'change-2'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-2', 'proposal.md'), '# Change 2');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should now see both changes
      const secondResult = await shortTTLProvider.getChangeIds();
      expect(secondResult).toEqual(['change-1', 'change-2']);
    });
  });

  describe('getSpecIds', () => {
    it('should return empty array when no specs exist', async () => {
      const specIds = await provider.getSpecIds();
      expect(specIds).toEqual([]);
    });

    it('should return spec IDs', async () => {
      const specsDir = path.join(testDir, 'openspec', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      // Create some specs
      await fs.mkdir(path.join(specsDir, 'spec-1'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec-1', 'spec.md'), '# Spec 1');

      await fs.mkdir(path.join(specsDir, 'spec-2'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec-2', 'spec.md'), '# Spec 2');

      const specIds = await provider.getSpecIds();
      expect(specIds).toEqual(['spec-1', 'spec-2']);
    });

    it('should cache results for the TTL duration', async () => {
      const specsDir = path.join(testDir, 'openspec', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      await fs.mkdir(path.join(specsDir, 'spec-1'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec-1', 'spec.md'), '# Spec 1');

      // First call
      const firstResult = await provider.getSpecIds();
      expect(firstResult).toEqual(['spec-1']);

      // Add another spec
      await fs.mkdir(path.join(specsDir, 'spec-2'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec-2', 'spec.md'), '# Spec 2');

      // Second call should return cached result
      const secondResult = await provider.getSpecIds();
      expect(secondResult).toEqual(['spec-1']);
    });

    it('should refresh cache after TTL expires', async () => {
      const shortTTLProvider = new CompletionProvider(50, testDir);

      const specsDir = path.join(testDir, 'openspec', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      await fs.mkdir(path.join(specsDir, 'spec-1'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec-1', 'spec.md'), '# Spec 1');

      const firstResult = await shortTTLProvider.getSpecIds();
      expect(firstResult).toEqual(['spec-1']);

      // Add another spec
      await fs.mkdir(path.join(specsDir, 'spec-2'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec-2', 'spec.md'), '# Spec 2');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const secondResult = await shortTTLProvider.getSpecIds();
      expect(secondResult).toEqual(['spec-1', 'spec-2']);
    });
  });

  describe('getAllIds', () => {
    it('should return both change and spec IDs', async () => {
      const changesDir = path.join(testDir, 'openspec', 'changes');
      const specsDir = path.join(testDir, 'openspec', 'specs');
      await fs.mkdir(changesDir, { recursive: true });
      await fs.mkdir(specsDir, { recursive: true });

      // Create a change
      await fs.mkdir(path.join(changesDir, 'my-change'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'my-change', 'proposal.md'), '# Change');

      // Create a spec
      await fs.mkdir(path.join(specsDir, 'my-spec'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'my-spec', 'spec.md'), '# Spec');

      const result = await provider.getAllIds();
      expect(result).toEqual({
        changeIds: ['my-change'],
        specIds: ['my-spec'],
      });
    });

    it('should return empty arrays when no items exist', async () => {
      const result = await provider.getAllIds();
      expect(result).toEqual({
        changeIds: [],
        specIds: [],
      });
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      await fs.mkdir(path.join(changesDir, 'change-1'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-1', 'proposal.md'), '# Change 1');

      // Populate cache
      await provider.getChangeIds();

      // Clear cache
      provider.clearCache();

      // Add new change
      await fs.mkdir(path.join(changesDir, 'change-2'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-2', 'proposal.md'), '# Change 2');

      // Should see new data immediately
      const result = await provider.getChangeIds();
      expect(result).toEqual(['change-1', 'change-2']);
    });
  });

  describe('getCacheStats', () => {
    it('should report invalid cache when empty', () => {
      const stats = provider.getCacheStats();
      expect(stats.changeCache.valid).toBe(false);
      expect(stats.specCache.valid).toBe(false);
      expect(stats.changeCache.age).toBeUndefined();
      expect(stats.specCache.age).toBeUndefined();
    });

    it('should report valid cache after data is fetched', async () => {
      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      await fs.mkdir(path.join(changesDir, 'change-1'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-1', 'proposal.md'), '# Change 1');

      await provider.getChangeIds();

      const stats = provider.getCacheStats();
      expect(stats.changeCache.valid).toBe(true);
      expect(stats.changeCache.age).toBeDefined();
      expect(stats.changeCache.age).toBeLessThan(100);
    });

    it('should report invalid cache after TTL expires', async () => {
      const shortTTLProvider = new CompletionProvider(50, testDir);

      const changesDir = path.join(testDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      await fs.mkdir(path.join(changesDir, 'change-1'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'change-1', 'proposal.md'), '# Change 1');

      await shortTTLProvider.getChangeIds();

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const stats = shortTTLProvider.getCacheStats();
      expect(stats.changeCache.valid).toBe(false);
      expect(stats.changeCache.age).toBeGreaterThan(50);
    });
  });

  describe('constructor', () => {
    it('should use default TTL of 2000ms', async () => {
      const defaultProvider = new CompletionProvider();
      expect(defaultProvider).toBeDefined();
      // We can verify this behavior by checking cache stats after waiting
    });

    it('should accept custom TTL', async () => {
      const customProvider = new CompletionProvider(5000, testDir);
      expect(customProvider).toBeDefined();
    });

    it('should use process.cwd() as default project root', () => {
      const defaultProvider = new CompletionProvider();
      expect(defaultProvider).toBeDefined();
    });
  });
});
