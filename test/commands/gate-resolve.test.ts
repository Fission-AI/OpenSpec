import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Track the tempDir for mock return
let mockChangesDir = '';

const mockValidateChangeExists = vi.fn().mockResolvedValue('test-change');
const mockGetChangesDir = vi.fn().mockImplementation(() => mockChangesDir);

vi.mock('../../src/commands/workflow/shared.js', () => ({
  validateChangeExists: (...args: unknown[]) => mockValidateChangeExists(...args),
}));

vi.mock('../../src/utils/change-utils.js', () => ({
  getChangesDir: (...args: unknown[]) => mockGetChangesDir(...args),
}));

import { GateCommand } from '../../src/commands/gate.js';

describe('GateCommand.resolveGate', () => {
  let tempDir: string;
  let changeDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-gate-resolve-'));
    mockChangesDir = tempDir;
    changeDir = path.join(tempDir, 'test-change');
    fs.mkdirSync(changeDir, { recursive: true });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
  });

  it('writes .gates/{id}.json with PASS result', async () => {
    const cmd = new GateCommand();
    await cmd.resolveGate({ change: 'test-change', id: 'review-gate', result: 'PASS' });

    const resultPath = path.join(changeDir, '.gates', 'review-gate.json');
    expect(fs.existsSync(resultPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    expect(data.id).toBe('review-gate');
    expect(data.passed).toBe(true);
  });

  it('writes .gates/{id}.json with FAIL result', async () => {
    const cmd = new GateCommand();
    await cmd.resolveGate({ change: 'test-change', id: 'quality-gate', result: 'FAIL' });

    const resultPath = path.join(changeDir, '.gates', 'quality-gate.json');
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    expect(data.id).toBe('quality-gate');
    expect(data.passed).toBe(false);
  });

  it('includes resolvedBy, resolvedAt, version fields', async () => {
    const cmd = new GateCommand();
    await cmd.resolveGate({ change: 'test-change', id: 'gate-x', result: 'PASS' });

    const resultPath = path.join(changeDir, '.gates', 'gate-x.json');
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    expect(data.version).toBe('1.0');
    expect(data.resolvedBy).toBe('main-agent');
    expect(data.resolvedAt).toBeDefined();
    expect(new Date(data.resolvedAt).toISOString()).toBe(data.resolvedAt);
  });

  it('parses --details JSON correctly', async () => {
    const cmd = new GateCommand();
    await cmd.resolveGate({
      change: 'test-change',
      id: 'detail-gate',
      result: 'PASS',
      details: '{"coverage": 92, "issues": []}',
    });

    const resultPath = path.join(changeDir, '.gates', 'detail-gate.json');
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    expect(data.details).toEqual({ coverage: 92, issues: [] });
  });

  it('works without --details', async () => {
    const cmd = new GateCommand();
    await cmd.resolveGate({ change: 'test-change', id: 'no-detail-gate', result: 'PASS' });

    const resultPath = path.join(changeDir, '.gates', 'no-detail-gate.json');
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    expect(data.details).toBeUndefined();
  });

  it('throws on missing --id', async () => {
    const cmd = new GateCommand();
    await expect(cmd.resolveGate({ change: 'test-change', result: 'PASS' }))
      .rejects.toThrow('Missing required option --id');
  });

  it('throws on invalid --result', async () => {
    const cmd = new GateCommand();
    await expect(cmd.resolveGate({ change: 'test-change', id: 'gate', result: 'MAYBE' }))
      .rejects.toThrow('Invalid --result');
  });

  it('throws on invalid --details JSON', async () => {
    const cmd = new GateCommand();
    await expect(cmd.resolveGate({
      change: 'test-change',
      id: 'gate',
      result: 'PASS',
      details: 'not-json',
    })).rejects.toThrow('Invalid --details JSON');
  });

  it('result is case-insensitive (pass/PASS/Pass)', async () => {
    const cmd = new GateCommand();
    await cmd.resolveGate({ change: 'test-change', id: 'case-gate', result: 'pass' });

    const resultPath = path.join(changeDir, '.gates', 'case-gate.json');
    const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    expect(data.passed).toBe(true);
  });

  it('creates .gates directory if it does not exist', async () => {
    const gatesDir = path.join(changeDir, '.gates');
    expect(fs.existsSync(gatesDir)).toBe(false);

    const cmd = new GateCommand();
    await cmd.resolveGate({ change: 'test-change', id: 'new-gate', result: 'PASS' });

    expect(fs.existsSync(gatesDir)).toBe(true);
  });
});
