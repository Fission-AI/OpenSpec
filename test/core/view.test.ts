import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { getViewData } from '../../src/core/view-logic.js';

describe('getViewData', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-view-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should fail if OpenSpec is not initialized', async () => {
    await expect(getViewData(tempDir)).rejects.toThrow(/No OpenSpec directory found/);
  });

  it('should return empty dashboard data for new project', async () => {
    const openspecPath = path.join(tempDir, 'openspec');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.mkdir(path.join(openspecPath, 'changes'), { recursive: true });
    await fs.mkdir(path.join(openspecPath, 'specs'), { recursive: true });

    const data = await getViewData(tempDir);
    expect(data.changes.draft).toEqual([]);
    expect(data.changes.active).toEqual([]);
    expect(data.changes.completed).toEqual([]);
    expect(data.specs).toEqual([]);
  });

  it('should categorize changes correctly', async () => {
    const openspecPath = path.join(tempDir, 'openspec');
    const changesDir = path.join(openspecPath, 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    // Draft (no tasks)
    await fs.mkdir(path.join(changesDir, 'draft-change'), { recursive: true });

    // Active (partially complete)
    const activeDir = path.join(changesDir, 'active-change');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'tasks.md'), '- [x] done\n- [ ] pending');

    // Completed
    const doneDir = path.join(changesDir, 'done-change');
    await fs.mkdir(doneDir, { recursive: true });
    await fs.writeFile(path.join(doneDir, 'tasks.md'), '- [x] all done');

    const data = await getViewData(tempDir);
    expect(data.changes.draft.map(c => c.name)).toContain('draft-change');
    expect(data.changes.active.map(c => c.name)).toContain('active-change');
    expect(data.changes.completed.map(c => c.name)).toContain('done-change');
  });
});