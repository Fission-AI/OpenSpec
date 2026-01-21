import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

// Mock posthog-node before importing the module
vi.mock('posthog-node', () => {
  return {
    PostHog: vi.fn().mockImplementation(() => ({
      capture: vi.fn(),
      shutdown: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Import after mocking
import { isTelemetryEnabled, maybeShowTelemetryNotice, shutdown, trackCommand } from '../../src/telemetry/index.js';
import { PostHog } from 'posthog-node';

describe('telemetry/index', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create unique temp directory for each test using UUID
    tempDir = path.join(os.tmpdir(), `openspec-telemetry-test-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Save original env
    originalEnv = { ...process.env };

    // Mock HOME to point to temp dir
    process.env.HOME = tempDir;

    // Clear all mocks
    vi.clearAllMocks();

    // Spy on console.log for notice tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore all mocks
    vi.restoreAllMocks();
  });

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

    it('should return true when no opt-out is set', () => {
      delete process.env.OPENSPEC_TELEMETRY;
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;
      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should prioritize OPENSPEC_TELEMETRY=0 over other settings', () => {
      process.env.OPENSPEC_TELEMETRY = '0';
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe('maybeShowTelemetryNotice', () => {
    it('should not show notice when telemetry is disabled', async () => {
      process.env.OPENSPEC_TELEMETRY = '0';

      await maybeShowTelemetryNotice();

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('trackCommand', () => {
    it('should not track when telemetry is disabled', async () => {
      process.env.OPENSPEC_TELEMETRY = '0';

      await trackCommand('test', '1.0.0');

      expect(PostHog).not.toHaveBeenCalled();
    });

    it('should track when telemetry is enabled', async () => {
      delete process.env.OPENSPEC_TELEMETRY;
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;

      await trackCommand('test', '1.0.0');

      expect(PostHog).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should not throw when no client exists', async () => {
      await expect(shutdown()).resolves.not.toThrow();
    });

    it('should handle shutdown errors silently', async () => {
      const mockPostHog = {
        capture: vi.fn(),
        shutdown: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      (PostHog as any).mockImplementation(() => mockPostHog);

      await expect(shutdown()).resolves.not.toThrow();
    });
  });
});
