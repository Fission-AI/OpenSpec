import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  resetEventCount,
  resetState,
  shutdown,
  trackCommand,
  trackCompletion,
  trackMilestone,
  trackConfiguredTools,
} from '../../src/telemetry/index.js';
import { getTelemetryConfig } from '../../src/telemetry/config.js';
import { setRegistryChecks } from '../../src/telemetry/properties.js';
import { resetRunId } from '../../src/telemetry/state.js';

describe('telemetry events', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-events-'));
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.APPDATA = path.join(tempDir, 'appdata');
    delete process.env.OPENSPEC_TELEMETRY;
    delete process.env.DO_NOT_TRACK;
    delete process.env.CI;
    delete process.env.OPENSPEC_TELEMETRY_DEBUG;

    resetEventCount();
    resetState();
    resetRunId();
    setRegistryChecks({ isCommand: () => true, isTool: (v) => ['claude', 'cursor'].includes(v) });

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await shutdown();
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function sentEvents() {
    return fetchSpy.mock.calls.map(
      ([, options]) => JSON.parse(String((options as RequestInit).body)).batch[0]
    );
  }

  it('sends a completion event with a bucketed exit code and duration', async () => {
    await trackCompletion({
      command: 'archive',
      version: '1.2.3',
      outcome: 'user_error',
      errorClass: 'archive_blocked',
      exitCode: 1,
      durationMs: 1500,
      context: { platform: 'darwin', changes: '4-10' },
    });
    await shutdown();

    const [event] = sentEvents();
    expect(event.event).toBe('command_completed');
    expect(event.properties).toMatchObject({
      command: 'archive',
      outcome: 'user_error',
      error_class: 'archive_blocked',
      exit_code: '1',
      duration: '500-2000',
      previous_outcome: 'none',
      previous_command_same: false,
      platform: 'darwin',
      changes: '4-10',
    });
  });

  it('buckets a child process exit code rather than sending it', async () => {
    await trackCompletion({
      command: 'workset:open',
      version: '1.2.3',
      outcome: 'internal_error',
      errorClass: 'external_tool_failed',
      exitCode: 137,
      durationMs: 50,
    });
    await shutdown();

    const body = String((fetchSpy.mock.calls[0][1] as RequestInit).body);
    expect(JSON.parse(body).batch[0].properties.exit_code).toBe('other');
    expect(body).not.toContain('137');
  });

  it('reports a retry against the previous run', async () => {
    await trackCompletion({
      command: 'archive',
      version: '1.2.3',
      outcome: 'user_error',
      errorClass: 'archive_blocked',
      exitCode: 1,
      durationMs: 10,
    });
    resetState();
    resetEventCount();

    await trackCompletion({
      command: 'archive',
      version: '1.2.3',
      outcome: 'success',
      errorClass: 'none',
      exitCode: 0,
      durationMs: 10,
    });
    await shutdown();

    const last = sentEvents().at(-1);
    expect(last.properties.previous_outcome).toBe('user_error');
    expect(last.properties.previous_command_same).toBe(true);
  });

  it('sends a milestone once and carries no run context on tool events', async () => {
    await trackMilestone('archive', '1.2.3');
    await trackConfiguredTools(['claude', 'cursor'], '1.2.3');
    await shutdown();

    const events = sentEvents();
    const milestone = events.find((e) => e.event === 'milestone_reached');
    expect(milestone.properties.milestone).toBe('archive');
    expect(milestone.properties.time_to_reach).toBe('<1h');

    const tools = events.filter((e) => e.event === 'tool_configured');
    expect(tools.map((e) => e.properties.tool).sort()).toEqual(['claude', 'cursor']);
    for (const tool of tools) {
      expect(tool.properties.platform).toBeUndefined();
      expect(tool.properties.changes).toBeUndefined();
      expect(tool.properties.install_kind).toBeUndefined();
    }

    resetState();
    resetEventCount();
    fetchSpy.mockClear();
    await trackMilestone('archive', '1.2.3');
    await trackConfiguredTools(['claude', 'cursor'], '1.2.3');
    await shutdown();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('drops a tool id that is not in the registry', async () => {
    await trackConfiguredTools(['acme-internal-agent'], '1.2.3');
    await shutdown();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('caps the events one invocation may send', async () => {
    for (let i = 0; i < 10; i += 1) {
      await trackCommand('list', '1.2.3');
    }
    await shutdown();
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(4);
  });

  describe('debug mode', () => {
    beforeEach(() => {
      process.env.OPENSPEC_TELEMETRY_DEBUG = '1';
    });

    it('prints to stderr and sends nothing', async () => {
      await trackCompletion({
        command: 'init',
        version: '1.2.3',
        outcome: 'success',
        errorClass: 'none',
        exitCode: 0,
        durationMs: 5,
      });
      await shutdown();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      const printed = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(printed).toContain('command_completed');
      expect(printed).toContain('"outcome":"success"');
    });

    it('works when telemetry is disabled', async () => {
      process.env.OPENSPEC_TELEMETRY = '0';
      await trackCommand('list', '1.2.3');
      await shutdown();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(errorSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('command_executed');
    });

    it('creates no anonymous id and spends no milestone claim', async () => {
      await trackCommand('list', '1.2.3');
      await trackMilestone('init', '1.2.3');
      await shutdown();

      await trackCompletion({
        command: 'list',
        version: '1.2.3',
        outcome: 'success',
        errorClass: 'none',
        exitCode: 0,
        durationMs: 5,
      });

      // Inspecting writes nothing at all — not the id, not the milestone
      // claim, not the retry record.
      const telemetry = await getTelemetryConfig();
      expect(telemetry).toEqual({});

      const printed = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(printed).toContain('00000000-0000-0000-0000-000000000000');
    });
  });

  describe('opt-out', () => {
    it('writes nothing to config and sends nothing', async () => {
      process.env.OPENSPEC_TELEMETRY = '0';
      await trackCommand('list', '1.2.3');
      await trackCompletion({
        command: 'list',
        version: '1.2.3',
        outcome: 'success',
        errorClass: 'none',
        exitCode: 0,
        durationMs: 5,
      });
      await trackMilestone('init', '1.2.3');
      await trackConfiguredTools(['claude'], '1.2.3');
      await shutdown();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(await getTelemetryConfig()).toEqual({});
    });
  });
});

describe('cancellation', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-cancel-'));
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
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('does not wait on the flush when the user pressed Ctrl-C', async () => {
    // A request that never settles: if shutdown awaited it, this test would
    // hang rather than fail, so the assertion is the timing itself.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>(() => {})
    );

    await trackCompletion({
      command: 'archive',
      version: '1.2.3',
      outcome: 'cancelled',
      errorClass: 'cancelled',
      exitCode: 130,
      durationMs: 20,
    });

    const startedAt = Date.now();
    await shutdown();
    expect(Date.now() - startedAt).toBeLessThan(100);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
