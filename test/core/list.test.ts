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
    it('should handle missing openspec/changes directory', async () => {
      const listCommand = new ListCommand();
      
      await expect(listCommand.execute(tempDir, 'changes')).rejects.toThrow(
        "No OpenSpec changes directory found. Run 'openspec init' first."
      );
    });

    it('should handle empty changes directory', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes');

      expect(logOutput).toEqual(['No active changes found.']);
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

    it('should output JSON for specs mode with id and requirementCount only (no detail)', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');
      await fs.mkdir(path.join(specsDir, 'cap-a'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'cap-a', 'spec.md'),
        '## Purpose\nTest\n## Requirements\n### Requirement: X\nThe system SHALL do X\n#### Scenario: Y\n- **WHEN** a\n- **THEN** b\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs', { json: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toHaveProperty('specs');
      expect(Array.isArray(parsed.specs)).toBe(true);
      expect(parsed.specs.length).toBe(1);
      expect(parsed.specs[0]).toMatchObject({ id: 'cap-a', requirementCount: expect.any(Number) });
      expect(parsed.specs[0]).not.toHaveProperty('title');
      expect(parsed.specs[0]).not.toHaveProperty('overview');
    });

    it('should include title and overview in specs JSON when detail is true', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');
      await fs.mkdir(path.join(specsDir, 'cap-b'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'cap-b', 'spec.md'),
        '# My Cap B Title\n\n## Purpose\nThis is the overview for cap-b.\n\n## Requirements\n### Requirement: R\nSHALL\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs', { json: true, detail: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed.specs.length).toBe(1);
      expect(parsed.specs[0]).toMatchObject({
        id: 'cap-b',
        requirementCount: 1,
        title: 'My Cap B Title',
        overview: 'This is the overview for cap-b.',
      });
    });

    it('should output empty specs array when no specs exist (specs mode + json)', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs', { json: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toEqual({ specs: [] });
    });

    it('should output empty specs array when specs dir missing (specs mode + json)', async () => {
      await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
      // no openspec/specs

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs', { json: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toEqual({ specs: [] });
    });

    it('should list archived changes and output table when not json', async () => {
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.mkdir(path.join(archiveDir, '2025-01-13-add-list-command'), { recursive: true });
      await fs.writeFile(
        path.join(archiveDir, '2025-01-13-add-list-command', 'tasks.md'),
        '- [x] Task 1\n- [ ] Task 2\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'archive');

      expect(logOutput).toContain('Archived changes:');
      expect(logOutput.some(line => line.includes('2025-01-13-add-list-command'))).toBe(true);
    });

    it('should output archivedChanges JSON when archive mode + json', async () => {
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.mkdir(path.join(archiveDir, 'archived-one'), { recursive: true });
      await fs.writeFile(
        path.join(archiveDir, 'archived-one', 'tasks.md'),
        '- [x] Done\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'archive', { json: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toHaveProperty('archivedChanges');
      expect(Array.isArray(parsed.archivedChanges)).toBe(true);
      expect(parsed.archivedChanges.length).toBe(1);
      expect(parsed.archivedChanges[0]).toMatchObject({
        name: 'archived-one',
        completedTasks: 1,
        totalTasks: 1,
        status: 'complete'
      });
      expect(parsed.archivedChanges[0]).toHaveProperty('lastModified');
    });

    it('should output empty archivedChanges when archive dir missing (archive + json)', async () => {
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
      // no archive subdir

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'archive', { json: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toEqual({ archivedChanges: [] });
    });

    it('should output empty archivedChanges when archive dir empty (archive + json)', async () => {
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await fs.mkdir(archiveDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'archive', { json: true });

      const out = logOutput.join('\n');
      const parsed = JSON.parse(out);
      expect(parsed).toEqual({ archivedChanges: [] });
    });

    it('should display No archived changes found when archive empty and not json', async () => {
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await fs.mkdir(archiveDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'archive');

      expect(logOutput).toContain('No archived changes found.');
    });

    it('should apply mode precedence so archive wins over specs when both flags passed (CLI)', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      const archiveDir = path.join(changesDir, 'archive');
      await fs.mkdir(changesDir, { recursive: true });
      await fs.mkdir(path.join(archiveDir, 'precedence-archive'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'openspec', 'specs', 'some-spec'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'specs', 'some-spec', 'spec.md'),
        '## Purpose\nX\n## Requirements\n### Requirement: R\nSHALL\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n'
      );

      const result = await runCLI(['list', '--specs', '--archive', '--json'], { cwd: tempDir });

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty('archivedChanges');
      expect(parsed.archivedChanges.some((c: { name: string }) => c.name === 'precedence-archive')).toBe(true);
    });
  });
});