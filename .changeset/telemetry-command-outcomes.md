---
"@fission-ai/openspec": minor
---

Record how commands end in usage telemetry, so failures surface without someone filing an issue.

A new `command_completed` event carries the outcome, a failure class from a fixed list, a bucketed exit code, and a bucketed duration. Runs that previously produced no telemetry at all now do: unknown commands, unknown flags, and a group invoked with no subcommand all exited before the tracking hook ran. Activation milestones, retry visibility, and a per-run correlation id are included.

`OPENSPEC_TELEMETRY_DEBUG=1` prints every event to stderr and sends nothing, so the collected list can be verified locally rather than taken on trust. `openspec config get telemetry` now reports the enabled state, the anonymous id, and the file holding it.

Command behavior, output, and exit codes are unchanged. Telemetry remains opt-out via `openspec config set telemetry.enabled false`, `OPENSPEC_TELEMETRY=0`, or `DO_NOT_TRACK=1`, and stays off in CI.

**Privacy:** this collects more than earlier releases did. `SECURITY.md` previously stated that no environment was collected, and the README stated that only command names and version were collected. Both commitments end here: platform, Node major, install kind, and the invoking coding agent are now included. They are replaced by a narrower and checkable commitment — every event name, property key, and value must be a member of a fixed list, enforced by dropping anything else before the payload is built, so no field exists that could carry a name, path, or message. Tool identities are sent as standalone events with no other property attached, and durations and exit codes are bucketed, so no single event describes a machine precisely enough to single out its owner. The full property list is in the README, and a test fails if it drifts from the code. Data is described as pseudonymous rather than anonymous, and a deletion route is published — though deleting the local id severs your history without asking anyone.

Every event sets `$ip: null` and `$geoip_disable: true`, so no address or derived location is recorded. The disclosure states that and the in-transit caveat, rather than asserting anything about proxy logging that this repository cannot enforce. No retention period is published until one is configured.
