# Add Diff Command to Pastelsdd CLI

## Why

Developers need to easily view differences between proposed spec changes and current specs without manually comparing files.

## What Changes

- Add `pastelsdd diff [change-name]` command that shows differences between change specs and current specs
- Compare files in `changes/[change-name]/specs/` with corresponding files in `specs/`
- Display unified diff output showing added/removed/modified lines
- Support colored output for better readability

## Impact

- Affected specs: New capability `cli-diff` will be added
- Affected code:
  - `src/cli/index.ts` - Add diff command
  - `src/core/diff.ts` - New file with diff logic (~80 lines)