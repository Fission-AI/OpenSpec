## Why

Nothing records that one in-flight change only makes sense once another lands. Today the only way to discover that `add-oauth-scopes` needs `add-oauth-provider` to exist first is to read both proposals by hand, and `openspec list` treats every change as independent. Filed as [#1915](https://github.com/Fission-AI/OpenSpec/issues/1915). This is the ordering counterpart to the priority/author triage metadata proposed for [#1899](https://github.com/Fission-AI/OpenSpec/issues/1899): that surfaces *what matters*, this surfaces *what order*.

## What Changes

- Add an optional `depends_on: string[]` field to per-change metadata (`.openspec.yaml`), validated by `ChangeMetadataSchema` as an array of kebab-case change names (structural check only — no filesystem access at parse time).
- `openspec new change` accepts an optional `--depends-on <name>[,<name>...]` flag that writes the field at creation time, validated against the currently active changes so a typo or unknown name fails fast instead of scaffolding a dangling reference.
- `openspec validate` gains cross-change checks, run once per bulk validation pass over all active changes (it already iterates them). Two are always on (correctness, not suggestion):
  - a `depends_on` entry naming a change that is neither active nor archived is an error (typo, or the name never existed);
  - a change naming itself in its own `depends_on` is an error;
  - a `depends_on` cycle among active changes is an error, reported on every change in the cycle.
  A `depends_on` entry naming an *archived* change is not an error: once a dependency archives it's baked into the specs, the dependency is satisfied, and pruning the stale entry is left to the author rather than enforced.
- `openspec validate` also gains an **opt-in** `--check-dependencies` flag (off by default, same pattern as `--strict`): for each validated change, it compares capability paths (`specs/<capability-path>/spec.md` directories — already required structure, not new) against every other active change, and reports an informational (never blocking, never fails `--strict`) finding for any pair that shares a capability path with no `depends_on` declared between them either way. This is the general-vs-check-dependencies split made explicit at the CLI layer: plain `openspec validate` never runs it; `--check-dependencies` always does, deterministically, for anyone (human, CI, or an agent) who asks for it.
- `openspec list` surfaces the relationship:
  - the table gains a "Blocked by" column listing only the `depends_on` entries that still name an active (non-archived) change — an archived dependency drops out of the display since it's already satisfied;
  - `--json` includes the raw `depends_on` array on each change entry exactly as written in `.openspec.yaml`, unfiltered, so tooling can run its own topological sort instead of re-deriving order from directory timestamps or numeric-prefix naming (the workarounds tracked in #1145/#1169) or from the same archived-filtering logic the table view applies.
- `/opsx:explore` gains a "Check for dependencies" step, right after its existing "Check for context" step. It doesn't decide on its own whether to run: it asks the user once, up front ("want me to check for dependencies on other active changes as we go?"). A yes runs `openspec validate --check-dependencies` at the natural checkpoints and judges only the returned candidates for a genuine ordering relationship before offering to record `depends_on`; a no skips it for the session, re-askable at any time. See `design.md` for the full mechanism and the literal instruction text to add. This follows explore's existing "propose, don't auto-capture" guardrail: the user confirms before anything is written, on top of having already opted into the check itself.

## Out of Scope

- The judgment step (is a capability-overlap finding *actually* a dependency, and in which direction) stays with the agent, not a lint rule — `--check-dependencies` surfaces candidates deterministically, but deciding what they mean isn't scenario-testable, so that half is documented as design guidance in `design.md`, not a spec delta.
- Parallel-change *overlap* detection (two changes editing the same requirement) is #1387/#1698's concern, not this one; `depends_on` only records ordering the author (or explore, with confirmation) asserts.
- No automatic reordering, blocking, or enforcement beyond `openspec validate` reporting — a change with an unmet `depends_on` is still buildable; nothing here stops work on it.

## Capabilities

### Modified Capabilities
- `change-creation`: metadata schema gains an optional `depends_on` (kebab-case string array) field; `createChange` accepts and validates an optional `--depends-on` list against active changes.
- `cli-list`: change list output (table and `--json`) gains `depends_on`/"Blocked by" surfacing.
- `cli-validate`: bulk change validation gains always-on dependency-existence/self-dependency/cycle checks, plus an opt-in `--check-dependencies` capability-overlap suggestion check.

## Impact

- `src/core/change-metadata/schema.ts` — new optional `depends_on: string[]` field on `ChangeMetadataSchema`, reusing `KebabIdentifierSchema` per entry.
- `src/commands/workflow/new-change.ts` / `src/utils/change-utils.ts` — new `--depends-on` option, validated against `getAvailableChanges` at creation time.
- `src/core/list.ts` — read `depends_on` per change, compute the "Blocked by" subset against the active change set, render the new column, extend the JSON shape with the raw array.
- `src/commands/validate.ts` — after the existing per-change queue in `runBulkValidation` collects every active change's metadata:
  - run one always-on graph pass (existence, self-reference, cycle detection) over the collected `depends_on` edges and attach findings to the owning change's report;
  - add the opt-in `--check-dependencies` flag, using `discoverSpecFiles()` (`src/utils/spec-discovery.ts`, already used for `openspec/specs/`) against each change's own `specs/` directory to compute capability-path overlap, emitting informational findings only.
- `src/core/templates/workflows/explore.ts` — add the "Check for dependencies" subsection (both template functions inline this prose independently; see `design.md`) with its explicit up-front yes/no, and a row to the "When a change exists" capture table.
- No breaking changes: the `depends_on` field is optional, `--check-dependencies` is opt-in, and existing `.openspec.yaml` files and `list`/`validate` output for changes that don't set anything new are unaffected.
