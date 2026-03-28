import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { GateChecker } from '../../../src/core/validation/gate-checker.js';

describe('GateChecker (7.3 - 7.7)', () => {
  let tmpDir: string;
  let checker: GateChecker;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'openspec-gate-test-'));
    checker = new GateChecker();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── 7.3: checkCapabilityCoverage ─────────────────────────────────────

  describe('checkCapabilityCoverage', () => {
    it('should pass when all proposal capabilities have spec dirs', () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Capabilities',
        '### New Capabilities',
        '- `user-auth`: User authentication',
        '- `data-export`: Data export feature',
      ].join('\n'));
      mkdirSync(path.join(tmpDir, 'specs', 'user-auth'), { recursive: true });
      mkdirSync(path.join(tmpDir, 'specs', 'data-export'), { recursive: true });

      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.proposal_capabilities).toEqual(['user-auth', 'data-export']);
      expect(result.spec_dirs).toContain('user-auth');
      expect(result.spec_dirs).toContain('data-export');
    });

    it('should fail when a capability has no matching spec dir', () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Capabilities',
        '### New Capabilities',
        '- `user-auth`: User authentication',
        '- `data-export`: Data export feature',
        '- `missing-cap`: This one is missing',
      ].join('\n'));
      mkdirSync(path.join(tmpDir, 'specs', 'user-auth'), { recursive: true });
      mkdirSync(path.join(tmpDir, 'specs', 'data-export'), { recursive: true });

      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.missing).toEqual(['missing-cap']);
    });

    it('should pass when proposal has no Capabilities section', () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Why',
        'Some reason',
        '',
        '## What Changes',
        'Some changes',
      ].join('\n'));

      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.proposal_capabilities).toEqual([]);
    });

    it('should pass when proposal.md does not exist', () => {
      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.proposal_capabilities).toEqual([]);
    });

    it('should pass when specs/ dir does not exist but no capabilities listed', () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Why',
        'Some reason',
      ].join('\n'));
      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(true);
    });

    it('should parse table format capabilities', () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Capabilities',
        '### New Capabilities',
        '',
        '| Capability | Description |',
        '|------------|-------------|',
        '| `user-auth` | Authentication |',
        '| `data-export` | Export |',
      ].join('\n'));
      mkdirSync(path.join(tmpDir, 'specs', 'user-auth'), { recursive: true });
      mkdirSync(path.join(tmpDir, 'specs', 'data-export'), { recursive: true });

      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.proposal_capabilities).toEqual(['user-auth', 'data-export']);
    });

    it('should fail when table format capability is missing spec dir', () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Capabilities',
        '### New Capabilities',
        '',
        '| Capability | Description |',
        '|------------|-------------|',
        '| `user-auth` | Authentication |',
      ].join('\n'));

      const result = checker.checkCapabilityCoverage(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.missing).toEqual(['user-auth']);
    });
  });

  // ── 7.4: checkScenarioTaskRatio ──────────────────────────────────────

  describe('checkScenarioTaskRatio', () => {
    it('should pass when ratio >= 0.8', () => {
      mkdirSync(path.join(tmpDir, 'specs', 'cap-a'), { recursive: true });
      const scenarios = Array.from({ length: 10 }, (_, i) =>
        `#### Scenario: scenario ${i + 1}\nSome content`
      ).join('\n\n');
      writeFileSync(path.join(tmpDir, 'specs', 'cap-a', 'spec.md'), scenarios);

      const tasks = Array.from({ length: 8 }, (_, i) =>
        `- [ ] ${i + 1}.1 Task ${i + 1}`
      ).join('\n');
      writeFileSync(path.join(tmpDir, 'tasks.md'), tasks);

      const result = checker.checkScenarioTaskRatio(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_scenarios).toBe(10);
      expect(result.total_tasks).toBe(8);
      expect(result.ratio).toBe(0.8);
    });

    it('should pass when tasks exceed scenarios', () => {
      mkdirSync(path.join(tmpDir, 'specs', 'cap-a'), { recursive: true });
      writeFileSync(path.join(tmpDir, 'specs', 'cap-a', 'spec.md'), [
        '#### Scenario: login',
        'Content',
        '#### Scenario: logout',
        'Content',
      ].join('\n'));

      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [ ] 1.1 Task A',
        '- [x] 1.2 Task B',
        '- [ ] 1.3 Task C',
      ].join('\n'));

      const result = checker.checkScenarioTaskRatio(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_scenarios).toBe(2);
      expect(result.total_tasks).toBe(3);
      expect(result.ratio).toBe(1.5);
    });

    it('should fail when ratio < 0.8', () => {
      mkdirSync(path.join(tmpDir, 'specs', 'cap-a'), { recursive: true });
      const scenarios = Array.from({ length: 10 }, (_, i) =>
        `#### Scenario: scenario ${i + 1}\nContent`
      ).join('\n\n');
      writeFileSync(path.join(tmpDir, 'specs', 'cap-a', 'spec.md'), scenarios);

      const tasks = Array.from({ length: 5 }, (_, i) =>
        `- [ ] ${i + 1}.1 Task ${i + 1}`
      ).join('\n');
      writeFileSync(path.join(tmpDir, 'tasks.md'), tasks);

      const result = checker.checkScenarioTaskRatio(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.ratio).toBe(0.5);
    });

    it('should pass when there are 0 scenarios', () => {
      mkdirSync(path.join(tmpDir, 'specs', 'cap-a'), { recursive: true });
      writeFileSync(path.join(tmpDir, 'specs', 'cap-a', 'spec.md'), [
        '### Requirement: something',
        'No scenarios here',
      ].join('\n'));

      const result = checker.checkScenarioTaskRatio(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_scenarios).toBe(0);
      expect(result.ratio).toBe(1);
    });

    it('should pass when specs/ dir does not exist', () => {
      const result = checker.checkScenarioTaskRatio(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_scenarios).toBe(0);
    });

    it('should count both checked and unchecked tasks', () => {
      mkdirSync(path.join(tmpDir, 'specs', 'cap-a'), { recursive: true });
      writeFileSync(path.join(tmpDir, 'specs', 'cap-a', 'spec.md'), [
        '#### Scenario: s1',
        'Content',
      ].join('\n'));
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Done task',
        '- [ ] 1.2 Pending task',
      ].join('\n'));

      const result = checker.checkScenarioTaskRatio(tmpDir);
      expect(result.total_tasks).toBe(2);
    });
  });

  // ── 7.5: checkAllTasksDone ──────────────────────────────────────────

  describe('checkAllTasksDone', () => {
    it('should pass when all tasks are done', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 First task',
        '- [x] 1.2 Second task',
        '- [x] 1.3 Third task',
      ].join('\n'));

      const result = checker.checkAllTasksDone(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total).toBe(3);
      expect(result.done).toBe(3);
      expect(result.remaining).toEqual([]);
    });

    it('should fail when some tasks are incomplete', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Done task',
        '- [x] 1.2 Another done',
        '- [ ] 1.3 Not done yet',
      ].join('\n'));

      const result = checker.checkAllTasksDone(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.total).toBe(3);
      expect(result.done).toBe(2);
      expect(result.remaining).toEqual(['1.3 Not done yet']);
    });

    it('should report multiple remaining tasks', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Done',
        '- [ ] 1.2 Pending A',
        '- [ ] 1.3 Pending B',
      ].join('\n'));

      const result = checker.checkAllTasksDone(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.remaining).toEqual(['1.2 Pending A', '1.3 Pending B']);
    });

    it('should pass when tasks.md does not exist', () => {
      const result = checker.checkAllTasksDone(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total).toBe(0);
      expect(result.done).toBe(0);
      expect(result.remaining).toEqual([]);
    });

    it('should pass when tasks.md has no checkboxes', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '# Tasks',
        'Some text but no checkboxes',
      ].join('\n'));

      const result = checker.checkAllTasksDone(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total).toBe(0);
    });

    it('should handle uppercase [X] as done', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [X] 1.1 Done with uppercase X',
        '- [x] 1.2 Done with lowercase x',
      ].join('\n'));

      const result = checker.checkAllTasksDone(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.done).toBe(2);
    });
  });

  // ── 7.6: checkTddMarkers ──────────────────────────────────────────

  describe('checkTddMarkers', () => {
    it('should pass when all done tasks have TDD markers', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Add model',
        '  > TDD: test_model.py::TestModel::test_create \u2192 RED \u2713 \u2192 GREEN \u2713',
        '- [x] 1.2 Add view',
        '  > TDD: skipped (view-only change)',
      ].join('\n'));

      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_done).toBe(2);
      expect(result.with_marker).toBe(2);
      expect(result.without_marker).toEqual([]);
    });

    it('should fail when a done task lacks TDD marker', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Add model',
        '  > TDD: test_model.py::TestModel::test_create \u2192 RED \u2713 \u2192 GREEN \u2713',
        '- [x] 1.2 Add view',
        '  > TDD: skipped (view-only change)',
        '- [x] 1.3 Add controller',
      ].join('\n'));

      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.total_done).toBe(3);
      expect(result.with_marker).toBe(2);
      expect(result.without_marker).toEqual(['1.3 Add controller']);
    });

    it('should count skipped as having marker', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Update view XML',
        '  > TDD: skipped (view-only change, no logic)',
      ].join('\n'));

      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.with_marker).toBe(1);
      expect(result.without_marker).toEqual([]);
    });

    it('should ignore unchecked tasks', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Done task',
        '  > TDD: test.py \u2192 RED \u2713 \u2192 GREEN \u2713',
        '- [ ] 1.2 Pending task',
      ].join('\n'));

      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_done).toBe(1);
    });

    it('should pass when tasks.md does not exist', () => {
      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_done).toBe(0);
      expect(result.with_marker).toBe(0);
    });

    it('should pass when no tasks are done', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [ ] 1.1 Pending task A',
        '- [ ] 1.2 Pending task B',
      ].join('\n'));

      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(true);
      expect(result.total_done).toBe(0);
    });

    it('should detect missing marker when next line is another task', () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Task A',
        '- [x] 1.2 Task B',
        '  > TDD: test.py \u2192 RED \u2713 \u2192 GREEN \u2713',
      ].join('\n'));

      const result = checker.checkTddMarkers(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.without_marker).toEqual(['1.1 Task A']);
    });
  });

  // ── 7.7: checkGate dispatcher (integration) ─────────────────────────

  describe('checkGate dispatcher', () => {
    it('should dispatch capability-coverage check', async () => {
      writeFileSync(path.join(tmpDir, 'proposal.md'), [
        '## Capabilities',
        '### New Capabilities',
        '- `feat-a`: Feature A',
      ].join('\n'));
      mkdirSync(path.join(tmpDir, 'specs', 'feat-a'), { recursive: true });

      const result = await checker.checkGate(
        { id: 'cap-cov', check: 'capability-coverage', severity: 'blocking' },
        tmpDir,
      );
      expect(result.id).toBe('cap-cov');
      expect(result.passed).toBe(true);
      expect(result.description).toContain('Capability coverage');
    });

    it('should dispatch all-tasks-done check', async () => {
      writeFileSync(path.join(tmpDir, 'tasks.md'), [
        '- [x] 1.1 Done',
        '- [ ] 1.2 Not done',
      ].join('\n'));

      const result = await checker.checkGate(
        { id: 'tasks-done', check: 'all-tasks-done', severity: 'blocking' },
        tmpDir,
      );
      expect(result.passed).toBe(false);
      expect(result.details).toHaveProperty('remaining');
    });

    it('should dispatch scenario-task-ratio check', async () => {
      const result = await checker.checkGate(
        { id: 'ratio', check: 'scenario-task-ratio', severity: 'warning' },
        tmpDir,
      );
      expect(result.passed).toBe(true);
      expect(result.details).toHaveProperty('ratio');
    });

    it('should dispatch tdd-markers check', async () => {
      const result = await checker.checkGate(
        { id: 'tdd', check: 'tdd-markers', severity: 'blocking' },
        tmpDir,
      );
      expect(result.passed).toBe(true);
    });

    it('should return ai_review_needed for ai-review check', async () => {
      const result = await checker.checkGate(
        { id: 'review', check: 'ai-review', severity: 'blocking', prompt: 'Review code' },
        tmpDir,
      );
      expect(result.passed).toBe(true);
      expect(result.ai_review_needed).toBe(true);
      expect(result.details).toHaveProperty('prompt', 'Review code');
    });

    it('should fail for command check with no command specified', async () => {
      const result = await checker.checkGate(
        { id: 'cmd', check: 'command', severity: 'blocking' },
        tmpDir,
      );
      expect(result.passed).toBe(false);
      expect(result.details).toHaveProperty('error');
    });

    it('should execute command check with successful command', async () => {
      const result = await checker.checkGate(
        { id: 'cmd', check: 'command', severity: 'blocking', command: 'echo hello' },
        tmpDir,
      );
      expect(result.passed).toBe(true);
      expect((result.details as { stdout: string }).stdout).toContain('hello');
    });

    it('should execute command check with failing command', async () => {
      const result = await checker.checkGate(
        { id: 'cmd', check: 'command', severity: 'blocking', command: 'exit 1' },
        tmpDir,
      );
      expect(result.passed).toBe(false);
      expect((result.details as { exit_code: number }).exit_code).toBe(1);
    });

    it('should return passed:false for unknown check type', async () => {
      const result = await checker.checkGate(
        { id: 'unknown', check: 'does-not-exist', severity: 'warning' },
        tmpDir,
      );
      expect(result.passed).toBe(false);
      expect(result.description).toContain('Unknown check type');
    });
  });
});
