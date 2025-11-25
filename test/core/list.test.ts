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

    it('should sort changes alphabetically', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(path.join(changesDir, 'zebra'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'alpha'), { recursive: true });
      await fs.mkdir(path.join(changesDir, 'middle'), { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir);

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

    it('should output JSON for changes when --json flag is used', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      
      // Create test changes
      await fs.mkdir(path.join(changesDir, 'change-a'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'change-a', 'tasks.md'),
        '- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3\n'
      );

      await fs.mkdir(path.join(changesDir, 'change-b'), { recursive: true });
      await fs.writeFile(
        path.join(changesDir, 'change-b', 'tasks.md'),
        '- [x] Done\n- [x] Also done\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', true);

      // Should output valid JSON array
      expect(logOutput.length).toBe(1);
      const output = logOutput[0];
      
      // Parse as JSON
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      
      // Check structure and values
      expect(parsed[0]).toEqual({
        name: 'change-a',
        completedTasks: 1,
        totalTasks: 3
      });
      
      expect(parsed[1]).toEqual({
        name: 'change-b',
        completedTasks: 2,
        totalTasks: 2
      });
    });

    it('should output empty array for empty changes with --json', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      await fs.mkdir(changesDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', true);

      expect(logOutput.length).toBe(1);
      const parsed = JSON.parse(logOutput[0]);
      expect(parsed).toEqual([]);
    });

    it('should output JSON for specs when --json flag is used', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');
      
      // Create test specs
      await fs.mkdir(path.join(specsDir, 'spec-alpha'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'spec-alpha', 'spec.md'),
        `# Spec Alpha

## Purpose
This spec defines alpha functionality.

## Requirements

### Requirement: First
The system SHALL do something.

#### Scenario: Test one
- **WHEN** something happens
- **THEN** result occurs

### Requirement: Second
The system SHALL do another thing.

#### Scenario: Test two
- **WHEN** another thing happens
- **THEN** another result occurs
`
      );

      await fs.mkdir(path.join(specsDir, 'spec-beta'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'spec-beta', 'spec.md'),
        `# Spec Beta

## Purpose
This spec defines beta functionality.

## Requirements

### Requirement: Only One
The system SHALL handle this.

#### Scenario: Test
- **WHEN** something happens
- **THEN** result occurs
`
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs', true);

      expect(logOutput.length).toBe(1);
      const parsed = JSON.parse(logOutput[0]);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      
      expect(parsed[0]).toEqual({
        id: 'spec-alpha',
        requirementCount: 2
      });
      
      expect(parsed[1]).toEqual({
        id: 'spec-beta',
        requirementCount: 1
      });
    });

    it('should output empty array for empty specs with --json', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs', true);

      expect(logOutput.length).toBe(1);
      const parsed = JSON.parse(logOutput[0]);
      expect(parsed).toEqual([]);
    });

    it('should maintain alphabetical sort in JSON output', async () => {
      const changesDir = path.join(tempDir, 'openspec', 'changes');
      
      await fs.mkdir(path.join(changesDir, 'zebra'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'zebra', 'tasks.md'), '- [x] Task\n');
      
      await fs.mkdir(path.join(changesDir, 'alpha'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'alpha', 'tasks.md'), '- [x] Task\n');
      
      await fs.mkdir(path.join(changesDir, 'middle'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'middle', 'tasks.md'), '- [x] Task\n');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'changes', true);

      const parsed = JSON.parse(logOutput[0]);
      expect(parsed[0].name).toBe('alpha');
      expect(parsed[1].name).toBe('middle');
      expect(parsed[2].name).toBe('zebra');
    });
  });
});