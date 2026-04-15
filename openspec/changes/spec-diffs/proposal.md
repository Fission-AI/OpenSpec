## Why

When proposing a change, delta spec files under `openspec/changes/<name>/specs/` duplicate large portions of existing specs in `openspec/specs/`. A MODIFIED requirement must include the entire requirement block (all scenarios), making it hard to see what actually changed versus what was copied verbatim. This friction slows review and increases the risk of errors.

## What Changes

Add a `--diff` flag to `openspec show` (change type) that renders each delta spec as a unified diff against the corresponding base spec in `openspec/specs/`. This is the smallest viable improvement: it doesn't change the storage format or workflow, just adds a new way to view the deltas.

### Approaches considered

Three approaches were evaluated:

1. **Stop storing delta specs; edit base specs on the branch directly.** This would eliminate duplication entirely but conflicts with the spec-driven workflow where changes are proposed, reviewed, and archived as discrete artifacts before the base specs are updated. Deferred — would require rethinking the change lifecycle.

2. **Store deltas as diffs instead of full specs.** The `specs/<cap>/spec.md` files inside a change would contain unified diffs (or a structured delta format) rather than full requirement text. This eliminates duplication at the source but complicates authoring (AI and humans must produce correct diffs), parsing, validation, and the archive/apply step that merges deltas into base specs. Promising for a future change, but high complexity.

3. **Add `openspec show --diff` to render deltas against base specs.** (Chosen.) Leave the storage format unchanged. When displaying a change, compute the diff on the fly by comparing each delta spec file against its matching base spec. This gives reviewers the view they need with minimal code changes and zero workflow disruption.

### What this change delivers

- A `--diff` flag on `openspec show <change>` (and `openspec change show <change>`) that outputs a human-readable unified diff per delta spec
- In JSON mode (`--json --diff`), each delta includes a `diff` field with the unified diff text
- Text mode shows colorized unified diffs (additions in green, removals in red)
- New delta specs (no base spec exists) show the full content as all-additions
- When `--diff` is used without `--json`, the output is the diffs only (no proposal text)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-show`: Add `--diff` flag support for change display, computing unified diffs of delta specs against their base specs

## Non-goals

- Changing the delta spec storage format (approach 2 above — future work)
- Changing when or how base specs are updated (approach 1 above — future work)
- Diffing non-spec artifacts (proposal, design, tasks)
- Git-aware diffing (this compares files on disk, not git history)

## Impact

- `src/commands/show.ts` — pass `--diff` flag through to change display
- `src/commands/change.ts` — implement diff rendering in `show()` for text and JSON modes
- `src/cli/index.ts` — register `--diff` option on the show and change show commands
- New utility: diff computation between two markdown strings (can use a lightweight diff library or Node built-in)
- `src/commands/spec.ts` or `src/utils/` — helper to resolve base spec path for a given delta spec
