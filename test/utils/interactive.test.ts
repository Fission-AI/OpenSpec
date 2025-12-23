import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isInteractive, resolveNoInteractive, InteractiveOptions } from '../../src/utils/interactive.js';

describe('interactive utilities', () => {
  let originalOpenSpecInteractive: string | undefined;
  let originalCI: string | undefined;
  let originalStdinIsTTY: boolean | undefined;

  beforeEach(() => {
    // Save original environment
    originalOpenSpecInteractive = process.env.OPEN_SPEC_INTERACTIVE;
    originalCI = process.env.CI;
    originalStdinIsTTY = process.stdin.isTTY;

    // Clear environment for clean testing
    delete process.env.OPEN_SPEC_INTERACTIVE;
    delete process.env.CI;
  });

  afterEach(() => {
    // Restore original environment
    if (originalOpenSpecInteractive !== undefined) {
      process.env.OPEN_SPEC_INTERACTIVE = originalOpenSpecInteractive;
    } else {
      delete process.env.OPEN_SPEC_INTERACTIVE;
    }
    if (originalCI !== undefined) {
      process.env.CI = originalCI;
    } else {
      delete process.env.CI;
    }
    // Restore stdin.isTTY
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalStdinIsTTY,
      writable: true,
      configurable: true,
    });
  });

  describe('resolveNoInteractive', () => {
    it('should return true when noInteractive is true', () => {
      expect(resolveNoInteractive({ noInteractive: true })).toBe(true);
    });

    it('should return true when interactive is false (Commander.js style)', () => {
      // This is how Commander.js handles --no-interactive flag
      expect(resolveNoInteractive({ interactive: false })).toBe(true);
    });

    it('should return false when noInteractive is false', () => {
      expect(resolveNoInteractive({ noInteractive: false })).toBe(false);
    });

    it('should return false when interactive is true', () => {
      expect(resolveNoInteractive({ interactive: true })).toBe(false);
    });

    it('should return false for empty options object', () => {
      expect(resolveNoInteractive({})).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(resolveNoInteractive(undefined)).toBe(false);
    });

    it('should handle boolean value true', () => {
      expect(resolveNoInteractive(true)).toBe(true);
    });

    it('should handle boolean value false', () => {
      expect(resolveNoInteractive(false)).toBe(false);
    });

    it('should prioritize noInteractive over interactive when both set', () => {
      // noInteractive: true should win
      expect(resolveNoInteractive({ noInteractive: true, interactive: true })).toBe(true);
      // If noInteractive is false, check interactive
      expect(resolveNoInteractive({ noInteractive: false, interactive: false })).toBe(true);
    });
  });

  describe('isInteractive', () => {
    it('should return false when noInteractive is true', () => {
      expect(isInteractive({ noInteractive: true })).toBe(false);
    });

    it('should return false when interactive is false (Commander.js --no-interactive)', () => {
      expect(isInteractive({ interactive: false })).toBe(false);
    });

    it('should return false when OPEN_SPEC_INTERACTIVE env var is 0', () => {
      process.env.OPEN_SPEC_INTERACTIVE = '0';
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return false when CI env var is set', () => {
      process.env.CI = 'true';
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return false when CI env var is set to any value', () => {
      // CI can be set to any value, not just "true"
      process.env.CI = '1';
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return false when stdin is not a TTY', () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true, configurable: true });
      expect(isInteractive({})).toBe(false);
    });

    it('should return true when stdin is TTY and no flags disable it', () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive({})).toBe(true);
    });

    it('should return true when stdin is TTY and options are undefined', () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
      expect(isInteractive(undefined)).toBe(true);
    });
  });
});
