import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock hook-dispatcher
const mockDispatchHooks = vi.fn();
vi.mock('../../src/core/plugin/hook-dispatcher.js', () => ({
  dispatchHooks: (...args: unknown[]) => mockDispatchHooks(...args),
}));

// Mock GateChecker
const mockCheckGate = vi.fn();
vi.mock('../../src/core/validation/gate-checker.js', () => ({
  GateChecker: vi.fn().mockImplementation(() => ({
    checkGate: mockCheckGate,
  })),
}));

import { PipelineRunner } from '../../src/core/pipeline/runner.js';
import * as lock from '../../src/core/pipeline/lock.js';
import type { SchemaYaml } from '../../src/core/artifact-graph/types.js';
import type { LoadedPlugin } from '../../src/core/plugin/types.js';

describe('PipelineRunner', () => {
  let tempDir: string;
  let changeDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  const minimalSchema: SchemaYaml = {
    name: 'test-schema',
    version: 1,
    artifacts: [{ id: 'proposal', generates: 'proposal.md', description: 'Proposal', template: 'proposal.md', requires: [] }],
  };

  const schemaWithGates: SchemaYaml = {
    name: 'gated-schema',
    version: 1,
    artifacts: [{ id: 'proposal', generates: 'proposal.md', description: 'Proposal', template: 'proposal.md', requires: [] }],
    apply: {
      requires: ['proposal'],
      gates: {
        pre: [
          { id: 'gate-1', check: 'all-tasks-done', severity: 'blocking' },
          { id: 'gate-2', check: 'ai-review', severity: 'warning', prompt: 'Review code quality' },
        ],
        post: [
          { id: 'gate-3', check: 'tdd-markers', severity: 'blocking' },
        ],
      },
    },
  };

  const emptyPlugins: LoadedPlugin[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-runner-'));
    changeDir = path.join(tempDir, 'changes', 'test-change');
    fs.mkdirSync(changeDir, { recursive: true });
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockDispatchHooks.mockReset();
    mockCheckGate.mockReset();

    // Default mock: hooks return empty result
    mockDispatchHooks.mockResolvedValue({ executed: [], pending: [] });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  describe('constructor', () => {
    it('throws on invalid phase', () => {
      expect(() => new PipelineRunner(tempDir, 'change', 'invalid', emptyPlugins, changeDir, minimalSchema))
        .toThrow('Invalid phase: invalid');
    });

    it('accepts valid phases', () => {
      for (const phase of ['propose', 'apply', 'verify', 'archive']) {
        expect(() => new PipelineRunner(tempDir, 'change', phase, emptyPlugins, changeDir, minimalSchema))
          .not.toThrow();
      }
    });
  });

  describe('start()', () => {
    it('acquires lock and dispatches pre-hooks', async () => {
      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, minimalSchema, 'sess-001');
      const result = await runner.start();

      // Lock should exist
      const lockInfo = lock.check(changeDir);
      expect(lockInfo).not.toBeNull();
      expect(lockInfo!.sessionId).toBe('sess-001');
      expect(lockInfo!.phase).toBe('apply');

      // dispatchHooks should have been called with apply.pre
      expect(mockDispatchHooks).toHaveBeenCalledTimes(1);
      expect(mockDispatchHooks.mock.calls[0][1]).toBe('apply.pre');

      expect(result.sessionId).toBe('sess-001');
      expect(result.phase).toBe('apply');
      expect(result.changeName).toBe('test-change');
    });

    it('runs pre-gates and returns results', async () => {
      mockCheckGate
        .mockResolvedValueOnce({ id: 'gate-1', passed: true, description: 'All tasks done', details: {} })
        .mockResolvedValueOnce({ id: 'gate-2', passed: true, description: 'AI review', details: { prompt: 'Review code quality' }, ai_review_needed: true });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-002');
      const result = await runner.start();

      expect(result.preGates).toHaveLength(2);
      expect(result.preGates[0].id).toBe('gate-1');
      expect(result.preGates[0].passed).toBe(true);
      expect(result.preGates[1].id).toBe('gate-2');
      expect(result.preGates[1].ai_review_needed).toBe(true);
    });

    it('collects pending prompts from ai_review gates', async () => {
      mockCheckGate
        .mockResolvedValueOnce({ id: 'gate-1', passed: true, description: 'Tasks done', details: {} })
        .mockResolvedValueOnce({ id: 'gate-2', passed: true, description: 'AI review', details: { prompt: 'Review code quality' }, ai_review_needed: true });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-003');
      const result = await runner.start();

      expect(result.pendingPrompts).toHaveLength(1);
      expect(result.pendingPrompts[0].id).toBe('gate-2');
      expect(result.pendingPrompts[0].prompt).toBe('Review code quality');
    });

    it('returns status blocked when blocking gate fails', async () => {
      mockCheckGate
        .mockResolvedValueOnce({ id: 'gate-1', passed: false, description: 'Tasks incomplete', details: { remaining: ['T1'] } })
        .mockResolvedValueOnce({ id: 'gate-2', passed: true, description: 'AI review', details: {}, ai_review_needed: true });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-004');
      const result = await runner.start();

      expect(result.status).toBe('blocked');
      expect(result.failedGates).toBeDefined();
      expect(result.failedGates).toHaveLength(1);
      expect(result.failedGates![0].id).toBe('gate-1');
    });

    it('returns status ready when all gates pass', async () => {
      mockCheckGate
        .mockResolvedValueOnce({ id: 'gate-1', passed: true, description: 'All done', details: {} })
        .mockResolvedValueOnce({ id: 'gate-2', passed: true, description: 'AI review', details: {}, ai_review_needed: true });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-005');
      const result = await runner.start();

      expect(result.status).toBe('ready');
      expect(result.failedGates).toBeUndefined();
    });

    it('returns status ready when warning gate fails but no blocking fails', async () => {
      // gate-1 (blocking) passes, gate-2 (warning) fails
      mockCheckGate
        .mockResolvedValueOnce({ id: 'gate-1', passed: true, description: 'All done', details: {} })
        .mockResolvedValueOnce({ id: 'gate-2', passed: false, description: 'AI review', details: {}, ai_review_needed: true });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-006');
      const result = await runner.start();

      expect(result.status).toBe('ready');
    });

    it('cleans stale lock automatically', async () => {
      // Write a stale lock (dead PID)
      const gatesDir = path.join(changeDir, '.gates');
      fs.mkdirSync(gatesDir, { recursive: true });
      fs.writeFileSync(path.join(gatesDir, '.lock.json'), JSON.stringify({
        sessionId: 'stale-sess',
        pid: 999999999,
        phase: 'apply',
        startedAt: new Date().toISOString(),
        changeName: 'stale',
      }), 'utf-8');

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, minimalSchema, 'new-sess');
      await runner.start();

      const lockInfo = lock.check(changeDir);
      expect(lockInfo!.sessionId).toBe('new-sess');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Cleaning stale lock'));
    });

    it('returns empty preGates when schema has no gates for the phase', async () => {
      const runner = new PipelineRunner(tempDir, 'test-change', 'propose', emptyPlugins, changeDir, minimalSchema, 'sess-007');
      const result = await runner.start();

      expect(result.preGates).toHaveLength(0);
      expect(result.pendingPrompts).toHaveLength(0);
      expect(result.status).toBe('ready');
    });
  });

  describe('complete()', () => {
    it('checks all pending prompts are resolved', async () => {
      // Pre-gate with ai-review check exists in schema but no .gates/gate-2.json
      // The complete() method checks for ai-review gates in pre that are unresolved
      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-010');
      const result = await runner.complete();

      expect(result.status).toBe('blocked');
      expect(result.unresolvedPrompts).toBeDefined();
      expect(result.unresolvedPrompts).toContain('gate-2');
    });

    it('returns blocked when prompts are unresolved', async () => {
      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-011');
      const result = await runner.complete();

      expect(result.status).toBe('blocked');
      expect(result.postGates).toHaveLength(0);
      expect(result.postHooks.executed).toHaveLength(0);
    });

    it('runs post-gates after prompts resolved', async () => {
      // Resolve the ai-review gate
      const gatesDir = path.join(changeDir, '.gates');
      fs.mkdirSync(gatesDir, { recursive: true });
      fs.writeFileSync(path.join(gatesDir, 'gate-2.json'), JSON.stringify({
        id: 'gate-2', passed: true, resolvedBy: 'main-agent', resolvedAt: new Date().toISOString(),
      }), 'utf-8');

      mockCheckGate.mockResolvedValueOnce({ id: 'gate-3', passed: true, description: 'TDD markers pass', details: {} });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-012');
      const result = await runner.complete();

      expect(result.status).toBe('passed');
      expect(result.postGates).toHaveLength(1);
      expect(result.postGates[0].id).toBe('gate-3');
      expect(result.postGates[0].passed).toBe(true);
    });

    it('writes synthesis.json on success', async () => {
      // Resolve ai-review gate
      const gatesDir = path.join(changeDir, '.gates');
      fs.mkdirSync(gatesDir, { recursive: true });
      fs.writeFileSync(path.join(gatesDir, 'gate-2.json'), JSON.stringify({
        id: 'gate-2', passed: true, resolvedBy: 'main-agent', resolvedAt: new Date().toISOString(),
      }), 'utf-8');

      mockCheckGate.mockResolvedValueOnce({ id: 'gate-3', passed: true, description: 'TDD pass', details: {} });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-013');
      const result = await runner.complete();

      const synthesisPath = path.join(gatesDir, 'synthesis.json');
      expect(fs.existsSync(synthesisPath)).toBe(true);

      const synthesis = JSON.parse(fs.readFileSync(synthesisPath, 'utf-8'));
      expect(synthesis.version).toBe('1.0');
      expect(synthesis.sessionId).toBe('sess-013');
      expect(synthesis.phase).toBe('apply');
      expect(synthesis.total).toBe(1);
      expect(synthesis.passed).toBe(1);
      expect(synthesis.failed).toBe(0);
    });

    it('releases lock on success', async () => {
      // Acquire lock first, then resolve gate
      lock.acquire(changeDir, 'sess-014', 'apply', 'test-change');
      const gatesDir = path.join(changeDir, '.gates');
      fs.writeFileSync(path.join(gatesDir, 'gate-2.json'), JSON.stringify({
        id: 'gate-2', passed: true, resolvedBy: 'main-agent', resolvedAt: new Date().toISOString(),
      }), 'utf-8');

      mockCheckGate.mockResolvedValueOnce({ id: 'gate-3', passed: true, description: 'TDD pass', details: {} });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-014');
      await runner.complete();

      expect(lock.check(changeDir)).toBeNull();
    });

    it('returns failed when post-gate fails', async () => {
      // Resolve ai-review gate
      const gatesDir = path.join(changeDir, '.gates');
      fs.mkdirSync(gatesDir, { recursive: true });
      fs.writeFileSync(path.join(gatesDir, 'gate-2.json'), JSON.stringify({
        id: 'gate-2', passed: true, resolvedBy: 'main-agent', resolvedAt: new Date().toISOString(),
      }), 'utf-8');

      mockCheckGate.mockResolvedValueOnce({ id: 'gate-3', passed: false, description: 'TDD markers missing', details: { without_marker: ['T1'] } });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-015');
      const result = await runner.complete();

      expect(result.status).toBe('failed');
      expect(result.failedGates).toBeDefined();
      expect(result.failedGates).toHaveLength(1);
      expect(result.failedGates![0].id).toBe('gate-3');
    });
  });

  describe('idempotent re-run', () => {
    it('start can be called twice - re-executes and overwrites', async () => {
      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, minimalSchema, 'sess-020');

      const result1 = await runner.start();
      const result2 = await runner.start();

      expect(result1.sessionId).toBe('sess-020');
      expect(result2.sessionId).toBe('sess-020');
      expect(result2.status).toBe('ready');
      // Lock should still be valid
      const lockInfo = lock.check(changeDir);
      expect(lockInfo!.sessionId).toBe('sess-020');
    });

    it('synthesis.json gets new timestamp on re-run', async () => {
      // Resolve ai-review gate
      const gatesDir = path.join(changeDir, '.gates');
      fs.mkdirSync(gatesDir, { recursive: true });
      fs.writeFileSync(path.join(gatesDir, 'gate-2.json'), JSON.stringify({
        id: 'gate-2', passed: true, resolvedBy: 'main-agent', resolvedAt: new Date().toISOString(),
      }), 'utf-8');

      mockCheckGate.mockResolvedValue({ id: 'gate-3', passed: true, description: 'TDD pass', details: {} });

      const runner = new PipelineRunner(tempDir, 'test-change', 'apply', emptyPlugins, changeDir, schemaWithGates, 'sess-021');
      await runner.complete();
      const synth1 = JSON.parse(fs.readFileSync(path.join(gatesDir, 'synthesis.json'), 'utf-8'));

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await runner.complete();
      const synth2 = JSON.parse(fs.readFileSync(path.join(gatesDir, 'synthesis.json'), 'utf-8'));

      expect(synth2.timestamp).not.toBe(synth1.timestamp);
      expect(synth2.sessionId).toBe('sess-021');
    });
  });
});
