## Context

The CLI currently creates two user-visible date-only values by truncating `Date#toISOString()`: archive directory prefixes and the `created` field in newly scaffolded `.openspec.yaml` files. ISO serialization is UTC, so either value can disagree with the calendar date in the effective local time zone of the Node.js process running the CLI.

The repository supports Node.js 20.19+ on Windows, macOS, and Linux. The selected contract is the calendar date in the executing Node.js process's effective local time zone, rather than a project-wide or UTC time zone. "Effective local time zone" means the time zone used by Node.js local `Date` accessors, normally derived from the host environment and any runtime-supported process time-zone configuration.

## Goals / Non-Goals

**Goals:**

- Produce date-only archive prefixes and new-change metadata from the executing CLI process's effective local calendar date.
- Keep the date representation stable as zero-padded `YYYY-MM-DD` on every supported platform.
- Cover a UTC/local-calendar boundary with deterministic tests.

**Non-Goals:**

- Rename or migrate existing archive directories or existing change metadata.
- Add a project time-zone setting, CLI flag, or user-selectable time zone.
- Change full UTC timestamps used for logs, JSON timestamps, feedback metadata, or backup identifiers.
- Alter agent-generated date prefixes in OPSX archive workflows, which do not derive their dates through `Date#toISOString()`.

## Decisions

### Use a shared local calendar-date formatter

Introduce one small shared formatter for date-only values. It will derive year, month, and day with local `Date` accessors and zero-pad the numeric parts into `YYYY-MM-DD`. It will accept a `Date` value (defaulting to the current time) so callers share the same behavior and tests can provide a fixed instant.

Both archive naming and change creation will call this formatter. This prevents the two date-only concepts from diverging again while keeping the existing archive and metadata APIs unchanged.

`toISOString().split('T')[0]` is not suitable because it deliberately selects the UTC calendar date. Locale-formatted strings are also unsuitable as a storage and path contract because their separators and ordering are locale-dependent.

### Bind the rule to the executing CLI process's effective local time zone

The formatter will use the local time zone effective for the Node.js process. This matches the user-visible meaning of "today" for an interactive CLI session and gives scripts deterministic behavior when the process time zone is configured. Processes in different time zones may produce different dates for the same instant near a boundary; that is intentional under the selected contract.

### Test the boundary through the process time zone

Tests will temporarily set the Node process time zone to `Asia/Shanghai` and use a fixed instant such as `2026-07-14T16:30:00.000Z`. At that instant the local date is `2026-07-15` while the UTC date is `2026-07-14`, so the test fails if UTC truncation returns. The test setup will restore time and environment state after each case.

## Risks / Trade-offs

- [Different processes can choose different dates at the same instant] → This is the explicit effective-local-time-zone contract and is covered by the affected behavior.
- [Date formatting is accidentally made locale-sensitive] → Use numeric local `Date` parts rather than locale display formatting.
- [Existing historical names retain UTC-derived dates] → Apply the new rule prospectively and leave existing directories and metadata untouched.

## Migration Plan

No data migration is required. New archives and newly created changes use the local-date rule after release; existing archives and metadata remain valid as-is.

## Open Questions

None.
