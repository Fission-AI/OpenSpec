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

  describe('execute - specs mode (flat structure)', () => {
    it('should handle missing specs directory', async () => {
      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      expect(logOutput).toEqual(['No specs found.']);
    });

    it('should list flat structure specs', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Create flat structure specs
      await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'auth', 'spec.md'),
        '## Purpose\nAuth specification\n\n## Requirements\n\n### Requirement: User login\nUser SHALL be able to login\n\n### Requirement: Password reset\nUser SHALL be able to reset password\n'
      );

      await fs.mkdir(path.join(specsDir, 'payments'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'payments', 'spec.md'),
        '## Purpose\nPayments specification\n\n## Requirements\n\n### Requirement: Process payment\nSystem SHALL process payments\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      expect(logOutput).toContain('Specs:');
      expect(logOutput.some(line => line.includes('auth') && line.includes('requirements 2'))).toBe(true);
      expect(logOutput.some(line => line.includes('payments') && line.includes('requirements 1'))).toBe(true);
    });

    it('should sort flat specs alphabetically', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      await fs.mkdir(path.join(specsDir, 'zebra'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'zebra', 'spec.md'), '# Zebra');

      await fs.mkdir(path.join(specsDir, 'alpha'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'alpha', 'spec.md'), '# Alpha');

      await fs.mkdir(path.join(specsDir, 'middle'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'middle', 'spec.md'), '# Middle');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      const specLines = logOutput.filter(line =>
        line.includes('alpha') || line.includes('middle') || line.includes('zebra')
      );

      expect(specLines[0]).toContain('alpha');
      expect(specLines[1]).toContain('middle');
      expect(specLines[2]).toContain('zebra');
    });

    it('should handle empty specs directory', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      expect(logOutput).toEqual(['No specs found.']);
    });

    it('should handle specs with zero requirements', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      await fs.mkdir(path.join(specsDir, 'empty-spec'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'empty-spec', 'spec.md'), '# Empty Spec\n\nNo requirements.');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      expect(logOutput.some(line => line.includes('empty-spec') && line.includes('requirements 0'))).toBe(true);
    });
  });

  describe('execute - specs mode (hierarchical structure)', () => {
    it('should list hierarchical structure specs with indentation', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Create hierarchical structure (depth 2)
      await fs.mkdir(path.join(specsDir, '_global', 'testing'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, '_global', 'testing', 'spec.md'),
        '## Purpose\nTesting specification\n\n## Requirements\n\n### Requirement: Unit tests\nSystem SHALL have unit tests\n\n### Requirement: Integration tests\nSystem SHALL have integration tests\n'
      );

      await fs.mkdir(path.join(specsDir, '_global', 'architecture'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, '_global', 'architecture', 'spec.md'),
        '## Purpose\nArchitecture specification\n\n## Requirements\n\n### Requirement: System design\nSystem SHALL have proper design\n'
      );

      await fs.mkdir(path.join(specsDir, 'packages', 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'packages', 'auth', 'spec.md'),
        '## Purpose\nAuth package specification\n\n## Requirements\n\n### Requirement: OAuth\nSystem SHALL support OAuth\n\n### Requirement: JWT\nSystem SHALL support JWT\n\n### Requirement: Sessions\nSystem SHALL manage sessions\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      expect(logOutput).toContain('Specs:');

      // Check for hierarchical display (leaf names only)
      expect(logOutput.some(line => line.includes('architecture') && line.includes('requirements 1'))).toBe(true);
      expect(logOutput.some(line => line.includes('testing') && line.includes('requirements 2'))).toBe(true);
      expect(logOutput.some(line => line.includes('auth') && line.includes('requirements 3'))).toBe(true);
    });

    it('should handle depth 3 hierarchical specs', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      await fs.mkdir(path.join(specsDir, 'platform', 'services', 'api'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'platform', 'services', 'api', 'spec.md'),
        '## Purpose\nAPI service specification\n\n## Requirements\n\n### Requirement: REST endpoints\nSystem SHALL provide REST endpoints\n\n### Requirement: GraphQL\nSystem SHALL support GraphQL\n'
      );

      await fs.mkdir(path.join(specsDir, 'platform', 'services', 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'platform', 'services', 'auth', 'spec.md'),
        '## Purpose\nAuth service specification\n\n## Requirements\n\n### Requirement: Authentication\nSystem SHALL authenticate users\n'
      );

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      expect(logOutput.some(line => line.includes('api') && line.includes('requirements 2'))).toBe(true);
      expect(logOutput.some(line => line.includes('auth') && line.includes('requirements 1'))).toBe(true);
    });

    it('should sort hierarchical specs alphabetically', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      await fs.mkdir(path.join(specsDir, 'zebra', 'zfeature'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'zebra', 'zfeature', 'spec.md'), '## Purpose\nZebra feature\n\n## Requirements\n\n### Requirement: Z\nZ SHALL work\n');

      await fs.mkdir(path.join(specsDir, 'alpha', 'afeature'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'alpha', 'afeature', 'spec.md'), '## Purpose\nAlpha feature\n\n## Requirements\n\n### Requirement: A\nA SHALL work\n');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      // Since capabilities are sorted as "alpha/afeature" and "zebra/zfeature",
      // alpha should appear before zebra in output
      const outputStr = logOutput.join('\n');
      const alphaIdx = outputStr.indexOf('afeature');
      const zebraIdx = outputStr.indexOf('zfeature');

      expect(alphaIdx).toBeGreaterThan(0); // Should exist
      expect(zebraIdx).toBeGreaterThan(0); // Should exist
      expect(alphaIdx).toBeLessThan(zebraIdx); // Alpha before zebra
    });

    it('should group hierarchical specs with blank lines between top-level groups', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Two different top-level groups
      await fs.mkdir(path.join(specsDir, '_global', 'testing'), { recursive: true });
      await fs.writeFile(path.join(specsDir, '_global', 'testing', 'spec.md'), '# Testing');

      await fs.mkdir(path.join(specsDir, 'packages', 'auth'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'packages', 'auth', 'spec.md'), '# Auth');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      // Should have blank line separating groups
      expect(logOutput.some(line => line === '')).toBe(true);
    });

    it('should handle mixed flat and hierarchical specs', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Flat spec
      await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'auth', 'spec.md'), '## Purpose\nAuth\n\n## Requirements\n\n### Requirement: Login\nSystem SHALL support login\n');

      // Hierarchical spec
      await fs.mkdir(path.join(specsDir, '_global', 'testing'), { recursive: true });
      await fs.writeFile(path.join(specsDir, '_global', 'testing', 'spec.md'), '## Purpose\nTesting\n\n## Requirements\n\n### Requirement: Unit tests\nSystem SHALL have unit tests\n');

      const listCommand = new ListCommand();
      await listCommand.execute(tempDir, 'specs');

      // Should detect as hierarchical and display both
      expect(logOutput.some(line => line.includes('auth'))).toBe(true);
      expect(logOutput.some(line => line.includes('testing'))).toBe(true);
    });
  });
});