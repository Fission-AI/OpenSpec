# Connect Repo-Local Changes To Initiatives Tasks

## Decisions

- [x] Decide where the initiative link lives.
- [x] Decide command shape for creating initiative-linked changes.
- [x] Decide initiative lookup behavior for `--initiative`.
- [x] Decide whether workspace-scoped changes are allowed in this slice.
- [x] Decide whether repo ownership matching is attempted in v1.
- [x] Decide JSON and human output shape.
- [x] Decide whether Item 8 includes linking existing changes.
- [x] Decide whether status/instructions surface initiative links.
- [x] Confirm latest suggested resolutions in `plan.md` before implementation.

## Implementation

- [x] Extend change metadata schema with an optional initiative link.
- [x] Persist initiative metadata when creating repo-local changes.
- [x] Add command support for creating initiative-linked changes.
- [x] Add tests for metadata validation and persistence.
- [x] Add tests for command output and lookup failures.
- [x] Add status/instruction visibility for stored initiative links.
