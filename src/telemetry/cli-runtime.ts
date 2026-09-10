/**
 * Wiring between the CLI and telemetry.
 *
 * The hard part this module exists for is coverage. Three families of exit
 * skip commander's `postAction` hook, and each one hides the runs we most need
 * to see:
 *
 * 1. An action handler calling `process.exit()`. Those sites now set
 *    `process.exitCode` and return; `markOutcome` records the class on the way
 *    past so the hook can report it.
 * 2. Commander's own usage errors — unknown command, unknown flag, a group
 *    invoked with no subcommand. These exit before `preAction` ever runs, so
 *    they produce no event at all today, and they are precisely the "user
 *    typed the wrong thing" signal.
 * 3. An error escaping a command's own handling. Commander chains hooks
 *    without a `catch`, so the rejection skips the hook and lands nowhere.
 *
 * Nothing here prompts, blocks, or writes to stdout.
 */
import type { Command } from 'commander';
import { classifyError } from './classify.js';
import { collectRunContext } from './context.js';
import {
  isFirstRun,
  isTelemetryEnabled,
  shutdown,
  trackCompletion,
  trackConfiguredTools,
  trackMilestone,
} from './index.js';
import { setRegistryChecks, type ErrorClass, type Milestone, type Outcome } from './properties.js';

/** Milliseconds spent blocked on an interactive prompt, excluded from duration. */
let promptedMs = 0;
let promptOpenedAt: number | null = null;
let startedAt: number | null = null;
let completionSent = false;

let pending: { outcome: Outcome; errorClass: ErrorClass } | null = null;
let earnedMilestone: Milestone | null = null;

/** Commands whose success is an activation milestone. */
/**
 * Commands whose success is an activation milestone.
 *
 * `propose` and `apply` are agent workflows, not CLI commands, so the CLI
 * observes them through the commands an agent runs on their behalf:
 * `new:change` creates the proposal, and `validate` is what an agent runs as
 * it works the change. `install` is not a command at all — it is the run that
 * mints the anonymous id, so it is emitted from the completion path.
 */
const MILESTONE_COMMANDS: Readonly<Record<string, Milestone>> = {
  init: 'init',
  'new:change': 'propose',
  validate: 'apply',
  archive: 'archive',
};

/**
 * The running CLI version, captured once so out-of-band reporters can send it
 * without importing package.json — which would form a cycle back through the
 * command modules that need to report.
 */
let runVersion = '0.0.0';

export function getRunVersion(): string {
  return runVersion;
}

export function beginRun(version = runVersion): void {
  runVersion = version;
  startedAt = Date.now();
  completionSent = false;
  pending = null;
  earnedMilestone = null;
  promptedMs = 0;
  promptOpenedAt = null;
  interactiveCapable = false;
}

/** Called around an interactive prompt so its wait never enters the duration. */
export function markPromptOpen(): void {
  promptOpenedAt = Date.now();
}

export function markPromptClosed(): void {
  if (promptOpenedAt !== null) {
    promptedMs += Date.now() - promptOpenedAt;
    promptOpenedAt = null;
  }
}

/**
 * True when this run either opened a prompt or could have.
 *
 * Both halves matter. The measured half excludes think time from the
 * duration; the capability half is what latency analysis filters on, because
 * a run that *could* have prompted is one whose timing is not comparable to an
 * agent's — and agent runs, which never prompt, are the population whose
 * latency we actually want to read.
 */
export function wasPrompted(): boolean {
  return promptedMs > 0 || promptOpenedAt !== null || interactiveCapable;
}

let interactiveCapable = false;

/** Record whether this run could prompt at all (both streams a terminal). */
export function markInteractiveCapable(capable: boolean): void {
  interactiveCapable = capable;
}

/**
 * Record how this run ended, for the completion hook to report.
 *
 * Called from the shared failure paths rather than from each command, so a
 * command that gains a new error path is covered without touching it.
 */
export function markOutcome(error: unknown): void {
  if (pending) {
    return; // First classification wins; a rethrow must not reclassify.
  }
  pending = classifyError(error);
}

