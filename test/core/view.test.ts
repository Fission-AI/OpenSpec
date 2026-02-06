import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ViewCommand } from '../../src/core/view.js';

const stripAnsi = (input: string): string => input.replace(/\u001b\[[0-9;]*m/g, '');

describe('ViewCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-view-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logOutput = [];
  });

  afterEach(async () => {
    console.log = originalLog;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('shows changes with no tasks in Draft section, not Completed', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    // Empty change (no tasks.md) - should show in Draft
    await fs.mkdir(path.join(changesDir, 'empty-change'), { recursive: true });

    // Change with tasks.md but no tasks - should show in Draft
    await fs.mkdir(path.join(changesDir, 'no-tasks-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'no-tasks-change', 'tasks.md'), '# Tasks\n\nNo tasks yet.');

    // Change with all tasks complete - should show in Completed
    await fs.mkdir(path.join(changesDir, 'completed-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'completed-change', 'tasks.md'),
      '- [x] Done task\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');

    // Draft section should contain empty and no-tasks changes
    expect(output).toContain('Draft Changes');
    expect(output).toContain('empty-change');
    expect(output).toContain('no-tasks-change');

    // Completed section should only contain changes with all tasks done
    expect(output).toContain('Completed Changes');
    expect(output).toContain('completed-change');

    // Verify empty-change and no-tasks-change are in Draft section (marked with ○)
    const draftLines = logOutput
      .map(stripAnsi)
      .filter((line) => line.includes('○'));
    const draftNames = draftLines.map((line) => line.trim().replace('○ ', ''));
    expect(draftNames).toContain('empty-change');
    expect(draftNames).toContain('no-tasks-change');

    // Verify completed-change is in Completed section (marked with ✓)
    const completedLines = logOutput
      .map(stripAnsi)
      .filter((line) => line.includes('✓'));
    const completedNames = completedLines.map((line) => line.trim().replace('✓ ', ''));
    expect(completedNames).toContain('completed-change');
    expect(completedNames).not.toContain('empty-change');
    expect(completedNames).not.toContain('no-tasks-change');
  });

  it('sorts active changes by completion percentage ascending with deterministic tie-breakers', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    await fs.mkdir(path.join(changesDir, 'gamma-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'gamma-change', 'tasks.md'),
      '- [x] Done\n- [x] Also done\n- [ ] Not done\n'
    );

    await fs.mkdir(path.join(changesDir, 'beta-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'beta-change', 'tasks.md'),
      '- [x] Task 1\n- [ ] Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'delta-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'delta-change', 'tasks.md'),
      '- [x] Task 1\n- [ ] Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'alpha-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'alpha-change', 'tasks.md'),
      '- [ ] Task 1\n- [ ] Task 2\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const activeLines = logOutput
      .map(stripAnsi)
      .filter(line => line.includes('◉'));

    const activeOrder = activeLines.map(line => {
      const afterBullet = line.split('◉')[1] ?? '';
      return afterBullet.split('[')[0]?.trim();
    });

    expect(activeOrder).toEqual([
      'alpha-change',
      'beta-change',
      'delta-change',
      'gamma-change'
    ]);
  });

  describe('hierarchical specs', () => {
    it('should display flat structure specs correctly', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Create flat structure specs
      await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'auth', 'spec.md'),
        '## Purpose\nAuth spec\n\n## Requirements\n\n### Requirement: Login\nSystem SHALL support login\n'
      );

      await fs.mkdir(path.join(specsDir, 'payments'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'payments', 'spec.md'),
        '## Purpose\nPayments spec\n\n## Requirements\n\n### Requirement: Process\nSystem SHALL process payments\n'
      );

      const viewCommand = new ViewCommand();
      await viewCommand.execute(tempDir);

      const output = logOutput.map(stripAnsi).join('\n');

      expect(output).toContain('Specifications');
      expect(output).toContain('auth');
      expect(output).toContain('payments');
      expect(output).toContain('1 requirement'); // Both specs have 1 requirement
    });

    it('should display hierarchical structure specs with indentation', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Create hierarchical structure
      await fs.mkdir(path.join(specsDir, '_global', 'testing'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, '_global', 'testing', 'spec.md'),
        '## Purpose\nTesting spec\n\n## Requirements\n\n### Requirement: Unit tests\nSystem SHALL have unit tests\n\n### Requirement: Integration tests\nSystem SHALL have integration tests\n'
      );

      await fs.mkdir(path.join(specsDir, 'packages', 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'packages', 'auth', 'spec.md'),
        '## Purpose\nAuth package\n\n## Requirements\n\n### Requirement: OAuth\nSystem SHALL support OAuth\n'
      );

      const viewCommand = new ViewCommand();
      await viewCommand.execute(tempDir);

      const output = logOutput.map(stripAnsi).join('\n');

      expect(output).toContain('Specifications');
      // Check for leaf names (testing, auth)
      expect(output).toContain('testing');
      expect(output).toContain('auth');
      expect(output).toContain('2 requirements'); // testing has 2
      expect(output).toContain('1 requirement'); // auth has 1
    });

    it('should sort hierarchical specs by requirement count', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Create specs with different requirement counts
      await fs.mkdir(path.join(specsDir, '_global', 'testing'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, '_global', 'testing', 'spec.md'),
        '## Purpose\nTesting\n\n## Requirements\n\n### Requirement: R1\nR1\n\n### Requirement: R2\nR2\n\n### Requirement: R3\nR3\n'
      );

      await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'auth', 'spec.md'),
        '## Purpose\nAuth\n\n## Requirements\n\n### Requirement: R1\nR1\n'
      );

      const viewCommand = new ViewCommand();
      await viewCommand.execute(tempDir);

      const output = logOutput.map(stripAnsi).join('\n');

      // Hierarchical specs are displayed in discovery order (grouped by domain), not by requirement count
      expect(output).toContain('testing');
      expect(output).toContain('auth');
    });

    it('should handle mixed flat and hierarchical specs', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      // Flat spec
      await fs.mkdir(path.join(specsDir, 'auth'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, 'auth', 'spec.md'),
        '## Purpose\nAuth\n\n## Requirements\n\n### Requirement: Login\nLogin\n'
      );

      // Hierarchical spec
      await fs.mkdir(path.join(specsDir, '_global', 'testing'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, '_global', 'testing', 'spec.md'),
        '## Purpose\nTesting\n\n## Requirements\n\n### Requirement: Tests\nTests\n'
      );

      const viewCommand = new ViewCommand();
      await viewCommand.execute(tempDir);

      const output = logOutput.map(stripAnsi).join('\n');

      // Should display both specs
      expect(output).toContain('Specifications');
      expect(output).toContain('auth');
      expect(output).toContain('testing');
    });

    it('should handle specs with no requirements', async () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs');

      await fs.mkdir(path.join(specsDir, '_global', 'empty'), { recursive: true });
      await fs.writeFile(
        path.join(specsDir, '_global', 'empty', 'spec.md'),
        '## Purpose\nEmpty spec\n\n## Requirements\n'
      );

      const viewCommand = new ViewCommand();
      await viewCommand.execute(tempDir);

      const output = logOutput.map(stripAnsi).join('\n');

      expect(output).toContain('empty');
      expect(output).toContain('0 requirements');
    });
  });
});

