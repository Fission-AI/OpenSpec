/**
 * The telemetry property contract.
 *
 * Every event name, property key, and property value is a member of a literal
 * list declared in this file. Nothing here is computed from a schema, a
 * catalog, or any other file a user can author — that is what makes the
 * guarantee checkable by reading one module.
 *
 * The lists are enforced at send time by `sanitizeEvent`, not only asserted in
 * a test: a test passes vacuously for any code path it does not construct, so
 * a convention would decay the first time someone adds an event builder the
 * tests do not cover.
 *
 * Binding values alone would not be enough. `{ "schema:acme-internal": true }`
 * carries a boolean value and still ships the user's schema name, so keys are
 * bound on the same terms as values.
 */

/** Every event this CLI may send. */
export const EVENT_NAMES = [
  'command_executed',
  'command_completed',
  'milestone_reached',
  'tool_configured',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** How a command ended. */
export const OUTCOMES = ['success', 'user_error', 'internal_error', 'cancelled'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/**
 * The failure families this CLI actually has. Declared as a literal union so a
 * future contributor cannot generate classes from a user-authored schema and
 * still be compliant.
 */
export const ERROR_CLASSES = [
  'none',
  'cancelled',
  'not_interactive',
  'no_root',
  'item_not_found',
  'ambiguous_item',
  'schema_not_found',
  'schema_invalid',
  'bad_usage',
  'unknown_subcommand',
  'validation_failed',
  'archive_blocked',
  'concurrent_modification',
  'store_error',
  'git_error',
  'fs_error',
  'parse_error',
  'metadata_invalid',
  'external_tool_failed',
  'network_error',
  'already_exists',
  'internal_error',
  'other',
] as const;
export type ErrorClass = (typeof ERROR_CLASSES)[number];

export const PLATFORMS = ['darwin', 'linux', 'win32', 'other'] as const;
export const INSTALL_KINDS = ['global', 'npx', 'source', 'other'] as const;
export const SCHEMA_SOURCES = ['package', 'project', 'user'] as const;
export const EXIT_CODES = ['0', '1', '130', 'other'] as const;
export const COUNT_BUCKETS = ['0', '1-3', '4-10', '11-30', '31+'] as const;
export const TOOL_COUNT_BUCKETS = ['0', '1', '2-3', '4+'] as const;
export const DURATION_BUCKETS = ['<100', '100-500', '500-2000', '2000-10000', '10000+'] as const;
export const TIME_TO_REACH_BUCKETS = ['<1h', '1-24h', '1-7d', '8-30d', '31d+'] as const;
export const MILESTONES = ['install', 'init', 'propose', 'apply', 'archive'] as const;
export type Milestone = (typeof MILESTONES)[number];

/**
 * Node majors we report by name. Anything else is `other` — a nightly or an
 * odd-numbered major is a small enough population to be identifying, and the
 * support-window decision only needs the supported majors distinguished.
 */
export const NODE_MAJORS = ['20', '22', '24', '26', 'other'] as const;

/**
 * Which agent is driving this run. Derived by testing for the presence of a
 * marker (see `invoker.ts`); no environment variable name or value is ever
 * sent, and an unrecognized marker collapses to `unknown`.
 */
export const INVOKERS = [
  'claude_code',
  'cursor',
  'github_copilot',
  'codex',
  'gemini',
  'opencode',
  'zed',
  'devin',
  'terminal',
  'unknown',
] as const;
export type Invoker = (typeof INVOKERS)[number];

/** Values a property may hold, keyed by property. `true` means any boolean. */
const PROPERTY_VALUES = {
  // Identity and correlation
  command: 'command-list',
  version: 'free-version',
  surface: ['cli'],
  run_id: 'uuid',
  work_session_id: 'uuid',
  $ip: 'null-only',

  // Outcome
  outcome: OUTCOMES,
  error_class: ERROR_CLASSES,
  exit_code: EXIT_CODES,
  duration: DURATION_BUCKETS,
  previous_outcome: [...OUTCOMES, 'none'],
  previous_command_same: 'boolean',

  // Run context
  platform: PLATFORMS,
  node_major: NODE_MAJORS,
  install_kind: INSTALL_KINDS,
  invoker: INVOKERS,
  stdout_tty: 'boolean',
  json_mode: 'boolean',
  prompted: 'boolean',
  first_run: 'boolean',
  profile: ['core', 'custom'],
  delivery: ['both', 'skills', 'commands'],
  tools_count: TOOL_COUNT_BUCKETS,
  schema_source: SCHEMA_SOURCES,
  store_in_use: 'boolean',
  changes: COUNT_BUCKETS,

  // Milestones and adoption
  milestone: MILESTONES,
  time_to_reach: TIME_TO_REACH_BUCKETS,
  tool: 'tool-registry',
} as const satisfies Record<string, readonly string[] | string>;

export type PropertyKey = keyof typeof PROPERTY_VALUES;

/** Every property key that may leave this process. */
export const PROPERTY_KEYS = Object.keys(PROPERTY_VALUES) as PropertyKey[];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Semver as this package emits it; never user input, but bounded anyway. */
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * Membership checks for the property kinds whose value set is a registry
 * elsewhere in the codebase. Injected rather than imported so this module
 * stays free of the CLI's import graph — `src/cli/index.ts` already documents
 * that a telemetry helper reaching into command registration creates a cycle.
 */
export interface RegistryChecks {
  isCommand(value: string): boolean;
  isTool(value: string): boolean;
}

let registry: RegistryChecks = {
  isCommand: () => false,
  isTool: () => false,
};

export function setRegistryChecks(checks: RegistryChecks): void {
  registry = checks;
}

function isAllowedValue(key: PropertyKey, value: unknown): boolean {
  const rule = PROPERTY_VALUES[key] as readonly string[] | string;

  if (Array.isArray(rule)) {
    return typeof value === 'string' && rule.includes(value);
  }

  switch (rule) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'uuid':
      return typeof value === 'string' && UUID_PATTERN.test(value);
    case 'free-version':
      return typeof value === 'string' && VERSION_PATTERN.test(value);
    case 'null-only':
      return value === null;
    case 'command-list':
      return typeof value === 'string' && (value === 'unknown' || registry.isCommand(value));
    case 'tool-registry':
      return typeof value === 'string' && registry.isTool(value);
    default:
      return false;
  }
}

export function isEventName(value: string): value is EventName {
  return (EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Drop anything not on the allowlist, immediately before serialization.
 *
 * A dropped property never prevents the event from being sent: a malformed
 * value is a reason to lose one field, not to lose the outcome signal the
 * event exists to carry.
 */
export function sanitizeProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) {
      continue;
    }
    if (!(PROPERTY_KEYS as string[]).includes(key)) {
      continue;
    }
    if (!isAllowedValue(key as PropertyKey, value)) {
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

/** Bucket a count into the fixed labels. */
export function bucketCount(count: number): (typeof COUNT_BUCKETS)[number] {
  if (count <= 0) return '0';
  if (count <= 3) return '1-3';
  if (count <= 10) return '4-10';
  if (count <= 30) return '11-30';
  return '31+';
}

export function bucketToolCount(count: number): (typeof TOOL_COUNT_BUCKETS)[number] {
  if (count <= 0) return '0';
  if (count === 1) return '1';
  if (count <= 3) return '2-3';
  return '4+';
}

export function bucketDuration(ms: number): (typeof DURATION_BUCKETS)[number] {
  if (ms < 100) return '<100';
  if (ms < 500) return '100-500';
  if (ms < 2000) return '500-2000';
  if (ms < 10000) return '2000-10000';
  return '10000+';
}

export function bucketExitCode(code: number | undefined): (typeof EXIT_CODES)[number] {
  // Not a raw code: `workset open` returns the launched editor's status
  // (including 128 + signal), `feedback` returns gh's, and `update` returns the
  // re-spawned CLI's, so the raw value is unbounded.
  if (code === undefined || code === 0) return '0';
  if (code === 1) return '1';
  if (code === 130) return '130';
  return 'other';
}

export function bucketTimeToReach(msSinceFirstSeen: number): (typeof TIME_TO_REACH_BUCKETS)[number] {
  const hours = msSinceFirstSeen / 3_600_000;
  if (hours < 1) return '<1h';
  if (hours < 24) return '1-24h';
  const days = hours / 24;
  if (days < 8) return '1-7d';
  if (days <= 30) return '8-30d';
  return '31d+';
}

export function bucketNodeMajor(version: string): (typeof NODE_MAJORS)[number] {
  const major = version.replace(/^v/, '').split('.')[0];
  return (NODE_MAJORS as readonly string[]).includes(major)
    ? (major as (typeof NODE_MAJORS)[number])
    : 'other';
}

export function bucketPlatform(platform: string): (typeof PLATFORMS)[number] {
  return (PLATFORMS as readonly string[]).includes(platform)
    ? (platform as (typeof PLATFORMS)[number])
    : 'other';
}
