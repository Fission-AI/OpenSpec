import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ListCommand } from '../../src/core/list.js';

async function scaffoldChange(
  changesDir: string,
  changeId: string,
  tasksContent?: string
): Promise<void> {
  const changeDir = path.join(changesDir, ...changeId.split('/'));
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
  if (tasksContent !== undefined) {
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
  }
}

describe('ListCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `openspec-list-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Mock console.log to capture output
    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
    logOutput = [];
  });

  afterEach(async () => {
    // Restore console.log
    console.log = originalLog;

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('execute', () => {
    it('should treat a missing openspec/changes directory as no active changes', async () => {
      const listCommand = new ListCommand();

      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toEqual(['No active changes found.']);
    });

    it('should handle empty changes directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toEqual(['No active changes found.']);
    });

    it('should not report a malformed openspec/changes path as empty', async () => {
      await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'openspec', 'changes'), 'not a directory\n');

      const listCommand = new ListCommand();

      await expect(listCommand.execute(tempDir, 'changes')).rejects.toThrow();
      expect(logOutput).toEqual([]);
    });

    it('should exclude archive directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'archive', 'legacy-change'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'archive', 'legacy-change', 'proposal.md'),
        '# Proposal\n'
      );
      await scaffoldChange(changesDir, 'my-change', '- [x] Task 1\n- [ ] Task 2\n');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('my-change'))).toBe(true);
      expect(logOutput.some(line => line.includes('archive'))).toBe(false);
    });

    it('should count tasks correctly', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await scaffoldChange(
        changesDir,
        'test-change',
        `# Tasks
- [x] Completed task 1
- [x] Completed task 2
- [ ] Incomplete task 1
- [ ] Incomplete task 2
- [ ] Incomplete task 3
Regular text that should be ignored
`
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('2/5 tasks'))).toBe(true);
    });

    it('should show complete status for fully completed changes', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await scaffoldChange(
        changesDir,
        'completed-change',
        '- [x] Task 1\n- [x] Task 2\n- [x] Task 3\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('Complete'))).toBe(true);
    });

    it('should handle changes without tasks.md', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await scaffoldChange(changesDir, 'no-tasks');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });

    it('should sort changes alphabetically when sort=name', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await scaffoldChange(changesDir, 'zebra');
      await scaffoldChange(changesDir, 'alpha');
      await scaffoldChange(changesDir, 'middle');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { sort: 'name' });

      const changeLines = logOutput.filter(line =>
        line.includes('alpha') || line.includes('middle') || line.includes('zebra')
      );

      expect(changeLines[0]).toContain('alpha');
      expect(changeLines[1]).toContain('middle');
      expect(changeLines[2]).toContain('zebra');
    });

    it('should handle multiple changes with various states', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      
      // Complete change
      await scaffoldChange(changesDir, 'completed', '- [x] Task 1\n- [x] Task 2\n');

      // Partial change
      await scaffoldChange(changesDir, 'partial', '- [x] Done\n- [ ] Not done\n- [ ] Also not done\n');

      // No tasks
      await scaffoldChange(changesDir, 'no-tasks');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir);

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('completed') && line.includes('Complete'))).toBe(true);
      expect(logOutput.some(line => line.includes('partial') && line.includes('1/3 tasks'))).toBe(true);
      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });

    it('should include nested change ids discovered recursively', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await scaffoldChange(changesDir, 'platform/api/add-auth', '- [ ] Task 1\n');
      await scaffoldChange(changesDir, 'root-change', '- [ ] Task 1\n');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', { sort: 'name' });

      const changeLines = logOutput.filter(line =>
        line.includes('platform/api/add-auth') || line.includes('root-change')
      );

      expect(changeLines[0]).toContain('platform/api/add-auth');
      expect(changeLines[1]).toContain('root-change');
    });

    it('lists recursively discovered spec IDs with forward slashes', async () => {
      const specDir = path.join(tempDir, 'openspec', 'specs', 'auth', 'oauth', 'login');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        '## Purpose\nLogin.\n\n## Requirements\n\n### Requirement: Login\nLogin SHALL work.\n'
      );

      await new ListCommand().execute(tempDir, 'specs', { json: true });

      expect(JSON.parse(logOutput.join('\n')).specs).toEqual([
        { id: 'auth/oauth/login', requirementCount: 1 },
      ]);
    });
  });
});
