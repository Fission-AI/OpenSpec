import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    vi.restoreAllMocks();
    // Restore console.log
    console.log = originalLog;

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('archive options', () => {
    async function writeChange(name: string, tasks = '- [x] Done\n- [ ] Pending\n'): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', name);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasks);
      return changeDir;
    }

    it('lists only archived changes and excludes hidden entries and non-directories', async () => {
      await writeChange('active-change');
      await writeChange('archive/2026-01-01-old-change');
      await writeChange('archive/.hidden');
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await fs.writeFile(path.join(archiveDir, 'README.md'), 'Archive notes');
      await fs.symlink(
        path.join(archiveDir, '2026-01-01-old-change'),
        path.join(archiveDir, 'linked-change'),
        process.platform === 'win32' ? 'junction' : 'dir'
      );

      await new ListCommand().execute(tempDir, 'changes', { archived: true });

      expect(logOutput).toEqual([
        'Archived Changes:',
        '  2026-01-01-old-change     1/2 tasks     just now'
      ]);
    });

    it.each([{ all: true }, { all: true, archived: true }])('groups active and archived text with options %j', async (options) => {
      await writeChange('z-active', '- [x] Done\n');
      await writeChange('a-active', 'No checkboxes\n');
      await writeChange('archive/z-archived', '- [x] Done\n');
      await writeChange('archive/a-archived');

      await new ListCommand().execute(tempDir, 'changes', { ...options, sort: 'name' });

      expect(logOutput).toEqual([
        'Changes:',
        '  a-active     No tasks      just now',
        '  z-active     ✓ Complete    just now',
        '',
        'Archived Changes:',
        '  a-archived     1/2 tasks     just now',
        '  z-archived     ✓ Complete    just now'
      ]);
    });

    it.each([
      [{ archived: true }, 'No archived changes found.'],
      [{ all: true }, 'No changes found.'],
      [{ all: true, archived: true }, 'No changes found.']
    ] as const)('handles a missing changes directory with options %j', async (options, message) => {
      await new ListCommand().execute(tempDir, 'changes', options);
      expect(logOutput).toEqual([message]);
    });

    it('lists active changes with --all when the archive directory is absent', async () => {
      await writeChange('active');

      await new ListCommand().execute(tempDir, 'changes', { all: true });

      expect(logOutput).toEqual(['Changes:', '  active     1/2 tasks     just now']);
    });

    it('lists archived changes with --all when there are no active changes', async () => {
      await writeChange('archive/old');

      await new ListCommand().execute(tempDir, 'changes', { all: true });

      expect(logOutput).toEqual(['Archived Changes:', '  old     1/2 tasks     just now']);
    });

    it.each(['archive', ''] as const)('rejects a malformed changes/%s path', async (entry) => {
      const malformedPath = path.join(tempDir, 'openspec', 'changes', entry);
      await fs.mkdir(path.dirname(malformedPath), { recursive: true });
      await fs.writeFile(malformedPath, 'not a directory');

      await expect(new ListCommand().execute(tempDir, 'changes', { archived: true })).rejects.toThrow();
      expect(logOutput).toEqual([]);
    });

    it.each(['EACCES', 'EIO'])('does not silently hide an unreadable archive (%s)', async (code) => {
      const error = Object.assign(new Error('Cannot read archive'), { code });
      vi.spyOn(fs, 'readdir').mockResolvedValueOnce([]).mockRejectedValueOnce(error);

      await expect(new ListCommand().execute(tempDir, 'changes', { archived: true })).rejects.toBe(error);
      expect(logOutput).toEqual([]);
    });

    it.each([{ archived: true }, { all: true }])('rejects archive options in specs mode: %j', async (options) => {
      await expect(new ListCommand().execute(tempDir, 'specs', options)).rejects.toThrow(
        '--archived and --all can only be used when listing changes.'
      );
      expect(logOutput).toEqual([]);
    });

    it('preserves the exact default JSON shape and excludes archived changes', async () => {
      const changeDir = await writeChange('active');
      await writeChange('archive/old');
      const modified = new Date('2026-01-02T03:04:05.000Z');
      await fs.utimes(path.join(changeDir, 'tasks.md'), modified, modified);

      await new ListCommand().execute(tempDir, 'changes', { json: true });

      expect(logOutput).toEqual([JSON.stringify({
        changes: [{
          name: 'active',
          completedTasks: 1,
          totalTasks: 2,
          lastModified: modified.toISOString(),
          status: 'in-progress'
        }]
      }, null, 2)]);
    });

    it('preserves root metadata and task-derived status in archive JSON', async () => {
      await writeChange('archive/complete', '- [x] Done\n');
      await writeChange('archive/incomplete');
      await writeChange('archive/no-tasks', 'No checkboxes\n');
      const root = { path: path.join(tempDir, 'openspec'), source: 'nearest' as const };

      await new ListCommand().execute(tempDir, 'changes', { archived: true, json: true, sort: 'name', root });

      const result = JSON.parse(logOutput[0]);
      expect(result.root).toEqual(root);
      expect(result.changes.map(({ name, status, archived }: { name: string; status: string; archived: boolean }) => ({ name, status, archived }))).toEqual([
        { name: 'complete', status: 'complete', archived: true },
        { name: 'incomplete', status: 'in-progress', archived: true },
        { name: 'no-tasks', status: 'no-tasks', archived: true }
      ]);
    });

    it.each([{ archived: true }, { all: true }])('preserves root metadata in empty JSON: %j', async (options) => {
      const root = { path: path.join(tempDir, 'openspec'), source: 'nearest' as const };

      await new ListCommand().execute(tempDir, 'changes', { ...options, json: true, root });

      expect(JSON.parse(logOutput[0])).toEqual({ changes: [], root });
    });

    it.each([
      ['recent', ['z-archived', 'm-active', 'a-archived']],
      ['name', ['a-archived', 'm-active', 'z-archived']]
    ] as const)('sorts combined JSON by %s and identifies archive membership', async (sort, names) => {
      for (const [name, timestamp] of [
        ['archive/a-archived', '2026-01-01T00:00:00Z'],
        ['m-active', '2026-01-02T00:00:00Z'],
        ['archive/z-archived', '2026-01-03T00:00:00Z']
      ]) {
        const changeDir = await writeChange(name);
        const modified = new Date(timestamp);
        await fs.utimes(path.join(changeDir, 'tasks.md'), modified, modified);
      }

      await new ListCommand().execute(tempDir, 'changes', { all: true, archived: true, json: true, sort });

      const changes = JSON.parse(logOutput[0]).changes;
      expect(changes.map((change: { name: string }) => change.name)).toEqual(names);
      expect(changes.map((change: { name: string; archived: boolean }) => change.archived)).toEqual(
        names.map(name => name !== 'm-active')
      );
    });

    it('uses recursive file modification times for archived changes', async () => {
      const old = await writeChange('archive/old');
      const recent = await writeChange('archive/recent');
      const modified = new Date('2026-01-01T00:00:00Z');
      await fs.utimes(path.join(old, 'tasks.md'), modified, modified);
      await fs.utimes(path.join(recent, 'tasks.md'), modified, modified);
      await fs.mkdir(path.join(recent, 'nested'));
      await fs.writeFile(path.join(recent, 'nested', 'design.md'), 'New design');

      await new ListCommand().execute(tempDir, 'changes', { archived: true, json: true });

      expect(JSON.parse(logOutput[0]).changes.map((change: { name: string }) => change.name)).toEqual(['recent', 'old']);
    });

    it.each([{ archived: true }, { all: true }])('lists archives with nested dangling links using link timestamps: %j', async (options) => {
      const changeDir = await writeChange('archive/linked-change');
      const target = path.join(tempDir, 'shared-notes');
      const link = path.join(changeDir, 'nested', 'notes');
      await fs.mkdir(target);
      await fs.mkdir(path.dirname(link));
      await fs.symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');
      await fs.rmdir(target);
      const modified = new Date('2026-01-01T00:00:00Z');
      await fs.utimes(path.join(changeDir, 'tasks.md'), modified, modified);
      const linkModified = (await fs.lstat(link)).mtime.toISOString();

      await new ListCommand().execute(tempDir, 'changes', { ...options, json: true });

      expect(JSON.parse(logOutput[0]).changes).toEqual([expect.objectContaining({
        name: 'linked-change', archived: true, lastModified: linkModified
      })]);
    });

    it('preserves linked-target modification times for active changes', async () => {
      const changeDir = await writeChange('active');
      const target = path.join(tempDir, 'shared-notes');
      await fs.mkdir(target);
      await fs.symlink(target, path.join(changeDir, 'notes'), process.platform === 'win32' ? 'junction' : 'dir');
      const modified = new Date('2030-01-01T00:00:00Z');
      await fs.utimes(target, modified, modified);

      await new ListCommand().execute(tempDir, 'changes', { json: true });

      expect(JSON.parse(logOutput[0]).changes[0].lastModified).toBe(modified.toISOString());
    });

    it('resolves archived task progress using project-local schema metadata', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'custom-tasks');
      await fs.mkdir(schemaDir, { recursive: true });
      await fs.writeFile(path.join(schemaDir, 'schema.yaml'), [
        'name: custom-tasks',
        'version: 1',
        'description: Nested implementation checklists',
        'artifacts:',
        '  - id: implementation',
        '    generates: "**/checklist.md"',
        '    description: Implementation checklist',
        '    template: tasks.md',
        '    requires: []',
        'apply:',
        '  requires: [implementation]',
        '  tracks: "**/checklist.md"',
        ''
      ].join('\n'));
      const changeDir = await writeChange('archive/custom-change', '- [x] Wrong tasks file\n');
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: custom-tasks\n');
      await fs.mkdir(path.join(changeDir, 'backend'));
      await fs.writeFile(path.join(changeDir, 'backend', 'checklist.md'), '- [x] Parent\n  - [ ] Child\n');
      await fs.mkdir(path.join(changeDir, 'frontend'));
      await fs.writeFile(path.join(changeDir, 'frontend', 'checklist.md'), '- [x] Done\n');

      await new ListCommand().execute(tempDir, 'changes', { archived: true, json: true });

      expect(JSON.parse(logOutput[0]).changes).toEqual([expect.objectContaining({
        name: 'custom-change', completedTasks: 2, totalTasks: 3, status: 'in-progress', archived: true
      })]);
    });
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
});
