import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

import { isTelemetryEnabled, maybeShowTelemetryNotice, shutdown, trackCommand } from '../../src/telemetry/index.js';

describe('telemetry/index', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create unique temp directory for each test using UUID
    tempDir = path.join(os.tmpdir(), `lightspec-telemetry-test-${randomUUID()}`);
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
    it('should return false when LIGHTSPEC_TELEMETRY=0', () => {
      process.env.LIGHTSPEC_TELEMETRY = '0';
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
      delete process.env.LIGHTSPEC_TELEMETRY;
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;
      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should prioritize LIGHTSPEC_TELEMETRY=0 over other settings', () => {
      process.env.LIGHTSPEC_TELEMETRY = '0';
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe('maybeShowTelemetryNotice', () => {
    it('should not show notice when telemetry is disabled', async () => {
      process.env.LIGHTSPEC_TELEMETRY = '0';

      await maybeShowTelemetryNotice();

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('trackCommand', () => {
    it('should do nothing when telemetry is disabled', async () => {
      process.env.LIGHTSPEC_TELEMETRY = '0';

      await expect(trackCommand('test', '1.0.0')).resolves.not.toThrow();
    });

    it('should not throw when telemetry is enabled', async () => {
      delete process.env.LIGHTSPEC_TELEMETRY;
      delete process.env.DO_NOT_TRACK;
      delete process.env.CI;

      await expect(trackCommand('test', '1.0.0')).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should not throw', async () => {
      await expect(shutdown()).resolves.not.toThrow();
    });
  });
});
