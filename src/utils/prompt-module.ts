/**
 * Single loader for the interactive prompt module.
 *
 * Every prompt in the CLI goes through here so the time a person spends
 * thinking at a menu can be measured once, in one place, instead of being
 * counted as time the command took to run. Without this, `init`, `archive`,
 * and `config profile` would report a p95 latency that is really a p95
 * reading speed.
 *
 * The wrapper is timing only: it forwards arguments and results untouched,
 * and a rejection (Ctrl-C) still closes the window before it propagates.
 */
import { markPromptClosed, markPromptOpen } from '../telemetry/cli-runtime.js';

type PromptModule = typeof import('@inquirer/prompts');
type PromptName = 'confirm' | 'input' | 'select' | 'checkbox';

function timed<T extends (...args: never[]) => Promise<unknown>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    markPromptOpen();
    try {
      return await fn(...args);
    } finally {
      markPromptClosed();
    }
  }) as T;
}

/**
 * Load @inquirer/prompts with every prompt wrapped in timing.
 *
 * Kept as a dynamic import, matching what each call site did before: the
 * module is heavy and most runs never prompt at all.
 */
export async function loadPrompts(): Promise<PromptModule> {
  const prompts = await import('@inquirer/prompts');
  // A plain copy, not Object.create(prompts): module namespace properties are
  // non-writable, so assigning a wrapper over one through the prototype throws
  // in strict mode.
  const wrapped = { ...prompts } as Record<string, unknown>;
  for (const name of ['confirm', 'input', 'select', 'checkbox'] satisfies PromptName[]) {
    // Read defensively: a test double for this module exposes only the prompts
    // that test needs, and reading an absent export off a mocked namespace
    // throws rather than returning undefined.
    let fn: unknown;
    try {
      fn = prompts[name];
    } catch {
      continue;
    }
    if (typeof fn === 'function') {
      wrapped[name] = timed(fn as (...args: never[]) => Promise<unknown>);
    }
  }
  return wrapped as PromptModule;
}
