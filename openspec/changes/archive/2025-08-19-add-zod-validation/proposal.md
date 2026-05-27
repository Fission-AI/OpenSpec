# Change: Add Zod Runtime Validation

## Why

While the spec and change commands can output JSON, they currently don't perform strict runtime validation beyond basic structure checking. This can lead to invalid specs or changes being processed, silent failures when required fields are missing, and poor error messages.

## What Changes

- Enhance existing `spec validate` and `change validate` commands with strict Zod validation
- Add validation to the archive command to ensure changes are valid before applying
- Add validation to the diff command to ensure changes are well-formed
- Provide detailed validation reports in JSON format
- Add `--strict` mode that fails on warnings

## Impact

- **Affected specs**: cli-spec, cli-change, cli-archive, cli-diff
- **Affected code**:
  - src/commands/spec.ts (enhance validate subcommand)
  - src/commands/change.ts (enhance validate subcommand)
  - src/core/archive.ts (add pre-archive validation)
  - src/core/diff.ts (add validation check)