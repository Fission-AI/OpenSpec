import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import path from 'path';
import type { PipelineLock } from './types.js';

const LOCK_FILE = '.lock.json';
const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if a process with the given PID is alive.
 */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path to the lock file inside .gates/ directory.
 */
function getLockPath(changeDir: string): string {
  return path.join(changeDir, '.gates', LOCK_FILE);
}

/**
 * Ensure the .gates/ directory exists.
 */
function ensureGatesDir(changeDir: string): void {
  const gatesDir = path.join(changeDir, '.gates');
  if (!existsSync(gatesDir)) {
    mkdirSync(gatesDir, { recursive: true });
  }
}

/**
 * Acquire an advisory lock for a pipeline phase.
 * Writes .gates/.lock.json with session metadata.
 */
export function acquire(
  changeDir: string,
  sessionId: string,
  phase: string,
  changeName: string,
): void {
  ensureGatesDir(changeDir);
  const lock: PipelineLock = {
    sessionId,
    pid: process.pid,
    phase,
    startedAt: new Date().toISOString(),
    changeName,
  };
  writeFileSync(getLockPath(changeDir), JSON.stringify(lock, null, 2), 'utf-8');
}

/**
 * Release the advisory lock by deleting .gates/.lock.json.
 */
export function release(changeDir: string): void {
  const lockPath = getLockPath(changeDir);
  if (existsSync(lockPath)) {
    unlinkSync(lockPath);
  }
}

/**
 * Check the current lock status.
 * Returns the lock info if a lock exists, or null otherwise.
 */
export function check(changeDir: string): PipelineLock | null {
  const lockPath = getLockPath(changeDir);
  if (!existsSync(lockPath)) {
    return null;
  }
  try {
    const content = readFileSync(lockPath, 'utf-8');
    return JSON.parse(content) as PipelineLock;
  } catch {
    return null;
  }
}

/**
 * Check if the lock is stale (PID dead or older than 30 minutes).
 * Returns the lock info if stale, or null if the lock is active or doesn't exist.
 */
export function checkStale(changeDir: string): PipelineLock | null {
  const lock = check(changeDir);
  if (!lock) {
    return null;
  }

  // Check if PID is dead
  if (!isAlive(lock.pid)) {
    return lock;
  }

  // Check if lock is older than 30 minutes
  const startedAt = new Date(lock.startedAt).getTime();
  const now = Date.now();
  if (now - startedAt > STALE_TIMEOUT_MS) {
    return lock;
  }

  return null;
}
