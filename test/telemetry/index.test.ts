import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { isTelemetryEnabled, maybeShowTelemetryNotice, shutdown, trackCommand } from '../../src/telemetry/index.js';

describe('telemetry/index', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    // Create unique temp directory for each test using UUID
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-telemetry-test-'));

    // Save original env
    originalEnv = { ...process.env };

    // Isolate global config to the temp dir via XDG (same path getGlobalConfig uses)
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.APPDATA = path.join(tempDir, 'appdata');

    // Clear all mocks
    vi.clearAllMocks();

    // Spy on console.log for notice tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Telemetry must never reach the real network in tests
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(async () => {
    // Restore original env
    process.env = originalEnv;

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    await shutdown();

    // Restore all mocks
    vi.restoreAllMocks();
  });

  function enableTelemetry() {
    delete process.env.OPENSPEC_TELEMETRY;
    delete process.env.DO_NOT_TRACK;
    delete process.env.CI;
  }

  /** Write an isolated global telemetry section for synchronous gate tests. */
  function writeTelemetryConfig(telemetry: Record<string, unknown>): void {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ telemetry })
    );
  }

  describe('isTelemetryEnabled', () => {
    it('should return false when OPENSPEC_TELEMETRY=0', () => {
      process.env.OPENSPEC_TELEMETRY = '0';
      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should return false when DO_NOT_TRACK=1', () => {
      process.env.DO_NOT_TRACK = '1';
      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should return false when CI=true', () => {
      process.env.CI = 'true';
      expect(isTelemetryEnabled()).toBe(false);
    });

    it.each(['1', 'yes', 'TRUE', 'on'])(
      'should return false for CI=%s (same rule as version-check)',
      (value) => {
        process.env.CI = value;
        expect(isTelemetryEnabled()).toBe(false);
      }
    );

    it.each(['false', '0', 'no', 'off', ''])(
      'should return true when CI=%s (explicitly off)',
      (value) => {
        enableTelemetry();
        process.env.CI = value;
        expect(isTelemetryEnabled()).toBe(true);
      }
    );

    it('should return true when no opt-out is set', () => {
      enableTelemetry();
      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should prioritize OPENSPEC_TELEMETRY=0 over other settings', () => {
      process.env.OPENSPEC_TELEMETRY = '0';
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;
      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should return false when telemetry.enabled is false in global config', () => {
      enableTelemetry();
      writeTelemetryConfig({ enabled: false });

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should return true when telemetry.enabled is missing (opt-out default)', () => {
      enableTelemetry();
      writeTelemetryConfig({ anonymousId: 'id-only' });

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should return true when telemetry.enabled is true', () => {
      enableTelemetry();
      writeTelemetryConfig({ enabled: true });

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should let OPENSPEC_TELEMETRY=0 win over telemetry.enabled true', () => {
      process.env.OPENSPEC_TELEMETRY = '0';
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;
      writeTelemetryConfig({ enabled: true });

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should let DO_NOT_TRACK=1 win over telemetry.enabled true', () => {
      enableTelemetry();
      process.env.DO_NOT_TRACK = '1';
      writeTelemetryConfig({ enabled: true });

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should let CI win over telemetry.enabled true', () => {
      enableTelemetry();
      process.env.CI = '1';
      writeTelemetryConfig({ enabled: true });

      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe('maybeShowTelemetryNotice', () => {
    it('should not show notice when telemetry is disabled', async () => {
      process.env.OPENSPEC_TELEMETRY = '0';

      await maybeShowTelemetryNotice();

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not show notice when telemetry.enabled is false', async () => {
      enableTelemetry();
      writeTelemetryConfig({ enabled: false });

      await maybeShowTelemetryNotice();

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('trackCommand', () => {
    it('should send nothing when telemetry is disabled', async () => {
      process.env.OPENSPEC_TELEMETRY = '0';

      await trackCommand('test', '1.0.0');
      await shutdown();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should send nothing when telemetry.enabled is false', async () => {
      enableTelemetry();
      writeTelemetryConfig({ enabled: false, anonymousId: 'keep-me' });

      await trackCommand('test', '1.0.0');
      await shutdown();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should post one capture event to the batch endpoint when enabled', async () => {
      enableTelemetry();

      await trackCommand('test', '1.0.0');
      await shutdown();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://edge.openspec.dev/batch/');
      expect(options.method).toBe('POST');

      const payload = JSON.parse(String(options.body));
      expect(payload.api_key).toEqual(expect.any(String));
      expect(payload.batch).toHaveLength(1);
      const event = payload.batch[0];
      expect(event.type).toBe('capture');
      expect(event.event).toBe('command_executed');
      expect(event.distinct_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(event.timestamp).toEqual(expect.any(String));
      expect(event.properties).toEqual({
        command: 'test',
        version: '1.0.0',
        surface: 'cli',
        $ip: null,
      });
    });

    it('should bound the request with a timeout signal', async () => {
      enableTelemetry();

      await trackCommand('test', '1.0.0');
      await shutdown();

      const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('should swallow a network error silently', async () => {
      enableTelemetry();
      fetchSpy.mockRejectedValueOnce(new Error('network down'));

      await trackCommand('test', '1.0.0');
      await expect(shutdown()).resolves.not.toThrow();
    });

    it('should swallow an abort silently', async () => {
      enableTelemetry();
      fetchSpy.mockRejectedValueOnce(new DOMException('This operation was aborted', 'AbortError'));

      await trackCommand('test', '1.0.0');
      await expect(shutdown()).resolves.not.toThrow();
    });

    it('should swallow a non-2xx response silently', async () => {
      enableTelemetry();
      fetchSpy.mockResolvedValueOnce(new Response('forbidden', { status: 403 }));

      await trackCommand('test', '1.0.0');
      await expect(shutdown()).resolves.not.toThrow();
    });

    it('should dispose the response body of a successful response before the event settles', async () => {
      // Undici holds the connection until the body is consumed or canceled;
      // an undisposed body would let the socket outlive shutdown().
      enableTelemetry();
      const response = new Response('{"status": 1}', { status: 200 });
      fetchSpy.mockResolvedValueOnce(response);

      await trackCommand('test', '1.0.0');
      await shutdown();

      expect(response.bodyUsed).toBe(true);
    });

    it('should dispose the response body of a non-2xx response before the event settles', async () => {
      enableTelemetry();
      const response = new Response('rate limited', { status: 429 });
      fetchSpy.mockResolvedValueOnce(response);

      await trackCommand('test', '1.0.0');
      await shutdown();

      expect(response.bodyUsed).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should not throw when nothing is pending', async () => {
      await expect(shutdown()).resolves.not.toThrow();
    });

    it('should flush an in-flight event before returning', async () => {
      enableTelemetry();

      let settle!: (response: Response) => void;
      fetchSpy.mockImplementationOnce(
        () => new Promise<Response>((resolve) => (settle = resolve))
      );

      await trackCommand('test', '1.0.0');

      let flushed = false;
      const flushing = shutdown().then(() => {
        flushed = true;
      });

      // The event is still in flight, so shutdown must still be waiting.
      await Promise.resolve();
      expect(flushed).toBe(false);

      settle(new Response(null, { status: 200 }));
      await flushing;
      expect(flushed).toBe(true);
    });
  });

  describe('published dependency tree (#1390)', () => {
    it('ships no posthog packages to consumers', () => {
      // Downstream supply-chain age policies (pnpm minimumReleaseAge) broke
      // installs whenever the posthog subtree had a release younger than the
      // policy window — which, at posthog's publish cadence, was most days.
      // Telemetry now speaks the wire format directly; nothing in the
      // published manifest may reintroduce that tree.
      const manifest = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      ) as {
        dependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };

      const shipped = {
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
        ...manifest.peerDependencies,
      };
      const posthogDeps = Object.keys(shipped).filter((name) =>
        name.toLowerCase().includes('posthog')
      );
      expect(posthogDeps).toEqual([]);
    });

    it('imports no posthog module anywhere in src', () => {
      const hits: string[] = [];
      const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.endsWith('.ts')) {
            const content = fs.readFileSync(full, 'utf-8');
            if (/from\s+['"](posthog|@posthog)/.test(content)) {
              hits.push(full);
            }
          }
        }
      };
      walk(path.join(process.cwd(), 'src'));
      expect(hits).toEqual([]);
    });
  });
});
