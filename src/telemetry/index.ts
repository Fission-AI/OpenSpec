/**
 * Telemetry module for anonymous usage analytics.
 *
 * Privacy-first design:
 * - Only tracks command name and version
 * - No arguments, file paths, or content
 * - Opt-out via OPENSPEC_TELEMETRY=0, DO_NOT_TRACK=1, or
 *   `openspec config set telemetry.enabled false`
 * - Auto-disabled in CI environments
 * - Anonymous ID is a random UUID with no relation to the user
 *
 * Events are sent with a plain fetch to PostHog's stable public `/batch/`
 * endpoint — the same one posthog-node used — instead of through the SDK.
 * The SDK's only remaining job here was the wire format: every reliability
 * knob was already forced to "send one event immediately, time-bounded,
 * never retry, never throw". Carrying `posthog-node` for that shipped its
 * fast-moving transitive tree (`@posthog/core`, `@posthog/types`, multiple
 * releases per day) to every downstream consumer, where supply-chain age
 * policies such as pnpm's `minimumReleaseAge` rejected the freshly published
 * versions and broke installs (#1390).
 */
import { randomUUID } from 'crypto';
import { getGlobalConfig } from '../core/global-config.js';
import { isCiEnvironment } from '../utils/ci.js';
import { getTelemetryConfig, updateTelemetryConfig } from './config.js';
import {
  bucketDuration,
  bucketExitCode,
  isEventName,
  isRegistryTool,
  sanitizeProperties,
  type ErrorClass,
  type EventName,
  type Milestone,
  type Outcome,
} from './properties.js';
import {
  claimMilestone,
  claimUnreportedTools,
  getRunId,
  loadSessionState,
  recordOutcome,
  type SessionState,
} from './state.js';

// PostHog API key - public key for client-side analytics
// This is safe to embed as it only allows sending events, not reading data
const POSTHOG_API_KEY = 'phc_Hthu8YvaIJ9QaFKyTG4TbVwkbd5ktcAFzVTKeMmoW2g';
// Using reverse proxy to avoid ad blockers and keep traffic on our domain
const POSTHOG_HOST = 'https://edge.openspec.dev';
const TELEMETRY_REQUEST_TIMEOUT_MS = 1000;

let anonymousId: string | null = null;

/**
 * Events already sent this invocation, against the per-invocation cap. An
 * agent harness can invoke this CLI dozens of times inside one task; an
 * uncapped per-invocation count turns that into a burst of outbound requests
 * nobody asked for.
 */
const MAX_EVENTS_PER_INVOCATION = 4;
let eventsSent = 0;

/**
 * True when the user asked to see the payloads instead of sending them.
 * Deliberately independent of whether telemetry is enabled: the person most
 * likely to want this is someone who already opted out and is deciding whether
 * to opt back in.
 */
export function isDebugMode(): boolean {
  return process.env.OPENSPEC_TELEMETRY_DEBUG === '1';
}

/** Test seam: forget the per-invocation event count. */
export function resetEventCount(): void {
  eventsSent = 0;
}

/**
 * Requests started by trackCommand and not yet settled, so shutdown can
 * flush them before the process exits. Each request is individually
 * time-bounded, so awaiting them cannot stall exit for more than the
 * request timeout.
 */
const pendingEvents = new Set<Promise<void>>();

async function safeTelemetryFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    // Telemetry never reads the body, but undici keeps the connection
    // occupied until the body is consumed or canceled — dispose of it on
    // every path so no socket outlives shutdown().
    if (response.body) {
      await response.body.cancel();
    }
    if (response.ok) {
      return response;
    }
  } catch {
    // Silent failure - telemetry should never surface network noise
  }

  return new Response(null, { status: 204 });
}

/**
 * Check if telemetry is enabled.
 *
 * Precedence (first match wins):
 * 1. OPENSPEC_TELEMETRY=0 → disabled
 * 2. DO_NOT_TRACK=1 → disabled
 * 3. CI set to a truthy/on value → disabled (same rule as version-check)
 * 4. global config telemetry.enabled === false → disabled
 * 5. otherwise enabled (unset config means on; opt-out model)
 *
 * Kept synchronous so call sites need not become async. Reads config via
 * sync getGlobalConfig() rather than async getTelemetryConfig().
 */
