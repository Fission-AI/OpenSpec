import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GateChecker } from '../../../src/core/validation/gate-checker.js';
import type { GateInput } from '../../../src/core/validation/gate-checker.js';
import type { ParallelGroup } from '../../../src/core/orchestration/types.js';

describe('parallel gate execution', () => {
  let tempDir: string;
  let changeDir: string;
  let checker: GateChecker;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-parallel-gates-'));
    changeDir = path.join(tempDir, 'changes', 'test-change');
    fs.mkdirSync(changeDir, { recursive: true });
    checker = new GateChecker();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('checkGatesParallel', () => {
    it('should execute command gates in parallel within groups', async () => {
      const gates: GateInput[] = [
        { id: 'gate-a', check: 'command', severity: 'blocking', command: 'echo gate-a' },
        { id: 'gate-b', check: 'command', severity: 'blocking', command: 'echo gate-b' },
      ];

      const parallelGroups: ParallelGroup[] = [
        { ids: ['gate-a', 'gate-b'], parallel: true },
      ];

      const results = await checker.checkGatesParallel(gates, changeDir, parallelGroups);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it('should execute non-parallel gates sequentially', async () => {
      const gates: GateInput[] = [
        { id: 'parallel-a', check: 'command', severity: 'blocking', command: 'echo a' },
        { id: 'parallel-b', check: 'command', severity: 'blocking', command: 'echo b' },
        { id: 'sequential-c', check: 'command', severity: 'blocking', command: 'echo c' },
      ];

      const parallelGroups: ParallelGroup[] = [
        { ids: ['parallel-a', 'parallel-b'], parallel: true },
      ];

      const results = await checker.checkGatesParallel(gates, changeDir, parallelGroups);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toContain('sequential-c');
    });

    it('should handle prompt-type gates as ai_review_needed', async () => {
      const gates: GateInput[] = [
        { id: 'ai-gate', check: 'ai-review', severity: 'blocking', prompt: 'Review this' },
      ];

      const parallelGroups: ParallelGroup[] = [];

      const results = await checker.checkGatesParallel(gates, changeDir, parallelGroups);

      expect(results).toHaveLength(1);
      expect(results[0].ai_review_needed).toBe(true);
    });

    it('should handle sequential groups (parallel: false)', async () => {
      const gates: GateInput[] = [
        { id: 'first', check: 'command', severity: 'blocking', command: 'echo first' },
        { id: 'second', check: 'command', severity: 'blocking', command: 'echo second' },
      ];

      const parallelGroups: ParallelGroup[] = [
        { ids: ['first', 'second'], parallel: false },
      ];

      const results = await checker.checkGatesParallel(gates, changeDir, parallelGroups);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.passed)).toBe(true);
    });
  });

  describe('gate result persistence', () => {
    it('should write individual gate results to .gates/ directory', () => {
      const results = [
        { id: 'gate-1', description: 'Test gate', passed: true, details: {} },
        { id: 'gate-2', description: 'Another gate', passed: false, details: { error: 'fail' } },
      ];

      checker.persistGateResults(changeDir, results);

      const gate1Path = path.join(changeDir, '.gates', 'gate-1.json');
      const gate2Path = path.join(changeDir, '.gates', 'gate-2.json');

      expect(fs.existsSync(gate1Path)).toBe(true);
      expect(fs.existsSync(gate2Path)).toBe(true);

      const gate1Data = JSON.parse(fs.readFileSync(gate1Path, 'utf-8'));
      expect(gate1Data.id).toBe('gate-1');
      expect(gate1Data.passed).toBe(true);

      const gate2Data = JSON.parse(fs.readFileSync(gate2Path, 'utf-8'));
      expect(gate2Data.passed).toBe(false);
    });

    it('should write synthesis.json with summary', () => {
      const results = [
        { id: 'gate-1', description: 'Pass', passed: true, details: {} },
        { id: 'gate-2', description: 'Fail', passed: false, details: {} },
      ];

      checker.persistGateResults(changeDir, results);

      const synthesisPath = path.join(changeDir, '.gates', 'synthesis.json');
      expect(fs.existsSync(synthesisPath)).toBe(true);

      const synthesis = JSON.parse(fs.readFileSync(synthesisPath, 'utf-8'));
      expect(synthesis.total).toBe(2);
      expect(synthesis.passed).toBe(1);
      expect(synthesis.failed).toBe(1);
      expect(synthesis.results).toHaveLength(2);
    });

    it('should create .gates/ directory using path.join (cross-platform)', () => {
      const results = [{ id: 'test', description: 'Test', passed: true, details: {} }];

      checker.persistGateResults(changeDir, results);

      const gatesDir = path.join(changeDir, '.gates');
      expect(fs.existsSync(gatesDir)).toBe(true);
    });

    it('should read persisted gate results', () => {
      const results = [
        { id: 'my-gate', description: 'My gate', passed: true, details: { score: 100 } },
      ];

      checker.persistGateResults(changeDir, results);

      const readResult = checker.readGateResult(changeDir, 'my-gate');
      expect(readResult).not.toBeNull();
      expect(readResult!.id).toBe('my-gate');
      expect(readResult!.passed).toBe(true);
    });

    it('should return null for non-existent gate result', () => {
      const result = checker.readGateResult(changeDir, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should read synthesis summary', () => {
      const results = [
        { id: 'a', description: 'A', passed: true, details: {} },
      ];

      checker.persistGateResults(changeDir, results);

      const synthesis = checker.readSynthesis(changeDir);
      expect(synthesis).not.toBeNull();
      expect(synthesis!.total).toBe(1);
      expect(synthesis!.passed).toBe(1);
    });

    it('should return null for non-existent synthesis', () => {
      const synthesis = checker.readSynthesis(changeDir);
      expect(synthesis).toBeNull();
    });
  });
});
