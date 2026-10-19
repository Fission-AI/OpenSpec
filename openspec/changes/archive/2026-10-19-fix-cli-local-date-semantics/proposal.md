## Why

Two CLI code paths currently derive date-only values by truncating a UTC ISO timestamp: archive directory prefixes and the `created` field in newly scaffolded change metadata. Near a local midnight boundary, these values can resolve to the previous or next calendar date instead of the date in the CLI process's effective local time zone.

## What Changes

- Define CLI-generated date-only values as the calendar date in the effective local time zone of the Node.js process executing the CLI, formatted as `YYYY-MM-DD`.
- Generate CLI archive directory names from that local date.
- Record the same local date in the `created` field of newly created change metadata.
- Add regression coverage for a non-UTC local-date boundary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-archive`: archive target names use the CLI process's effective local calendar date.
- `change-creation`: newly created change metadata records the CLI process's effective local calendar date.

## Impact

- Affected code: archive naming, change-creation metadata, and a shared date-only formatter.
- Affected tests: archive and change-creation coverage.
- Existing archive directories remain unchanged; the rule applies to newly generated names and metadata only.
