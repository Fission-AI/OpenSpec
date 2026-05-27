## Why
Need a command to archive completed changes to the archive folder with proper date prefixing, following Pastelsdd conventions. Currently changes must be manually moved and renamed.

## What Changes
- Add new `archive` command to CLI that moves changes to `changes/archive/YYYY-MM-DD-[change-name]/`
- Check for incomplete tasks before archiving and warn user
- Allow interactive selection of change to archive
- Prevent archiving if target directory already exists
- Update main specs from the change's future state specs (copy from `changes/[name]/specs/` to `pastelsdd/specs/`)
- Show confirmation prompt before updating specs, displaying which specs will be created/updated
- Support `--yes` flag to skip confirmations for automation

## Impact
- Affected specs: cli-archive (new)
- Affected code: src/cli/index.ts, src/core/archive.ts (new)