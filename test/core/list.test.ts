import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ListCommand } from '../../src/core/list.js';

describe('ListCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-list-test-'));

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
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'my-change'), { recursive: true });
      
      // Create tasks.md with some tasks
      await fs.writeFile(
        path.join(changesDir, 'my-change', 'tasks.md'),
        '- [x] Task 1\n- [ ] Task 2\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('my-change'))).toBe(true);
      expect(logOutput.some(line => line.includes('archive'))).toBe(false);
    });

    it('should count tasks correctly', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'test-change'), { recursive: true });
      
      await fs.writeFile(
        path.join(changesDir, 'test-change', 'tasks.md'),
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
      await fs.mkdir(path.join(changesDir, 'completed-change'), { recursive: true });
      
      await fs.writeFile(
        path.join(changesDir, 'completed-change', 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2\n- [x] Task 3\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('✓ Complete'))).toBe(true);
    });

    it('does not report a change with unfinished sub-tasks as complete (#1485)', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'nested-change'), { recursive: true });

      await fs.writeFile(
        path.join(changesDir, 'nested-change', 'tasks.md'),
        '- [x] 1.1 Parent task\n  - [ ] 1.1.1 Unfinished sub-task\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('1/2 tasks'))).toBe(true);
      expect(logOutput.some(line => line.includes('✓ Complete'))).toBe(false);
    });

    it('should handle changes without tasks.md', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });

    it('should sort changes alphabetically when sort=name', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'zebra'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'alpha'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'middle'), { recursive: true });

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
      await fs.mkdir(path.join(changesDir, 'completed'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'completed', 'tasks.md'),
        '- [x] Task 1\n- [x] Task 2\n'
      );

      // Partial change
      await fs.mkdir(path.join(changesDir, 'partial'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'partial', 'tasks.md'),
        '- [x] Done\n- [ ] Not done\n- [ ] Also not done\n'
      );

      // No tasks
      await fs.mkdir(path.join(changesDir, 'no-tasks'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir);

      expect(logOutput).toContain('Changes:');
      expect(logOutput.some(line => line.includes('completed') && line.includes('✓ Complete'))).toBe(true);
      expect(logOutput.some(line => line.includes('partial') && line.includes('1/3 tasks'))).toBe(true);
      expect(logOutput.some(line => line.includes('no-tasks') && line.includes('No tasks'))).toBe(true);
    });
  });

  describe('lifecycle status', () => {
    async function change(name: string, metadata?: string): Promise<void> {
      const dir = path.join(tempDir, 'openspec', 'changes', name);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'tasks.md'), '- [x] 1.1 Done\n');
      if (metadata !== undefined) {
        await fs.writeFile(path.join(dir, '.openspec.yaml'), metadata);
      }
    }

    it('renders no lifecycle column when no change declares one', async () => {
      await change('a');
      await change('b', 'schema: spec-driven\n');

      await new ListCommand().execute(tempDir, 'changes');

      // A project that never opts in must see byte-identical output.
      expect(logOutput.join('\n')).not.toContain('proposed');
      expect(logOutput.join('\n')).not.toContain('shipped');
    });

    it('renders the column once any change declares one', async () => {
      await change('a');
      await change('b', 'schema: spec-driven\nstatus: shipped\n');

      await new ListCommand().execute(tempDir, 'changes');

      const text = logOutput.join('\n');
      expect(text).toContain('shipped');
      // An undeclared change reads as proposed rather than blank.
      expect(text).toContain('proposed');
    });

    it('filters to shipped changes', async () => {
      await change('a');
      await change('b', 'schema: spec-driven\nstatus: shipped\n');

      await new ListCommand().execute(tempDir, 'changes', { status: 'shipped' });

      const text = logOutput.join('\n');
      expect(text).toContain('b');
      expect(text).not.toMatch(/^\s+a\s/m);
    });

    it('counts an undeclared change as proposed when filtering', async () => {
      await change('a');
      await change('b', 'schema: spec-driven\nstatus: shipped\n');

      await new ListCommand().execute(tempDir, 'changes', { status: 'proposed' });

      const text = logOutput.join('\n');
      expect(text).toContain('a');
      expect(text).not.toContain('shipped');
    });

    it('excludes a change whose status cannot be determined from either filter', async () => {
      await change('a', 'schema: spec-driven\nstatus: shiped\n');
      await change('b', 'schema: spec-driven\nstatus: shipped\n');

      await new ListCommand().execute(tempDir, 'changes', { status: 'shipped' });
      const shippedOnly = logOutput.join('\n');
      logOutput = [];
      await new ListCommand().execute(tempDir, 'changes', { status: 'proposed' });
      const proposedOnly = logOutput.join('\n');

      // A filter is a claim of membership; an undetermined change belongs to
      // neither list rather than to both.
      expect(shippedOnly).toContain('b');
      expect(shippedOnly).not.toMatch(/^\s+a\s/m);
      expect(proposedOnly).toBe("No changes with status 'proposed' found.");
    });

    it('still lists an undetermined change when no filter is given', async () => {
      await change('a', 'schema: spec-driven\nstatus: shiped\n');

      await new ListCommand().execute(tempDir, 'changes');

      expect(logOutput.join('\n')).toContain('a');
    });

    it('says so when a filter matches nothing', async () => {
      await change('a');

      await new ListCommand().execute(tempDir, 'changes', { status: 'shipped' });

      expect(logOutput).toEqual(["No changes with status 'shipped' found."]);
    });

    it('emits the lifecycle key in JSON only when declared', async () => {
      await change('a');
      await change('b', 'schema: spec-driven\nstatus: shipped\n');

      await new ListCommand().execute(tempDir, 'changes', { json: true, sort: 'name' });

      const payload = JSON.parse(logOutput.join('\n'));
      expect(payload.changes[0]).not.toHaveProperty('lifecycle');
      expect(payload.changes[1].lifecycle).toBe('shipped');
      // The pre-existing `status` key still means task progress.
      expect(payload.changes[1].status).toBe('complete');
    });
  });
});
