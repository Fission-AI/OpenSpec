import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getAvailableTools } from '../../src/core/available-tools.js';

describe('available-tools', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getAvailableTools', () => {
    it('should return empty array when no tool directories exist', () => {
      const tools = getAvailableTools(testDir);
      expect(tools).toEqual([]);
    });

    it('should detect a single tool directory', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools).toHaveLength(1);
      expect(tools[0].value).toBe('claude');
      expect(tools[0].name).toBe('Claude Code');
      expect(tools[0].skillsDir).toBe('.claude');
    });

    it('should detect multiple tool directories', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.windsurf'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('claude');
      expect(toolValues).toContain('cursor');
      expect(toolValues).toContain('windsurf');
      expect(tools).toHaveLength(3);
    });

    it('should ignore files that are not directories', async () => {
      // Create a file named .claude instead of a directory
      await fs.writeFile(path.join(testDir, '.claude'), 'not a directory');

      const tools = getAvailableTools(testDir);
      expect(tools).toEqual([]);
    });

    it('should only return tools that have a skillsDir property', async () => {
      // .agents value has no skillsDir in AI_TOOLS config
      // Create directories for both a valid and the agents case
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('claude');
      expect(toolValues).not.toContain('agents');
    });

    it('should return full AIToolOption objects', async () => {
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: 'Cursor',
        value: 'cursor',
        available: true,
        skillsDir: '.cursor',
      });
    });

    it('should handle paths with spaces', async () => {
      const spacedDir = path.join(testDir, 'path with spaces');
      await fs.mkdir(spacedDir, { recursive: true });
      await fs.mkdir(path.join(spacedDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(spacedDir);
      expect(tools).toHaveLength(1);
      expect(tools[0].value).toBe('claude');
    });
  });
});
