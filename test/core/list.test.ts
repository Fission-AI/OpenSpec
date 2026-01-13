import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { listChanges } from '../../src/core/list.js';

describe('listChanges', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `openspec-list-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('execute', () => {
    it('should handle missing openspec/changes directory', async () => {
      await expect(listChanges(tempDir)).rejects.toThrow(
        "No OpenSpec changes directory found. Run 'openspec init' first."
      );
    });

    it('should handle empty changes directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      const changes = await listChanges(tempDir);
      expect(changes).toEqual([]);
    });

    it('should exclude archive directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });
      await fs.mkdir(path.join(changesDir, 'active-change'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });

      const changes = await listChanges(tempDir);
      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('active-change');
    });

    it('should count tasks correctly', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      const changePath = path.join(changesDir, 'my-change');
      await fs.mkdir(changePath, { recursive: true });
      
      const tasksContent = `
- [x] task 1
- [ ] task 2
- [ ] task 3
`;
      await fs.writeFile(path.join(changePath, 'tasks.md'), tasksContent);

      const changes = await listChanges(tempDir);
      expect(changes[0].completedTasks).toBe(1);
      expect(changes[0].totalTasks).toBe(3);
    });

    it('should show complete status for fully completed changes', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      const changePath = path.join(changesDir, 'done-change');
      await fs.mkdir(changePath, { recursive: true });
      
      const tasksContent = `
- [x] task 1
- [x] task 2
`;
      await fs.writeFile(path.join(changePath, 'tasks.md'), tasksContent);

      const changes = await listChanges(tempDir);
      expect(changes[0].completedTasks).toBe(2);
      expect(changes[0].totalTasks).toBe(2);
    });

    it('should handle changes without tasks.md', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const changes = await listChanges(tempDir);
      expect(changes[0].completedTasks).toBe(0);
      expect(changes[0].totalTasks).toBe(0);
    });

    it('should sort changes alphabetically when sort=name', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'zebra'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'apple'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'middle'), { recursive: true });

      const changes = await listChanges(tempDir, 'name');
      expect(changes.map(c => c.name)).toEqual(['apple', 'middle', 'zebra']);
    });

    it('should handle multiple changes with various states', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      
      // Change 1: In progress
      const c1 = path.join(changesDir, 'active');
      await fs.mkdir(c1, { recursive: true });
      await fs.writeFile(path.join(c1, 'tasks.md'), '- [x] t1\n- [ ] t2');
      
      // Change 2: Done
      const c2 = path.join(changesDir, 'done');
      await fs.mkdir(c2, { recursive: true });
      await fs.writeFile(path.join(c2, 'tasks.md'), '- [x] t1');
      
      // Change 3: No tasks
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const changes = await listChanges(tempDir, 'name');
      expect(changes.length).toBe(3);
      expect(changes.find(c => c.name === 'active')?.completedTasks).toBe(1);
      expect(changes.find(c => c.name === 'done')?.completedTasks).toBe(1);
      expect(changes.find(c => c.name === 'no-tasks')?.completedTasks).toBe(0);
    });
  });
});
