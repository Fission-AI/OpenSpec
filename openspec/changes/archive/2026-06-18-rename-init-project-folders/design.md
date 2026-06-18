## Context

`clearspec init` scaffolds project input/output folders via `InitCommand.createDirectoryStructure()` in `src/core/init.ts`. The folder names are tracked in a single constant, `CLEARSPEC_PROJECT_FOLDERS` in `src/core/config.ts`, which both the fresh-mode and extend-mode directory arrays map over with `path.join(clearspecPath, folder)`. The current values are `project-requirements`, `code-repositories`, `additional-context`, and `project-specifications`.

This change renames those four folders to `requirements`, `context`, `code`, and `spec-packs`. Because the folder set is already centralised in one constant (per the "if we generate it, we track it by name in a constant" rule), the rename is almost entirely a constant edit.

## Goals / Non-Goals

**Goals:**
- Scaffold the four renamed folders in fresh mode, extend mode, and `--tools none`.
- Keep the folder set defined in the single `CLEARSPEC_PROJECT_FOLDERS` constant.
- Keep cross-platform path construction via `path.join()`.
- Update tests so coverage tracks the new folder names.

**Non-Goals:**
- Migrating or renaming folders in projects that were already initialized with the old names (init is idempotent and additive; it will not remove the old folders).
- Seeding the folders with placeholder/README content.
- Changing config generation, skill/command generation, or success-output copy.

## Decisions

**Edit the existing `CLEARSPEC_PROJECT_FOLDERS` constant in place.** Update the four values to `requirements`, `context`, `code`, `spec-packs`. Both directory arrays in `createDirectoryStructure()` already derive from this constant, so no change to `init.ts` logic is required.
- *Alternative considered:* Add the new names while keeping the old ones for backward compatibility. Rejected — the user explicitly wants *only* the four new folders, and keeping eight folders would clutter every new project.

**Remove the one hardcoded folder-name reference in tests.** `test/core/init.test.ts` has a `path.join(clearspecPath, 'project-requirements')` literal that must move to the new name (or be derived from the constant) so the suite reflects the new contract. All other test assertions already iterate over `CLEARSPEC_PROJECT_FOLDERS` and update automatically.

**No data migration.** Init remains additive and idempotent via `FileSystemUtils.createDirectory()`. Existing projects keep any old folders; this change only affects what new/extended init runs create.

## Risks / Trade-offs

- [Projects initialized before this change keep the old folder names, leaving a mix of old and new] → Acceptable; out of scope. The rename only governs what init scaffolds going forward. A migration helper can be a follow-up if needed.
- [A stray hardcoded folder-name string in tests or docs is missed] → Mitigated by grepping for all four old names across `src`, `test`, and `openspec/specs` before completing, and by the spec delta updating `cli-init`.
