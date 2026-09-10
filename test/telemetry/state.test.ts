import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadSessionState,
  claimMilestone,
  claimUnreportedTools,
  recordOutcome,
  getRunId,
  resetRunId,
} from '../../src/telemetry/state.js';
import { getConfigPath, getTelemetryConfig } from '../../src/telemetry/config.js';

describe('telemetry/state', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-state-test-'));
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    resetRunId();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('mints identity on the first run and reuses it after', async () => {
    const first = await loadSessionState();
    expect(first.firstRun).toBe(true);
    expect(first.anonymousId).toMatch(/^[0-9a-f-]{36}$/);

    const second = await loadSessionState();
    expect(second.firstRun).toBe(false);
    expect(second.anonymousId).toBe(first.anonymousId);
  });

  it('reuses the work session inside the window and rotates outside it', async () => {
    const start = new Date('2026-09-10T10:00:00Z');
    const first = await loadSessionState(start);

    const soon = await loadSessionState(new Date(start.getTime() + 10 * 60 * 1000));
    expect(soon.workSessionId).toBe(first.workSessionId);

    // The window slides from the last activity, not from the session start:
    // 31 minutes after `start` is only 21 minutes after the `soon` call.
    const stillSame = await loadSessionState(new Date(start.getTime() + 31 * 60 * 1000));
    expect(stillSame.workSessionId).toBe(first.workSessionId);

    const later = await loadSessionState(new Date(start.getTime() + 90 * 60 * 1000));
    expect(later.workSessionId).not.toBe(first.workSessionId);
  });

  it('gives each invocation its own run id, unrelated to identity', async () => {
    const state = await loadSessionState();
    const runId = getRunId();
    expect(getRunId()).toBe(runId);
    expect(runId).not.toBe(state.anonymousId);
    expect(runId).not.toBe(state.workSessionId);

    resetRunId();
    expect(getRunId()).not.toBe(runId);
  });

  it('never writes the run id to disk', async () => {
    await loadSessionState();
    getRunId();
    const onDisk = fs.readFileSync(getConfigPath(), 'utf-8');
    expect(onDisk).not.toContain(getRunId());
  });

  it('claims a milestone once and buckets the time to reach it', async () => {
    const start = new Date('2026-09-10T10:00:00Z');
    const state = await loadSessionState(start);

    const first = await claimMilestone('archive', state, new Date(start.getTime() + 30 * 60 * 1000));
    expect(first).toEqual({ timeToReach: '1_under_1h' });

    const again = await claimMilestone('archive', state, new Date());
    expect(again).toBeNull();
  });

  it('omits the bucket for an id that predates the recorded time', async () => {
    await loadSessionState();
    // Simulate a user whose anonymousId was minted before firstSeenAt existed.
    const configPath = getConfigPath();
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    delete raw.telemetry.firstSeenAt;
    fs.writeFileSync(configPath, JSON.stringify(raw));

    const state = await loadSessionState();
    expect(await claimMilestone('propose', state)).toEqual({ timeToReach: undefined });
  });

  it('reports each tool once', async () => {
    const state = await loadSessionState();
    expect(await claimUnreportedTools(['claude', 'cursor'], state)).toEqual(['claude', 'cursor']);
    expect(await claimUnreportedTools(['claude', 'cursor'], state)).toEqual([]);
    expect(await claimUnreportedTools(['claude', 'zed'], state)).toEqual(['zed']);
  });

  it('records the previous outcome for retry visibility', async () => {
    await loadSessionState();
    await recordOutcome('archive', 'user_error');

    const next = await loadSessionState();
    expect(next.previousOutcome).toBe('user_error');
    expect(next.previousCommand).toBe('archive');
  });

  it('persists only bounded fields', async () => {
    const state = await loadSessionState();
    await claimMilestone('init', state);
    await claimUnreportedTools(['claude'], state);
    await recordOutcome('init', 'success');

    const telemetry = await getTelemetryConfig();
    expect(Object.keys(telemetry).sort()).toEqual(
      [
        'anonymousId',
        'firstSeenAt',
        'lastActivityAt',
        'milestones',
        'previousCommand',
        'previousOutcome',
        'reportedTools',
        'workSessionId',
      ].sort()
    );
  });
});
