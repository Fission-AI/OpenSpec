/**
 * Telemetry opt-out signals, shared by telemetry and the version check so both
 * outbound surfaces honor exactly the same values.
 *
 * Parsing is tolerant in the style of isCiEnvironment(): a user who wrote
 * DO_NOT_TRACK=true meant it, and an exact-match test that silently kept
 * sending would be a privacy control that does not work. Ambiguity fails
 * safe — a value we cannot read as "on" suppresses the request rather than
 * enabling it.
 */

const ON_VALUES = new Set(['1', 'true', 'yes', 'on']);
const OFF_VALUES = new Set(['', '0', 'false', 'no', 'off']);

/** True when `DO_NOT_TRACK` is set to anything but an explicit off-value. */
export function isDoNotTrackSet(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.DO_NOT_TRACK;
  return value !== undefined && !OFF_VALUES.has(value.trim().toLowerCase());
}

/** True when `OPENSPEC_TELEMETRY` is set to anything but an explicit on-value. */
export function isTelemetryDisabledByEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.OPENSPEC_TELEMETRY;
  return value !== undefined && !ON_VALUES.has(value.trim().toLowerCase());
}

/** True when either opt-out signal asks us to stay off the network. */
export function isTelemetryOptedOutByEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTelemetryDisabledByEnv(env) || isDoNotTrackSet(env);
}
