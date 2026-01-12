import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runInit } from '../../src/core/init-logic.js';

describe('runInit', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-init-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should initialize OpenSpec in a directory', async () => {
    const result = await runInit(tempDir, { tools: [] });
    
    expect(result.projectPath).toBe(path.resolve(tempDir));
    expect(result.openspecDir).toBe('.openspec');
    expect(result.extendMode).toBe(false);

    const openspecPath = path.join(tempDir, '.openspec');
    expect(await fs.stat(openspecPath)).toBeDefined();
    expect(await fs.stat(path.join(openspecPath, 'specs'))).toBeDefined();
    expect(await fs.stat(path.join(openspecPath, 'changes'))).toBeDefined();
    expect(await fs.stat(path.join(openspecPath, 'project.md'))).toBeDefined();
  });

  it('should handle extend mode if openspec directory exists', async () => {
    const openspecPath = path.join(tempDir, '.openspec');
    await fs.mkdir(openspecPath, { recursive: true });
    
    const result = await runInit(tempDir, { tools: [] });
    expect(result.extendMode).toBe(true);
  });

  it('should migrate legacy directory if requested', async () => {
    const legacyPath = path.join(tempDir, 'openspec'); // This is the LEGACY name
    await fs.mkdir(legacyPath, { recursive: true });

    const result = await runInit(tempDir, { tools: [], shouldMigrate: true });
    
    expect(result.migrated).toBe(true);
    expect(result.openspecDir).toBe('.openspec');
    expect(await fs.stat(path.join(tempDir, '.openspec'))).toBeDefined();
  });
});