export function isTelemetryEnabled(): boolean {
  // Check explicit opt-out
  if (process.env.OPENSPEC_TELEMETRY === '0') {
    return false;
  }

  // Respect DO_NOT_TRACK standard
  if (process.env.DO_NOT_TRACK === '1') {
    return false;
  }

  // Auto-disable in CI environments (providers use true/1/yes/…)
  if (isCiEnvironment()) {
    return false;
  }

  // Global config opt-out (env/CI remain hard overrides above)
  if (getGlobalConfig().telemetry?.enabled === false) {
    return false;
  }

  return true;
}

/**
 * Get or create the anonymous user ID.
 * Lazily generates a UUID on first call and persists it.
 */
export async function getOrCreateAnonymousId(): Promise<string> {
  // Return cached value if available
  if (anonymousId) {
    return anonymousId;
  }

  // Try to load from config
  const config = await getTelemetryConfig();
  if (config.anonymousId) {
    anonymousId = config.anonymousId;
    return anonymousId;
  }

  // Generate new UUID and persist
  anonymousId = randomUUID();
  await updateTelemetryConfig({ anonymousId });
  return anonymousId;
}

/**
 * Placeholder shown in debug mode for an id that does not exist yet. Shaped
 * like a UUID so the printed payload is the real thing structurally.
 */
const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';

let cachedState: SessionState | null = null;

/**
 * Load the persisted state, or synthesize a read-only one in debug mode.
 *
 * Debug mode must not generate or persist an anonymous id: inspecting what
 * telemetry would send cannot be the act that creates the identifier being
 * inspected.
 */
async function loadState(): Promise<SessionState | null> {
  if (cachedState) {
    return cachedState;
  }

  if (isDebugMode()) {
    const existing = await getTelemetryConfig();
    cachedState = {
      anonymousId: existing.anonymousId ?? PLACEHOLDER_ID,
      workSessionId: existing.workSessionId ?? PLACEHOLDER_ID,
      firstRun: existing.anonymousId === undefined,
      firstSeenAt: existing.firstSeenAt,
      previousOutcome: (existing.previousOutcome as Outcome | undefined) ?? 'none',
      previousCommand: existing.previousCommand,
      milestones: existing.milestones ?? [],
      reportedTools: existing.reportedTools ?? [],
    };
    return cachedState;
  }

  if (!isTelemetryEnabled()) {
    return null;
  }

  cachedState = await loadSessionState();
  return cachedState;
}

/** Test seam: forget the cached state. */
export function resetState(): void {
  cachedState = null;
}

/** Whether this invocation is the user's first ever. */
export function isFirstRun(): boolean {
  return cachedState?.firstRun ?? false;
}

/**
 * Send one capture event to PostHog's batch endpoint. Fire-and-forget:
 * bounded by the request timeout, never throws, never retries.
 */
