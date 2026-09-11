import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ListCommand } from '../../src/core/list.js';
import { runCLI } from '../helpers/run-cli.js';

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

  describe('entries that cannot be stat-ed', () => {
    // Emacs drops a `.#<file>` lock symlink, pointing at a nonexistent target,
    // next to every file with unsaved edits. One such entry used to fail the
    // whole listing with ENOENT, so `list --json` reported zero changes.
    async function writeChange(name: string): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', name);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n- [ ] Task 2\n');
      return changeDir;
    }

    async function listJson(): Promise<Array<{ name: string; completedTasks: number; totalTasks: number }>> {
      await new ListCommand().execute(tempDir, 'changes', { json: true });
      return JSON.parse(logOutput.join('\n')).changes;
    }

    it.skipIf(process.platform === 'win32')('lists every change while a dangling symlink sits inside one', async () => {
      const changeDir = await writeChange('locked-change');
      await writeChange('other-change');
      await fs.symlink('user@host.4242:1789000000', path.join(changeDir, '.#tasks.md'));

      const changes = await listJson();

      expect(changes.map(change => change.name).sort()).toEqual(['locked-change', 'other-change']);
      expect(changes.find(change => change.name === 'locked-change')).toMatchObject({
        completedTasks: 1,
        totalTasks: 2,
      });
    });

    it.skipIf(process.platform === 'win32')('lists a change holding a dangling symlink in a nested directory', async () => {
      const changeDir = await writeChange('nested-lock');
      await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
      await fs.symlink('missing-target', path.join(changeDir, 'specs', 'billing', '.#spec.md'));

      expect((await listJson()).map(change => change.name)).toEqual(['nested-lock']);
    });

    it.skipIf(process.platform === 'win32')('lists a change holding a symlink loop', async () => {
      const changeDir = await writeChange('loop-change');
      await fs.symlink('loop-b', path.join(changeDir, 'loop-a'));
      await fs.symlink('loop-a', path.join(changeDir, 'loop-b'));

      expect((await listJson()).map(change => change.name)).toEqual(['loop-change']);
    });

    it.skipIf(process.platform === 'win32')('still lists and dates a change holding a valid symlink', async () => {
      const changeDir = await writeChange('linked-change');
      const target = path.join(changeDir, 'notes.md');
      await fs.writeFile(target, 'notes\n');
      const future = new Date('2099-01-01T00:00:00.000Z');
      await fs.utimes(target, future, future);
      await fs.symlink('notes.md', path.join(changeDir, 'notes-link.md'));

      await new ListCommand().execute(tempDir, 'changes', { json: true });
      const [change] = JSON.parse(logOutput.join('\n')).changes;

      expect(change.lastModified).toBe(future.toISOString());
    });

    it.skipIf(process.platform === 'win32')('keeps list --json working end to end', async () => {
      const changeDir = await writeChange('cli-change');
      await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
      await fs.symlink('user@host.4242:1789000000', path.join(changeDir, '.#tasks.md'));
      const home = path.join(tempDir, 'home');
      await fs.mkdir(home, { recursive: true });

      const result = await runCLI(['list', '--json'], {
        cwd: tempDir,
        env: {
          HOME: home,
          XDG_CONFIG_HOME: path.join(home, '.config'),
          XDG_DATA_HOME: path.join(home, '.local', 'share'),
        },
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).changes.map((change: { name: string }) => change.name)).toEqual([
        'cli-change',
      ]);
    }, 60_000);
  });
});
