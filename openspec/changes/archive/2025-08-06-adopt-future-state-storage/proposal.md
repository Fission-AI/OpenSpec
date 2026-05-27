# Adopt Future State Storage for Pastelsdd Changes

## Why

The current approach of storing spec changes as diff files (`.spec.md.diff`) creates friction for both humans and AI. Diff syntax with `+` and `-` prefixes makes specs hard to read, AI tools struggle with the format when understanding future state, and GitHub can't show nice comparisons between current and proposed specs in different folders.

## What Changes

- Change from storing diffs (`patches/[capability]/spec.md.diff`) to storing complete future state (`specs/[capability]/spec.md`)
- Update all documentation to reflect new storage format
- Migrate existing `add-init-command` change to new format
- Add new `pastelsdd-conventions` capability to document these conventions



## Impact

- Affected specs: New `pastelsdd-conventions` capability
- Affected code: 
  - pastelsdd/README.md (lines 85-108)
  - docs/PRD.md (lines 376-382, 778-783)
  - docs/pastelsdd-walkthrough.md (lines 58-62, 112-126)
  - pastelsdd/changes/add-init-command/ (migration needed)

