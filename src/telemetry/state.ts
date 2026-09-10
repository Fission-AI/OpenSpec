/**
 * Persisted telemetry state: identity, work session, milestones, and the
 * previous run's outcome.
 *
 * Two invariants hold across everything here:
 *
 * 1. Nothing is written when telemetry is disabled. An opted-out user leaves
 *    no trace, including the anonymous id itself.
 * 2. Only enum labels, counters, booleans, timestamps, and random ids are
 *    stored. A timestamp is never sent — only a bucket derived from it.
 */
import { randomUUID } from 'crypto';
import { getTelemetryConfig, updateTelemetryConfig } from './config.js';
import {
  bucketTimeToReach,
  type Milestone,
  type Outcome,
  type TIME_TO_REACH_BUCKETS,
} from './properties.js';

/** How long a gap may be before a new work session starts. */
const WORK_SESSION_WINDOW_MS = 30 * 60 * 1000;

/** Bumped whenever the disclosed property list expands. */
export const NOTICE_VERSION = 2;

let cachedRunId: string | null = null;

/**
 * The id for this invocation. Random, never persisted, and never derived from
 * the anonymous id, the pid, the working directory, or the clock.
 *
 * Its job is to reveal a `command_executed` with no matching
 * `command_completed` — the signature of an exit path the coverage missed.
 */
export function getRunId(): string {
  if (!cachedRunId) {
    cachedRunId = randomUUID();
  }
  return cachedRunId;
}

/** Test seam: forget the cached run id. */
export function resetRunId(): void {
  cachedRunId = null;
}

export interface SessionState {
  anonymousId: string;
  workSessionId: string;
  firstRun: boolean;
  firstSeenAt: string | undefined;
  previousOutcome: Outcome | 'none';
  previousCommand: string | undefined;
  milestones: string[];
  reportedTools: string[];
}

/**
 * Read the persisted state, minting identity and session ids as needed.
 *
 * Callers must confirm telemetry is enabled first: this writes.
 */
export async function loadSessionState(now: Date = new Date()): Promise<SessionState> {
  const config = await getTelemetryConfig();
  const updates: Record<string, unknown> = {};

  let anonymousId = config.anonymousId;
  let firstRun = false;
  if (!anonymousId) {
    anonymousId = randomUUID();
    updates.anonymousId = anonymousId;
    updates.firstSeenAt = now.toISOString();
    firstRun = true;
  }

  const lastActivity = config.lastActivityAt ? Date.parse(config.lastActivityAt) : NaN;
  const withinWindow =
    Number.isFinite(lastActivity) && now.getTime() - lastActivity < WORK_SESSION_WINDOW_MS;

  let workSessionId = config.workSessionId;
  if (!workSessionId || !withinWindow) {
    workSessionId = randomUUID();
    updates.workSessionId = workSessionId;
  }
  updates.lastActivityAt = now.toISOString();

  if (Object.keys(updates).length > 0) {
    await updateTelemetryConfig(updates);
  }

  return {
    anonymousId,
    workSessionId,
    firstRun,
    firstSeenAt: firstRun ? now.toISOString() : config.firstSeenAt,
    previousOutcome: (config.previousOutcome as Outcome | undefined) ?? 'none',
    previousCommand: config.previousCommand,
    milestones: config.milestones ?? [],
    reportedTools: config.reportedTools ?? [],
  };
}

/** Record this run's outcome so the next one can report whether it recovered. */
export async function recordOutcome(command: string, outcome: Outcome): Promise<void> {
  await updateTelemetryConfig({ previousOutcome: outcome, previousCommand: command });
}

/**
 * Claim a milestone, returning its time bucket when this is the first time.
 *
 * Returns null when the milestone is already recorded, so the caller sends
 * nothing.
 */
export async function claimMilestone(
  milestone: Milestone,
  state: SessionState,
  now: Date = new Date(),
  persist = true
): Promise<{ timeToReach: (typeof TIME_TO_REACH_BUCKETS)[number] | undefined } | null> {
  if (state.milestones.includes(milestone)) {
    return null;
  }

  const milestones = [...state.milestones, milestone];
  state.milestones = milestones;
  // Inspecting what would be sent must not spend the one-shot claim, or the
  // real event would never fire on a later run.
  if (persist) {
    await updateTelemetryConfig({ milestones });
  }

  // An id minted before this change has no recorded first-seen time. Omitting
  // the bucket is honest; sending the lowest one would fabricate a wave of
  // instant activations across the existing userbase.
  const firstSeen = state.firstSeenAt ? Date.parse(state.firstSeenAt) : NaN;
  if (!Number.isFinite(firstSeen)) {
    return { timeToReach: undefined };
  }
  return { timeToReach: bucketTimeToReach(Math.max(0, now.getTime() - firstSeen)) };
}

/** Registry tool ids not yet reported. Claims them so each is sent once. */
export async function claimUnreportedTools(
  toolIds: string[],
  state: SessionState,
  persist = true
): Promise<string[]> {
  const unreported = toolIds.filter((id) => !state.reportedTools.includes(id));
  if (unreported.length === 0) {
    return [];
  }
  const reportedTools = [...state.reportedTools, ...unreported];
  state.reportedTools = reportedTools;
  if (persist) {
    await updateTelemetryConfig({ reportedTools });
  }
  return unreported;
}
