import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runUpdate } from '../../src/core/update-logic.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';

describe('runUpdate', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should fail if OpenSpec is not initialized', async () => {
    await expect(runUpdate(testDir)).rejects.toThrow(/No OpenSpec directory found/);
  });

  it('should update AGENTS.md', async () => {
    const openspecPath = path.join(testDir, '.openspec');
    await fs.mkdir(openspecPath, { recursive: true });
    
    const result = await runUpdate(testDir);
    
    expect(result.updatedFiles).toContain('AGENTS.md');
    const agentsContent = await fs.readFile(path.join(openspecPath, 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('# OpenSpec Instructions');
  });
});
