import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { acquire, release, check, checkStale, isAlive } from '../../src/core/pipeline/lock.js';

describe('AdvisoryLock', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-lock-'));
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  it('acquire creates .gates/.lock.json with correct fields', () => {
    acquire(tempDir, 'session-001', 'apply', 'my-change');

    const lockPath = path.join(tempDir, '.gates', '.lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);

    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    expect(lock.sessionId).toBe('session-001');
    expect(lock.pid).toBe(process.pid);
    expect(lock.phase).toBe('apply');
    expect(lock.changeName).toBe('my-change');
    expect(lock.startedAt).toBeDefined();
    expect(new Date(lock.startedAt).toISOString()).toBe(lock.startedAt);
  });

  it('release removes .gates/.lock.json', () => {
    acquire(tempDir, 'session-002', 'verify', 'change-x');
    const lockPath = path.join(tempDir, '.gates', '.lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);

    release(tempDir);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('release does nothing when no lock exists', () => {
    release(tempDir);
  });

  it('check returns null when no lock exists', () => {
    const result = check(tempDir);
    expect(result).toBeNull();
  });

  it('check returns lock info when lock exists', () => {
    acquire(tempDir, 'session-003', 'propose', 'change-y');

    const result = check(tempDir);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('session-003');
    expect(result!.pid).toBe(process.pid);
    expect(result!.phase).toBe('propose');
    expect(result!.changeName).toBe('change-y');
  });

  it('checkStale returns lock when PID is not alive', () => {
    const gatesDir = path.join(tempDir, '.gates');
    fs.mkdirSync(gatesDir, { recursive: true });
    const lockData = {
      sessionId: 'dead-session',
      pid: 999999999,
      phase: 'apply',
      startedAt: new Date().toISOString(),
      changeName: 'stale-change',
    };
    fs.writeFileSync(path.join(gatesDir, '.lock.json'), JSON.stringify(lockData), 'utf-8');

    const result = checkStale(tempDir);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('dead-session');
    expect(result!.pid).toBe(999999999);
  });

  it('checkStale returns null when PID is alive and recent', () => {
    acquire(tempDir, 'live-session', 'apply', 'live-change');

    const result = checkStale(tempDir);
    expect(result).toBeNull();
  });

  it('checkStale returns lock when lock is older than 30 minutes', () => {
    const gatesDir = path.join(tempDir, '.gates');
    fs.mkdirSync(gatesDir, { recursive: true });
    const oldDate = new Date(Date.now() - 31 * 60 * 1000);
    const lockData = {
      sessionId: 'old-session',
      pid: process.pid,
      phase: 'apply',
      startedAt: oldDate.toISOString(),
      changeName: 'old-change',
    };
    fs.writeFileSync(path.join(gatesDir, '.lock.json'), JSON.stringify(lockData), 'utf-8');

    const result = checkStale(tempDir);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('old-session');
  });

  it('checkStale returns null when no lock exists', () => {
    const result = checkStale(tempDir);
    expect(result).toBeNull();
  });

  it('acquire overwrites existing lock', () => {
    acquire(tempDir, 'session-first', 'apply', 'change-a');
    acquire(tempDir, 'session-second', 'verify', 'change-b');

    const result = check(tempDir);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('session-second');
    expect(result!.phase).toBe('verify');
    expect(result!.changeName).toBe('change-b');
  });

  it('isAlive returns true for current process PID', () => {
    expect(isAlive(process.pid)).toBe(true);
  });

  it('isAlive returns false for non-existent PID', () => {
    expect(isAlive(999999999)).toBe(false);
  });

  it('check returns null when lock file contains invalid JSON', () => {
    const gatesDir = path.join(tempDir, '.gates');
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(path.join(gatesDir, '.lock.json'), 'not-json', 'utf-8');

    const result = check(tempDir);
    expect(result).toBeNull();
  });
});