function sendEvent(distinctId: string, event: EventName, properties: Record<string, unknown>): void {
  // The allowlist is the authority here, not at the call sites: a builder the
  // tests never construct still cannot ship a key or value off the list.
  const clean = sanitizeProperties(properties);

  if (!isEventName(event)) {
    return;
  }

  if (eventsSent >= MAX_EVENTS_PER_INVOCATION) {
    return;
  }
  eventsSent += 1;

  if (isDebugMode()) {
    // stderr, never stdout: stdout carries command output and must stay
    // parser-safe even while someone is inspecting telemetry.
    console.error(
      `[openspec telemetry] ${JSON.stringify({ event, distinct_id: distinctId, properties: clean })}`
    );
    return;
  }

  const body = JSON.stringify({
    api_key: POSTHOG_API_KEY,
    batch: [
      {
        type: 'capture',
        event,
        distinct_id: distinctId,
        properties: clean,
        // UTC with no local offset: an offset combined with the rest of the
        // context would locate the user.
        timestamp: new Date().toISOString(),
      },
    ],
  });

  const request = safeTelemetryFetch(`${POSTHOG_HOST}/batch/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    signal: AbortSignal.timeout(TELEMETRY_REQUEST_TIMEOUT_MS),
  }).then(() => undefined);

  pendingEvents.add(request);
  void request.finally(() => pendingEvents.delete(request));
}

/**
 * Track a command execution.
 *
 * @param commandName - The command name (e.g., 'init', 'change:apply')
 * @param version - The OpenSpec version
 */
export async function trackCommand(commandName: string, version: string): Promise<void> {
  if (!isTelemetryEnabled() && !isDebugMode()) {
    return;
  }

  try {
    const state = await loadState();
    if (!state) {
      return;
    }

    sendEvent(state.anonymousId, 'command_executed', {
      command: commandName,
      version,
      surface: 'cli',
      run_id: getRunId(),
      work_session_id: state.workSessionId,
      $ip: null, // Explicitly disable IP tracking
    });
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/**
 * Record how a command ended.
 *
 * Sent from the postAction hook, from the interception of commander's own
 * usage errors, and from the unhandled-rejection handler — the three families
 * of exit that would otherwise leave a failure invisible.
 */
export async function trackCompletion(input: {
  command: string;
  version: string;
  outcome: Outcome;
  errorClass: ErrorClass;
  exitCode: number | undefined;
  durationMs: number;
  context?: Record<string, unknown>;
}): Promise<void> {
  if (!isTelemetryEnabled() && !isDebugMode()) {
    return;
  }

  try {
    const state = await loadState();
    if (!state) {
      return;
    }

    sendEvent(state.anonymousId, 'command_completed', {
      command: input.command,
      version: input.version,
      surface: 'cli',
      run_id: getRunId(),
      work_session_id: state.workSessionId,
      outcome: input.outcome,
      error_class: input.errorClass,
      exit_code: bucketExitCode(input.exitCode),
      duration: bucketDuration(input.durationMs),
      previous_outcome: state.previousOutcome,
      previous_command_same: state.previousCommand === input.command,
      ...(input.context ?? {}),
      $ip: null,
    });

    if (isTelemetryEnabled()) {
      await recordOutcome(input.command, input.outcome);
    }
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/** Send a milestone the first time it is reached. */
export async function trackMilestone(milestone: Milestone, version: string): Promise<void> {
  if (!isTelemetryEnabled() && !isDebugMode()) {
    return;
  }

  try {
    const state = await loadState();
    if (!state) {
      return;
    }
    const claim = await claimMilestone(milestone, state, new Date(), !isDebugMode());
    if (!claim) {
      return;
    }

    sendEvent(state.anonymousId, 'milestone_reached', {
      milestone,
      version,
      run_id: getRunId(),
      time_to_reach: claim.timeToReach,
      $ip: null,
    });
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/**
 * Report configured tools, once each.
 *
 * Deliberately carries no run context: the whole configured *set* alongside
 * platform, install kind, and counts in one row is what would single out an
 * unusual user. One context-free event per tool answers how much of the
 * userbase runs each assistant without ever assembling that combination.
 */
export async function trackConfiguredTools(toolIds: string[], version: string): Promise<void> {
  if (!isTelemetryEnabled() && !isDebugMode()) {
    return;
  }

  try {
    const state = await loadState();
    if (!state) {
      return;
    }
    // Filter before claiming: an unlisted id would otherwise be marked
    // reported and produce an event whose only real property was stripped.
    const known = toolIds.filter((id) => isRegistryTool(id));
    for (const tool of await claimUnreportedTools(known, state, !isDebugMode())) {
      sendEvent(state.anonymousId, 'tool_configured', {
        tool,
        version,
        run_id: getRunId(),
        $ip: null,
      });
    }
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/**
 * Show first-run telemetry notice if not already seen.
 */
export async function maybeShowTelemetryNotice(
  options: { silent?: boolean } = {}
): Promise<void> {
  if (!isTelemetryEnabled()) {
    return;
  }

  try {
    const config = await getTelemetryConfig();
    if (config.noticeSeen) {
      return;
    }

    // In --json mode the notice would pollute stdout and break parsers, so
    // defer it: skip the notice AND leave noticeSeen unset so the disclosure
    // still appears on the user's first later non-JSON run.
    if (options.silent) {
      return;
    }

    // Display notice on stderr, not stdout: stdout is reserved for command
    // output (raw passthrough text, JSON, etc.) and must stay parser/pipe-safe.
    console.error(
      'Note: OpenSpec collects anonymous usage stats. Opt out: OPENSPEC_TELEMETRY=0 or openspec config set telemetry.enabled false'
    );

    // Mark as seen
    await updateTelemetryConfig({ noticeSeen: true });
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/**
 * Flush pending telemetry events.
 * Call this before CLI exit.
 */
export async function shutdown(): Promise<void> {
  if (pendingEvents.size === 0) {
    return;
  }

  try {
    await Promise.allSettled([...pendingEvents]);
  } catch {
    // Silent failure - telemetry should never break CLI exit
  } finally {
    pendingEvents.clear();
  }
}
