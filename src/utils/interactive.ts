import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type InteractiveOptions = {
  /**
   * Explicit "disable prompts" flag passed by internal callers.
   */
  noInteractive?: boolean;
  /**
   * Commander-style negated option: `--no-interactive` sets this to false.
   */
  interactive?: boolean;
};

/**
 * Resolves whether non-interactive mode is requested.
 * Handles both explicit `noInteractive: true` and Commander.js style `interactive: false`.
 * Use this helper instead of manually checking options.noInteractive to avoid bugs.
 */
export function resolveNoInteractive(value?: boolean | InteractiveOptions): boolean {
  if (typeof value === 'boolean') return value;
  return value?.noInteractive === true || value?.interactive === false;
}

export function isInteractive(value?: boolean | InteractiveOptions): boolean {
  if (resolveNoInteractive(value)) return false;
  if (process.env.OPEN_SPEC_INTERACTIVE === '0') return false;
  // Respect the standard CI environment variable (set by GitHub Actions, GitLab CI, Travis, etc.)
  if ('CI' in process.env) return false;
  return !!process.stdin.isTTY;
}

/**
 * True when a prompt failed because no answer could be read — an agent or a
 * script that ran the command with stdin closed, a CI job, or a shell whose
 * stdin is not a terminal. @inquirer rejects those with `User force closed
 * the prompt with 0 null`, which is accurate and useless: it names no flag
 * and no next step (#1479).
 *
 * Two things it deliberately is not:
 *
 * - It is not a substitute for `isInteractive()`. This classifies a prompt
 *   that has *already failed*, so piped answers are unaffected: an answer
 *   that arrives resolves the prompt and never reaches this check. Refusing
 *   to prompt up front would break `printf 'y\n' | openspec archive ...`,
 *   which works today.
 * - It is not a cancellation check. Ctrl-C raises the same error class, and
 *   it reaches a process whose stdin is a pipe just as easily as one at a
 *   terminal, so the SIGINT signal - not the terminal - is what proves
 *   somebody was there and chose to quit.
 *
 * Beyond that it defers to `isInteractive()`, so `CI`, `OPEN_SPEC_INTERACTIVE=0`
 * and `--no-interactive` count even when a runner allocated a pty.
 */
export function isNonInteractivePromptError(
  error: unknown,
  value?: boolean | InteractiveOptions
): boolean {
  if (!(error instanceof Error)) return false;
  const failedPrompt =
    error.name === 'ExitPromptError' || error.message.includes('force closed the prompt');
  if (!failedPrompt) return false;
  if (error.message.includes('SIGINT')) return false;
  return !isInteractive(value);
}

export type ConfirmPrompt = {
  message: string;
  default: boolean;
};

/**
 * Ask a yes/no question. A real terminal gets @inquirer's rich prompt;
 * everything else — a pipe, a file redirect, an agent that captures stdout —
 * reads one plain line instead.
 *
 * @inquirer renders `confirm` by writing ANSI cursor-movement escape sequences,
 * and it emits them even when stdout is not a TTY. Redirected to a file those
 * sequences are noise, and in some non-TTY hosts the render loop never settles
 * and repeats `ESC[NNG` cursor moves until the disk fills (#1526). Reading
 * the answer ourselves keeps the single piped answer @inquirer ever supported
 * working (`printf 'y\n' | openspec archive ...`) without emitting any escapes.
 *
 * `io` overrides the streams; it exists for tests and mirrors @inquirer's own
 * `{ input, output }` context. Production callers pass only the prompt.
 */
export async function confirmPrompt(
  prompt: ConfirmPrompt,
  io: { input?: Readable; output?: Writable } = {}
): Promise<boolean> {
  const input = io.input ?? process.stdin;
  const output = io.output ?? process.stdout;
  const isTerminal =
    Boolean((input as { isTTY?: boolean }).isTTY) &&
    Boolean((output as { isTTY?: boolean }).isTTY);
  if (isTerminal) {
    const { confirm } = await import('@inquirer/prompts');
    return confirm(prompt);
  }
  return readYesNo(prompt, input, output);
}

function readYesNo(
  prompt: ConfirmPrompt,
  input: Readable,
  output: Writable
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const blockOnNoAnswer = () => {
      // No line could be read (stdin closed / EOF). Mirror @inquirer's failure
      // so callers that classify it — isNonInteractivePromptError, the #1479
      // "rerun with --yes" guidance — keep working unchanged.
      const error = new Error('User force closed the prompt');
      error.name = 'ExitPromptError';
      reject(error);
    };
    // An earlier prompt may have already drained stdin (only one piped answer
    // was ever supported). A fresh readline over an ended stream never emits
    // 'close', so guard here rather than hang and exit as a no-op.
    if (input.readableEnded) {
      blockOnNoAnswer();
      return;
    }
    output.write(`${prompt.message} ${prompt.default ? '(Y/n)' : '(y/N)'} `);
    // terminal:false guarantees readline never emits its own line-editing
    // escapes — an escape-free read is the whole point here.
    const rl = createInterface({ input, terminal: false });
    let answered = false;
    rl.once('line', (line) => {
      answered = true;
      rl.close();
      output.write('\n');
      // Mirror @inquirer/confirm's parser (prefix match on y/yes and n/no,
      // otherwise the default) so a piped answer resolves identically to the
      // interactive prompt it replaces.
      const answer = line.trim();
      if (/^(y|yes)/i.test(answer)) {
        resolve(true);
      } else if (/^(n|no)/i.test(answer)) {
        resolve(false);
      } else {
        resolve(prompt.default);
      }
    });
    rl.once('close', () => {
      if (answered) return;
      blockOnNoAnswer();
    });
  });
}

