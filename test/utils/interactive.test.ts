import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Readable, Writable } from 'node:stream';
import {
  confirmPrompt,
  isInteractive,
  isNonInteractivePromptError,
  resolveNoInteractive,
  InteractiveOptions,
} from '../../src/utils/interactive.js';

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

  describe('isNonInteractivePromptError', () => {
    function setStdinIsTTY(value: boolean): void {
      Object.defineProperty(process.stdin, 'isTTY', { value, writable: true, configurable: true });
    }

    function exitPromptError(message: string): Error {
      const error = new Error(message);
      error.name = 'ExitPromptError';
      return error;
    }

    it('recognizes a prompt that failed with no terminal to answer it', () => {
      setStdinIsTTY(false);
      expect(
        isNonInteractivePromptError(exitPromptError('User force closed the prompt with 0 null'))
      ).toBe(true);
    });

    it('recognizes the failure by name alone', () => {
      // An @inquirer upgrade may reword the message; the error class is the
      // other half of the signal and must stand on its own.
      setStdinIsTTY(false);
      expect(isNonInteractivePromptError(exitPromptError('prompt closed'))).toBe(true);
    });

    it('recognizes the failure by message alone', () => {
      // ...and vice versa, if the class is ever renamed or duplicated by a
      // bundled copy of the library.
      setStdinIsTTY(false);
      const plain = new Error('User force closed the prompt with 0 null');
      expect(isNonInteractivePromptError(plain)).toBe(true);
    });

    it('treats a SIGINT cancellation as a cancellation, terminal or not', () => {
      const sigint = exitPromptError('User force closed the prompt with SIGINT');
      setStdinIsTTY(true);
      expect(isNonInteractivePromptError(sigint)).toBe(false);
      // A script started from a terminal has a piped stdin and still receives
      // Ctrl-C: the signal, not the terminal, proves the user was there.
      setStdinIsTTY(false);
      expect(isNonInteractivePromptError(sigint)).toBe(false);
    });

    it('honors the same non-interactive signals as isInteractive()', () => {
      const failure = exitPromptError('User force closed the prompt with 0 null');

      // A pty-allocating CI runner: a terminal exists, but CI declares that
      // nobody is watching it.
      setStdinIsTTY(true);
      expect(isNonInteractivePromptError(failure)).toBe(false);

      process.env.CI = 'true';
      expect(isNonInteractivePromptError(failure)).toBe(true);
      delete process.env.CI;

      process.env.OPEN_SPEC_INTERACTIVE = '0';
      expect(isNonInteractivePromptError(failure)).toBe(true);
      delete process.env.OPEN_SPEC_INTERACTIVE;

      expect(isNonInteractivePromptError(failure, { interactive: false })).toBe(true);
    });

    it('ignores unrelated failures', () => {
      setStdinIsTTY(false);
      expect(isNonInteractivePromptError(new Error('disk full'))).toBe(false);
      expect(isNonInteractivePromptError('not an error')).toBe(false);
      expect(isNonInteractivePromptError(undefined)).toBe(false);
    });
  });

  describe('confirmPrompt (non-TTY reader, #1526)', () => {
    // A writable that keeps every byte written, so a test can assert the exact
    // bytes an archive run would append to a redirected log.
    function captureOutput(): Writable & { text: () => string } {
      const chunks: string[] = [];
      const stream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      }) as Writable & { text: () => string };
      stream.text = () => chunks.join('');
      return stream;
    }

    // A non-TTY input carrying `data`, or an already-ended stream for the EOF case.
    function pipedInput(data: string | null): Readable {
      return Readable.from(data === null ? [] : [data]);
    }

    it('reads a piped "y" without emitting any ANSI escape sequences', async () => {
      const output = captureOutput();
      const result = await confirmPrompt(
        { message: 'Continue?', default: false },
        { input: pipedInput('y\n'), output }
      );
      expect(result).toBe(true);
      // The disk-fill bug was @inquirer writing cursor-move escapes to a
      // non-TTY stdout; the plain reader must write none.
      expect(output.text()).not.toContain('\u001b'); // no ANSI escape byte
      expect(output.text()).toBe('Continue? (y/N) \n');
    });

    it('reads a piped "n" as false', async () => {
      const output = captureOutput();
      const result = await confirmPrompt(
        { message: 'Continue?', default: true },
        { input: pipedInput('n\n'), output }
      );
      expect(result).toBe(false);
      expect(output.text()).not.toContain('\u001b'); // no ANSI escape byte
    });

    it('accepts long forms (yes/no), case-insensitively and trimmed', async () => {
      const yes = await confirmPrompt(
        { message: 'Q?', default: false },
        { input: pipedInput('  YES \n'), output: captureOutput() }
      );
      const no = await confirmPrompt(
        { message: 'Q?', default: true },
        { input: pipedInput('No\n'), output: captureOutput() }
      );
      expect(yes).toBe(true);
      expect(no).toBe(false);
    });

    it('reads Windows CRLF-terminated input (y\\r\\n) as a clean yes', async () => {
      // The bug was reported on Windows, where a piped answer often arrives as
      // `y\r\n`. readline splits on \n, leaving `y\r`; trim() drops the \r.
      const output = captureOutput();
      const result = await confirmPrompt(
        { message: 'Continue?', default: false },
        { input: pipedInput('y\r\n'), output }
      );
      expect(result).toBe(true);
      expect(output.text()).not.toContain('');
    });

    it('matches @inquirer prefix parsing (yeah/nope), preserving old behavior', async () => {
      // @inquirer/confirm parses with /^(y|yes)/i and /^(n|no)/i. On the
      // spec-update prompt (default true), a prefix-`n` answer must stay false
      // rather than fall through to the default and write specs anyway.
      const yeah = await confirmPrompt(
        { message: 'Q?', default: false },
        { input: pipedInput('yeah\n'), output: captureOutput() }
      );
      const nope = await confirmPrompt(
        { message: 'Q?', default: true },
        { input: pipedInput('nope\n'), output: captureOutput() }
      );
      expect(yeah).toBe(true);
      expect(nope).toBe(false);
    });

    it('falls back to the default on an empty or unrecognized answer', async () => {
      const emptyTrue = await confirmPrompt(
        { message: 'Q?', default: true },
        { input: pipedInput('\n'), output: captureOutput() }
      );
      const emptyFalse = await confirmPrompt(
        { message: 'Q?', default: false },
        { input: pipedInput('\n'), output: captureOutput() }
      );
      const garbage = await confirmPrompt(
        { message: 'Q?', default: true },
        { input: pipedInput('maybe\n'), output: captureOutput() }
      );
      expect(emptyTrue).toBe(true);
      expect(emptyFalse).toBe(false);
      expect(garbage).toBe(true);
    });

    it('blocks (does not hang) on a second prompt after stdin was already drained', async () => {
      // archive asks up to three questions; only one piped answer was ever
      // supported. The first read drains stdin, so a later prompt must reject
      // promptly (→ #1479 "rerun with --yes") rather than hang and exit as a
      // no-op. This exercises the input.readableEnded guard.
      const input = pipedInput('y\n');
      const first = await confirmPrompt(
        { message: 'First?', default: false },
        { input, output: captureOutput() }
      );
      expect(first).toBe(true);
      await expect(
        confirmPrompt(
          { message: 'Second?', default: false },
          { input, output: captureOutput() }
        )
      ).rejects.toMatchObject({ name: 'ExitPromptError' });
    });

    it('rejects with an ExitPromptError when no answer can be read (EOF)', async () => {
      // This is the seam the #1479 guidance hangs off: confirmOrBlock catches it
      // via isNonInteractivePromptError and tells the user to rerun with --yes.
      await expect(
        confirmPrompt(
          { message: 'Continue?', default: false },
          { input: pipedInput(null), output: captureOutput() }
        )
      ).rejects.toMatchObject({ name: 'ExitPromptError' });
    });

    it('produces an error isNonInteractivePromptError classifies as non-interactive', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true, configurable: true });
      const error = await confirmPrompt(
        { message: 'Continue?', default: false },
        { input: pipedInput(null), output: captureOutput() }
      ).catch((e) => e);
      expect(isNonInteractivePromptError(error)).toBe(true);
    });
  });
});
