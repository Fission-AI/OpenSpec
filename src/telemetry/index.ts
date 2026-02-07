/**
 * Telemetry module for anonymous usage analytics.
 *
 * Privacy-first design:
 * - Only tracks command name and version
 * - No arguments, file paths, or content
 * - Opt-out via LIGHTSPEC_TELEMETRY=0 or DO_NOT_TRACK=1
 * - Auto-disabled in CI environments
 * - Anonymous ID is a random UUID with no relation to the user
 */
import { randomUUID } from 'crypto';
import { getTelemetryConfig, updateTelemetryConfig } from './config.js';
let anonymousId: string | null = null;

/**
 * Check if telemetry is enabled.
 *
 * Disabled when:
 * - LIGHTSPEC_TELEMETRY=0
 * - DO_NOT_TRACK=1
 * - CI=true (any CI environment)
 */
export function isTelemetryEnabled(): boolean {
  // Check explicit opt-out
  if (process.env.LIGHTSPEC_TELEMETRY === '0') {
    return false;
  }

  // Respect DO_NOT_TRACK standard
  if (process.env.DO_NOT_TRACK === '1') {
    return false;
  }

  // Auto-disable in CI environments
  if (process.env.CI === 'true') {
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
 * Track a command execution.
 *
 * @param commandName - The command name (e.g., 'init', 'change:apply')
 * @param version - The LightSpec version
 */
export async function trackCommand(_commandName: string, _version: string): Promise<void> {
  if (!isTelemetryEnabled()) {
    return;
  }

  try {
    // Keep anonymous ID creation for consistency with existing telemetry state.
    await getOrCreateAnonymousId();
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/**
 * Show first-run telemetry notice if not already seen.
 */
export async function maybeShowTelemetryNotice(): Promise<void> {
  if (!isTelemetryEnabled()) {
    return;
  }

  try {
    const config = await getTelemetryConfig();
    if (config.noticeSeen) {
      return;
    }

    // Display notice
    console.log(
      'Note: LightSpec collects anonymous usage stats. Opt out: LIGHTSPEC_TELEMETRY=0'
    );

    // Mark as seen
    await updateTelemetryConfig({ noticeSeen: true });
  } catch {
    // Silent failure - telemetry should never break CLI
  }
}

/**
 * Shutdown telemetry resources before CLI exit.
 * Call this before CLI exit.
 */
export async function shutdown(): Promise<void> {
  return Promise.resolve();
}
