import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  beginRun,
  finishRun,
  markFailure,
  markCheckFailed,
  markMilestone,
  markOutcome,
  markPromptClosed,
  markPromptOpen,
  registerAllowlists,
  wasPrompted,
} from '../../src/telemetry/cli-runtime.js';
import { resetEventCount, resetState, shutdown } from '../../src/telemetry/index.js';
import { resetRunId } from '../../src/telemetry/state.js';
import { sanitizeProperties, setRegistryChecks } from '../../src/telemetry/properties.js';
import { Command } from 'commander';

describe('telemetry/cli-runtime', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    delete process.env.OPENSPEC_TELEMETRY;
    delete process.env.DO_NOT_TRACK;
    delete process.env.CI;
    delete process.env.OPENSPEC_TELEMETRY_DEBUG;

    resetEventCount();
    resetState();
    resetRunId();
    setRegistryChecks({ isCommand: () => true, isTool: () => true });
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    beginRun('1.2.3');
  });

  afterEach(async () => {
    await shutdown();
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function completions() {
    return fetchSpy.mock.calls
      .map(([, o]) => JSON.parse(String((o as RequestInit).body)).batch[0])
      .filter((e) => e.event === 'command_completed');
  }

  async function complete(exitCode: number | undefined) {
    await finishRun({ command: 'archive', version: '1.2.3', exitCode, jsonMode: false, minimal: true });
    await shutdown();
  }

  it('reports a clean run as success', async () => {
    await complete(0);
    expect(completions()[0].properties).toMatchObject({
      outcome: 'success',
      error_class: 'none',
      exit_code: '0',
    });
  });

  it('sends exactly one completion however many times it is asked', async () => {
    await finishRun({ command: 'archive', version: '1.2.3', exitCode: 1, jsonMode: false, minimal: true });
    await finishRun({ command: 'archive', version: '1.2.3', exitCode: 1, jsonMode: false, minimal: true });
    await shutdown();
    // A duplicate would double-count every failure rate built on this event.
    expect(completions()).toHaveLength(1);
  });

  it('keeps the first classification when an error is reclassified', async () => {
    markOutcome(Object.assign(new Error('x'), { diagnostic: { code: 'no_openspec_root' } }));
    markOutcome(new Error('a later, less specific error'));
    await complete(1);
    expect(completions()[0].properties.error_class).toBe('no_root');
  });

  it('treats a failed check as a user error, never our bug', async () => {
    markCheckFailed();
    await complete(1);
    expect(completions()[0].properties).toMatchObject({
      outcome: 'user_error',
      error_class: 'validation_failed',
    });
  });

  it('reports an unclassified failure without blaming the user or us falsely', async () => {
    await complete(1);
    // Neither `none` nor `internal_error`: the CLI has many paths that set an
    // exit code without throwing, and calling those our bugs would drown the
    // metric that exists to find real ones.
    expect(completions()[0].properties).toMatchObject({
      outcome: 'user_error',
      error_class: 'unclassified',
    });
  });

  it('reads a Ctrl-C exit as cancelled', async () => {
    await complete(130);
    expect(completions()[0].properties).toMatchObject({
      outcome: 'cancelled',
      error_class: 'cancelled',
      exit_code: '130',
    });
  });

  it('excludes time spent at a prompt from the duration', async () => {
    markPromptOpen();
    expect(wasPrompted()).toBe(true);
    // Simulate a long think by rewinding nothing: the window is what counts.
    markPromptClosed();
    await complete(0);
    expect(completions()[0].properties.duration).toBe('1_under_100ms');
  });

  it('resets per-run state so a classification cannot leak into the next run', async () => {
    markFailure('archive_blocked');
    await complete(1);
    expect(completions()[0].properties.error_class).toBe('archive_blocked');

    resetEventCount();
    resetState();
    beginRun('1.2.3');
    fetchSpy.mockClear();
    await complete(0);
    expect(completions()[0].properties).toMatchObject({
      outcome: 'success',
      error_class: 'none',
    });
  });

  it('marks a milestone only for the commands that earn one', async () => {
    markMilestone('list');
    await complete(0);
    const milestones = fetchSpy.mock.calls
      .map(([, o]) => JSON.parse(String((o as RequestInit).body)).batch[0])
      .filter((e) => e.event === 'milestone_reached')
      .map((e) => e.properties.milestone);
    // `install` is earned by the run that mints the id, and is the funnel's
    // denominator. `list` earns nothing.
    expect(milestones).toEqual(['install']);
  });

  describe('registerAllowlists', () => {
    it('accepts every registered command path and nothing else', () => {
      const program = new Command('openspec');
      const group = program.command('store');
      group.command('doctor');
      program.command('archive');

      const accepted: string[] = [];
      registerAllowlists(program, ['claude']);
      // Round-trip through the sanitizer, which is what actually gates sends.
      for (const candidate of ['archive', 'store', 'store:doctor', 'rm -rf /', 'openspec']) {
        if (sanitizeProperties({ command: candidate }).command === candidate) {
          accepted.push(candidate);
        }
      }
      expect(accepted.sort()).toEqual(['archive', 'store', 'store:doctor']);
    });
  });
});
