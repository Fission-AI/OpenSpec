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

// PostHog API key - public key for client-side analytics
// This is safe to embed as it only allows sending events, not reading data
const POSTHOG_API_KEY = 'phc_Hthu8YvaIJ9QaFKyTG4TbVwkbd5ktcAFzVTKeMmoW2g';
// Using reverse proxy to avoid ad blockers and keep traffic on our domain
const POSTHOG_HOST = 'https://edge.openspec.dev';
const TELEMETRY_REQUEST_TIMEOUT_MS = 1000;

let anonymousId: string | null = null;

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
 * Send one capture event to PostHog's batch endpoint. Fire-and-forget:
 * bounded by the request timeout, never throws, never retries.
 */
function sendEvent(distinctId: string, event: string, properties: Record<string, unknown>): void {
  const body = JSON.stringify({
    api_key: POSTHOG_API_KEY,
    batch: [
      {
        type: 'capture',
        event,
        distinct_id: distinctId,
        properties,
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
  if (!isTelemetryEnabled()) {
    return;
  }

  try {
    const userId = await getOrCreateAnonymousId();

    sendEvent(userId, 'command_executed', {
      command: commandName,
      version: version,
      surface: 'cli',
      $ip: null, // Explicitly disable IP tracking
    });
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
