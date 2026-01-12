import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runArchive } from '../../src/core/archive-logic.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('runArchive', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-archive-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create openspec structure
    const openspecPath = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspecPath, 'changes'), { recursive: true });
    await fs.mkdir(path.join(openspecPath, 'specs'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should fail if change does not exist', async () => {
    process.chdir(tempDir);
    await expect(runArchive('nonexistent')).rejects.toThrow(/Change 'nonexistent' not found/);
  });

  it('should archive a completed change', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changePath = path.join(changesDir, 'my-change');
    await fs.mkdir(changePath, { recursive: true });
    await fs.writeFile(path.join(changePath, 'tasks.md'), '- [x] task 1');
    await fs.writeFile(path.join(changePath, 'proposal.md'), '# Proposal');

    process.chdir(tempDir);
    const result = await runArchive('my-change', { noValidate: true });

    expect(result.changeName).toBe('my-change');
    expect(result.archiveName).toMatch(/\d{4}-\d{2}-\d{2}-my-change/);
    
    const archivePath = path.join(changesDir, 'archive', result.archiveName);
    expect(await fs.stat(archivePath)).toBeDefined();
    expect(await fs.stat(path.join(archivePath, 'tasks.md'))).toBeDefined();
  });
});