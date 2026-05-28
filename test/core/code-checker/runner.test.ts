import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { runCheck } from '../../../src/core/code-checker/runner.js';

// Mock child_process spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';

function createMockChild(exitCode: number | null, stdout: string, stderr: string, error?: Error) {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdout.setEncoding = vi.fn();
  child.stderr.setEncoding = vi.fn();
  child.kill = vi.fn(() => true);
  child.killed = false;

  const timers: ReturnType<typeof setTimeout>[] = [];

  // Simulate async data and close
  timers.push(setTimeout(() => {
    if (error) {
      child.emit('error', error);
      return;
    }
    if (stdout) {
      const chunks = stdout.split('\n');
      chunks.forEach((chunk, i) => {
        timers.push(setTimeout(() => child.stdout.emit('data', chunk + (i < chunks.length - 1 ? '\n' : '')), 0));
      });
    }
    if (stderr) {
      const chunks = stderr.split('\n');
      chunks.forEach((chunk, i) => {
        timers.push(setTimeout(() => child.stderr.emit('data', chunk + (i < chunks.length - 1 ? '\n' : '')), 0));
      });
    }
    timers.push(setTimeout(() => child.emit('close', exitCode), 10));
  }, 0));

  // Attach cleanup helper
  child._cleanup = () => timers.forEach(clearTimeout);

  return child;
}

describe('runCheck', () => {
  let lastMockChild: any;

  beforeEach(() => {
    vi.clearAllMocks();
    lastMockChild = undefined;
  });

  afterEach(() => {
    if (lastMockChild?._cleanup) {
      lastMockChild._cleanup();
    }
  });

  it('returns passed=true when command exits 0', async () => {
    lastMockChild = createMockChild(0, 'All good', '');
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', { name: 'Test', command: 'echo ok' });
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.stdout).toContain('All good');
  });

  it('returns passed=false when command exits non-zero', async () => {
    lastMockChild = createMockChild(1, '', 'Something went wrong');
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', { name: 'Test', command: 'false' });
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].message).toContain('Something went wrong');
  });

  it('parses TypeScript error format', async () => {
    lastMockChild = createMockChild(2, 'src/index.ts(5,23): error TS2345: Argument of type string is not assignable.', '');
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', { name: 'TSC', command: 'tsc' });
    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].path).toBe('src/index.ts');
    expect(result.issues[0].line).toBe(5);
    expect(result.issues[0].column).toBe(23);
    expect(result.issues[0].level).toBe('ERROR');
  });

  it('parses ESLint error format', async () => {
    lastMockChild = createMockChild(1, '', '  5:23  error  Unexpected any  @typescript-eslint/no-explicit-any');
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', { name: 'ESLint', command: 'eslint' });
    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].line).toBe(5);
    expect(result.issues[0].column).toBe(23);
    expect(result.issues[0].level).toBe('ERROR');
  });

  it('skips check when files filter does not match affected files', async () => {
    lastMockChild = createMockChild(0, '', '');
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', {
      name: 'Rust',
      command: 'cargo check',
      files: ['**/*.rs'],
    }, {
      affectedFiles: ['src/main.ts'],
    });

    expect(result.skipped).toBe(true);
    expect(result.passed).toBe(true);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('runs check when files filter matches affected files', async () => {
    lastMockChild = createMockChild(0, '', '');
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', {
      name: 'Rust',
      command: 'cargo check',
      files: ['**/*.rs'],
    }, {
      affectedFiles: ['src/main.rs'],
    });

    expect(result.skipped).toBeUndefined();
    expect(spawn).toHaveBeenCalled();
  });

  it('handles spawn error gracefully', async () => {
    lastMockChild = createMockChild(null, '', '', new Error('ENOENT: tsc not found'));
    vi.mocked(spawn).mockReturnValue(lastMockChild);

    const result = await runCheck('/project', { name: 'TSC', command: 'tsc' });
    expect(result.passed).toBe(false);
    expect(result.issues[0].message).toContain('ENOENT');
  });

  it('times out after custom timeout', async () => {
    const child = new EventEmitter() as any;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdout.setEncoding = vi.fn();
    child.stderr.setEncoding = vi.fn();
    child.killed = false;
    child.kill = vi.fn((signal: string) => {
      child.killed = true;
      // Simulate process termination after kill
      setTimeout(() => child.emit('close', signal === 'SIGKILL' ? null : 1), 10);
      return true;
    });
    lastMockChild = child;

    vi.mocked(spawn).mockReturnValue(child);

    const promise = runCheck('/project', { name: 'Slow', command: 'sleep 100' }, { timeoutMs: 50 });

    const result = await promise;
    expect(result.passed).toBe(false);
    expect(result.issues[0].message).toContain('timed out');
  });
});
