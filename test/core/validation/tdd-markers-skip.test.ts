import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GateChecker } from '../../../src/core/validation/gate-checker.js';

describe('GateChecker.checkTddMarkers [skip-tdd]', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-tdd-skip-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeTasksFile(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'tasks.md'), content, 'utf-8');
  }

  it('passes when all tasks have TDD markers', () => {
    writeTasksFile([
      '- [x] Implement user model',
      '  > TDD: test_user_model.py',
      '- [x] Add validation logic',
      '  > TDD: test_validation.py',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.total_done).toBe(2);
    expect(result.with_marker).toBe(2);
    expect(result.without_marker).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('fails when non-skip task lacks TDD marker', () => {
    writeTasksFile([
      '- [x] Implement user model',
      '- [x] Add validation logic',
      '  > TDD: test_validation.py',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(false);
    expect(result.without_marker).toContain('Implement user model');
  });

  it('passes when [skip-tdd] task lacks TDD marker', () => {
    writeTasksFile([
      '- [x] Implement user model',
      '  > TDD: test_user_model.py',
      '- [x] Update docs [skip-tdd]',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.total_done).toBe(2);
    expect(result.with_marker).toBe(1);
    expect(result.without_marker).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toContain('Update docs [skip-tdd]');
  });

  it('correctly counts skipped tasks', () => {
    writeTasksFile([
      '- [x] Task A',
      '  > TDD: test_a.py',
      '- [x] Task B [skip-tdd]',
      '- [x] Task C [skip-tdd]',
      '- [x] Task D',
      '  > TDD: test_d.py',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.total_done).toBe(4);
    expect(result.with_marker).toBe(2);
    expect(result.skipped).toHaveLength(2);
    expect(result.without_marker).toHaveLength(0);
  });

  it('handles mix of TDD, skip, and missing markers', () => {
    writeTasksFile([
      '- [x] Task A',
      '  > TDD: test_a.py',
      '- [x] Task B [skip-tdd]',
      '- [x] Task C (missing marker)',
      '- [x] Task D',
      '  > TDD: test_d.py',
      '- [x] Task E [skip-tdd]',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(false);
    expect(result.total_done).toBe(5);
    expect(result.with_marker).toBe(2);
    expect(result.skipped).toHaveLength(2);
    expect(result.without_marker).toHaveLength(1);
    expect(result.without_marker[0]).toBe('Task C (missing marker)');
  });

  it('passes when no tasks exist', () => {
    writeTasksFile('# Tasks\n\nNo tasks yet.\n');

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.total_done).toBe(0);
  });

  it('passes when tasks.md does not exist', () => {
    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.total_done).toBe(0);
  });

  it('ignores unchecked tasks', () => {
    writeTasksFile([
      '- [ ] Pending task without TDD',
      '- [x] Completed task',
      '  > TDD: test_completed.py',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.total_done).toBe(1);
    expect(result.with_marker).toBe(1);
  });

  it('[skip-tdd] in the middle of task description is recognized', () => {
    writeTasksFile([
      '- [x] Refactor config handling [skip-tdd] for simplicity',
    ].join('\n'));

    const checker = new GateChecker();
    const result = checker.checkTddMarkers(tempDir);

    expect(result.passed).toBe(true);
    expect(result.skipped).toHaveLength(1);
    expect(result.without_marker).toHaveLength(0);
  });
});