/** Record a failure whose class is already known, without an error object. */
export function markFailure(errorClass: ErrorClass, outcome: Outcome = 'user_error'): void {
  if (!pending) {
    pending = { outcome, errorClass };
  }
}

/** A command that ran correctly and reported the content invalid. */
export function markCheckFailed(): void {
  markFailure('validation_failed');
}

export function markMilestone(commandPath: string): void {
  const milestone = MILESTONE_COMMANDS[commandPath];
  if (milestone) {
    earnedMilestone = milestone;
  }
}

/** Teach the property allowlist which commands and tools are registered. */
export function registerAllowlists(program: Command, toolIds: readonly string[]): void {
  const commands = new Set<string>();
  const walk = (command: Command, prefix: string[]): void => {
    for (const child of command.commands) {
      const name = child.name();
      const path = [...prefix, name];
      commands.add(path.join(':'));
      walk(child, path);
    }
  };
  walk(program, []);

  const tools = new Set(toolIds);
  setRegistryChecks({
    isCommand: (value) => commands.has(value),
    isTool: (value) => tools.has(value),
  });
}

export interface CompletionInput {
  command: string;
  version: string;
  exitCode: number | undefined;
  jsonMode: boolean;
  projectRoot?: string | null;
  storeInUse?: boolean;
  schemaSource?: 'package' | 'project' | 'user';
  toolIds?: string[];
  /** Skip the context collection when the exit path cannot afford it. */
  minimal?: boolean;
}

/**
 * Send `command_completed` exactly once for this invocation.
 *
 * Idempotent by design: several exit paths may reach it, and a duplicate would
 * double-count every failure rate built on this event.
 */
export async function finishRun(input: CompletionInput): Promise<void> {
  if (completionSent) {
    return;
  }
  completionSent = true;

  const exitCode = input.exitCode;
  const failed = exitCode !== undefined && exitCode !== 0;

  let outcome: Outcome;
  let errorClass: ErrorClass;
  if (pending) {
    ({ outcome, errorClass } = pending);
  } else if (exitCode === 130) {
    outcome = 'cancelled';
    errorClass = 'cancelled';
  } else if (failed) {
    // A non-zero exit that reached no classifier. Recorded as `unclassified`
    // rather than `internal_error`: the CLI has many paths that set an exit
    // code without throwing, so presuming a bug here would drown the
    // internal_error rate in ordinary user errors and make it useless for the
    // one thing it exists to measure.
    outcome = 'user_error';
    errorClass = 'unclassified';
  } else {
    outcome = 'success';
    errorClass = 'none';
  }

  const durationMs = Math.max(0, (startedAt ? Date.now() - startedAt : 0) - promptedMs);

  let context: Record<string, unknown> | undefined;
  if (!input.minimal) {
    try {
      context = await collectRunContext({
        projectRoot: input.projectRoot,
        stdoutIsTty: Boolean(process.stdout.isTTY),
        jsonMode: input.jsonMode,
        prompted: wasPrompted(),
        firstRun: isFirstRun(),
        storeInUse: Boolean(input.storeInUse),
        schemaSource: input.schemaSource,
        toolCount: input.toolIds?.length,
      });
    } catch {
      // Context is decoration on the outcome; losing it never loses the event.
    }
  }

  await trackCompletion({
    command: input.command,
    version: input.version,
    outcome,
    errorClass,
    exitCode,
    durationMs,
    context,
  });

  // The run that mints the anonymous id is the install: without it the
  // activation funnel has no denominator.
  if (isFirstRun()) {
    await trackMilestone('install', input.version);
  }

  if (outcome === 'success' && earnedMilestone) {
    await trackMilestone(earnedMilestone, input.version);
  }

  if (outcome === 'success' && input.toolIds?.length && isTelemetryEnabled()) {
    await trackConfiguredTools(input.toolIds, input.version);
  }
}

/**
 * Report a failure that exits before the normal hook can run, then flush.
 *
 * Used for commander's own usage errors and for an escaped rejection: both
 * exit immediately, so the flush has to be explicit.
 */
export async function finishAndFlush(input: CompletionInput): Promise<void> {
  await finishRun(input);
  await shutdown();
}
