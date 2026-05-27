## Why
The archive command currently forces users to either accept spec updates or cancel the entire archive operation. Users need flexibility to archive changes without updating specs, either through explicit flags or by declining the confirmation prompt. This is especially important for changes that don't modify specs (like tooling, documentation, or infrastructure updates).

## What Changes
- Add new `--skip-specs` flag to the archive command that bypasses all spec update operations
- Fix confirmation behavior: when users decline spec updates interactively, proceed with archiving instead of cancelling the entire operation
- When `--skip-specs` flag is used, skip both the spec discovery and update confirmation steps entirely
- Display clear message when specs are skipped (either via flag or user choice)
- Flag can be combined with existing `--yes` flag for fully automated archiving without spec updates

## Impact
- Affected specs: cli-archive
- Affected code: src/core/archive.ts, src/cli/index.ts