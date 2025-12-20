import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  loadAgentsMarkdown,
  loadProjectMarkdown,
} from '../../../src/mcp/utils/context-loader.js';
import type { PathConfig } from '../../../src/mcp/utils/path-resolver.js';

describe('context-loader', () => {
  let testDir: string;
  let openspecDir: string;

  beforeEach(async () => {
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-context-test-${randomUUID()}`);
    openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });
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

  describe('loadAgentsMarkdown', () => {
    it('should return file content when AGENTS.md exists', async () => {
      const content = '# Custom Agents Instructions\n\nTest content here.';
      await fs.writeFile(path.join(openspecDir, 'AGENTS.md'), content);

      const result = await loadAgentsMarkdown(createPathConfig());

      expect(result).toBe(content);
    });

    it('should return default template when AGENTS.md does not exist', async () => {
      const result = await loadAgentsMarkdown(createPathConfig());

      expect(result).toContain('# OpenSpec Instructions');
      expect(result).toContain('## Quick Start');
      expect(result).toContain('## Three-Stage Workflow');
    });

    it('should return default template when openspec directory does not exist', async () => {
      await fs.rm(openspecDir, { recursive: true, force: true });

      const result = await loadAgentsMarkdown(createPathConfig());

      expect(result).toContain('# OpenSpec Instructions');
    });
  });

  describe('loadProjectMarkdown', () => {
    it('should return file content when project.md exists', async () => {
      const content = '# My Project\n\nCustom project details.';
      await fs.writeFile(path.join(openspecDir, 'project.md'), content);

      const result = await loadProjectMarkdown(createPathConfig());

      expect(result).toBe(content);
    });

    it('should return default template when project.md does not exist', async () => {
      const result = await loadProjectMarkdown(createPathConfig());

      expect(result).toContain('# Project Context');
      expect(result).toContain('## Purpose');
      expect(result).toContain('## Tech Stack');
      expect(result).toContain('## Project Conventions');
    });

    it('should return default template when openspec directory does not exist', async () => {
      await fs.rm(openspecDir, { recursive: true, force: true });

      const result = await loadProjectMarkdown(createPathConfig());

      expect(result).toContain('# Project Context');
    });
  });
});
