## Why

When proposing a change, delta spec files under `openspec/changes/<name>/specs/` duplicate large portions of existing specs in `openspec/specs/`. A MODIFIED requirement must include the entire requirement block (all scenarios), making it hard to see what actually changed versus what was copied verbatim. This friction slows review and increases the risk of errors.

## What Changes

Add a `--diff` flag to `openspec show` (change type) that renders each delta spec as a unified diff against the corresponding main spec in `openspec/specs/`. This is the smallest viable improvement: it doesn't change the storage format or workflow, just adds a new way to view the deltas.

### Approaches considered

Three approaches were evaluated:

1. **Stop storing delta specs; edit main specs on the branch directly.** This would eliminate duplication entirely but conflicts with the spec-driven workflow where changes are proposed, reviewed, and archived as discrete artifacts before the main specs are updated. Deferred — would require rethinking the change lifecycle.

2. **Store deltas as diffs instead of full specs.** The `specs/<cap>/spec.md` files inside a change would contain unified diffs (or a structured delta format) rather than full requirement text. This eliminates duplication at the source but complicates authoring (AI and humans must produce correct diffs), parsing, validation, and the archive/apply step that merges deltas into main specs. Promising for a future change, but high complexity.

3. **Add `openspec show --diff` to render deltas against main specs.** (Chosen.) Leave the storage format unchanged. When displaying a change, compute the diff on the fly by comparing each delta spec file against its matching main spec. This gives reviewers the view they need with minimal code changes and zero workflow disruption.

### What this change delivers

- A `--diff` flag on `openspec show <change>` (and `openspec change show <change>`) that outputs a human-readable unified diff per delta spec

**JSON mode** (`--json --diff`): The existing JSON structure (`{ id, title, deltaCount, deltas }`) is preserved. Only deltas with `operation: "MODIFIED"` include a `"diff"` field containing unified-diff text. Deltas with `operation: "ADDED"`, `"REMOVED"`, or `"RENAMED"` do not include a `"diff"` field (it is absent from the object). When no matching requirement block is found for a MODIFIED delta — no match in the main spec, or no main spec for that capability at all — the delta includes a `"warning"` field (string) instead of `"diff"`, describing the mismatch. A header that matches only after folding case and interior whitespace carries both: the `"diff"` the author meant and a `"warning"` that archive matches names exactly.

**Text mode** (`--diff` without `--json`): The proposal markdown is printed first, followed by a "Specifications Changed (diffs)" section. MODIFIED deltas show colorized unified diffs (additions in green, removals in red); ADDED deltas show the full requirement text as all-additions in green; REMOVED deltas show the authored removal block, Reason and Migration included, in red; RENAMED deltas show old and new names. When a MODIFIED delta has no matching requirement block — or its capability has no main spec — the raw requirement text is printed with a warning instead of a diff. Without `--diff`, `openspec show <change>` prints the proposal and nothing else, exactly as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-show`: Add `--diff` flag support for change display, computing unified diffs of delta specs against their main specs

## Non-goals

- Changing the delta spec storage format (approach 2 above — future work)
- Changing when or how main specs are updated (approach 1 above — future work)
- Diffing non-spec artifacts (proposal, design, tasks)
- Git-aware diffing (this compares files on disk, not git history)

## Impact

- `src/commands/show.ts` — pass `--diff` flag through to change display
- `src/commands/change.ts` — implement diff rendering in `show()` for text and JSON modes
- `src/cli/index.ts` — register `--diff` option on the show and change show commands
- `src/utils/requirement-diff.ts` — new: pull one requirement block out of a spec and diff it against the delta block (`diff` package)
- `src/core/parsers/requirement-blocks.ts` — expose the raw REMOVED blocks so a removal's Reason/Migration text survives into the output
- `src/core/completions/command-registry.ts` — offer `--diff` in shell completions
