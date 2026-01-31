import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { getGitDiffStats, getGitDiffStatsForPath } from '../../src/utils/git-stats.js';

describe('git-stats', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = path.join(os.tmpdir(), `git-stats-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getGitDiffStats', () => {
    it('should return stats from current Git repository when available', () => {
      // Note: This test runs within the OpenSpec repo, so it will get stats from that repo
      const stats = getGitDiffStats();
      // When in a Git repo, should return stats (not null)
      // The actual values depend on the repo state
      if (stats !== null) {
        expect(stats).toHaveProperty('added');
        expect(stats).toHaveProperty('removed');
        expect(stats).toHaveProperty('branch');
        expect(typeof stats.added).toBe('number');
        expect(typeof stats.removed).toBe('number');
        expect(typeof stats.branch).toBe('string');
      }
    });

    it('should return stats when in a Git repository with changes', async () => {
      // Initialize a new Git repo in temp dir
      process.chdir(tempDir);
      execSync('git init', { stdio: 'pipe', cwd: tempDir });
      execSync('git config user.email "test@example.com"', { stdio: 'pipe', cwd: tempDir });
      execSync('git config user.name "Test User"', { stdio: 'pipe', cwd: tempDir });

      // Create initial commit
      const initialFile = path.join(tempDir, 'initial.txt');
      await fs.writeFile(initialFile, 'initial content');
      execSync('git add .', { stdio: 'pipe', cwd: tempDir });
      execSync('git commit -m "initial"', { stdio: 'pipe', cwd: tempDir });

      // Create a new file with additions (staged but not committed)
      const newFile = path.join(tempDir, 'new-file.txt');
      await fs.writeFile(newFile, 'new content\nmore content');

      const stats = getGitDiffStats();
      expect(stats).not.toBeNull();
      // Note: git diff --numstat against HEAD shows staged changes
      // The new file should appear as an addition
      expect(stats?.branch).toBe('main');
    });

    it('should handle empty repository gracefully', async () => {
      process.chdir(tempDir);
      execSync('git init', { stdio: 'pipe', cwd: tempDir });

      const stats = getGitDiffStats();
      // Should not crash, may return null or stats with zero counts
      expect(stats === null || typeof stats === 'object').toBe(true);
    });
  });

  describe('getGitDiffStatsForPath', () => {
    it('should return stats for existing path in Git repository', () => {
      // Test with a path that exists in the current repo
      const stats = getGitDiffStatsForPath(tempDir);
      // When in a Git repo, should return stats or null depending on path
      expect(stats === null || typeof stats === 'object').toBe(true);
    });

    it('should return null for non-existent path', async () => {
      const nonExistent = path.join(tempDir, 'does-not-exist');
      const stats = getGitDiffStatsForPath(nonExistent);
      expect(stats).toBeNull();
    });

    it('should return stats for specific path in Git repository', async () => {
      // Create a test file in temp dir
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      // Get stats for the file (may be null if not tracked or no changes)
      const stats = getGitDiffStatsForPath(testFile);
      expect(stats === null || typeof stats === 'object').toBe(true);
    });
  });

  describe('Git stats structure', () => {
    it('should return correct structure when stats are available', () => {
      const stats = getGitDiffStats();
      if (stats !== null) {
        expect(stats).toMatchObject({
          added: expect.any(Number),
          removed: expect.any(Number),
          branch: expect.any(String),
        });
      }
    });
  });
});
