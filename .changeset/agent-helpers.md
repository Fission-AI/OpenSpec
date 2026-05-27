---
"@fission-ai/openspec": minor
---

### Added

- **`openspec resolve-change [name] [--auto] [--json]`** — agent helper that
  resolves which active change to operate on. Lists every active change,
  validates a supplied name, or auto-selects when exactly one exists. Distinct
  exit codes (`0` ok, `1` none, `2` not found, `3` ambiguous) let skills branch
  without parsing stderr.
- **`openspec next-artifact --change <name>`** — agent helper that returns the
  next ready artifact bundled with its full `instructions` payload. Replaces
  the two-call `status --json` + `instructions <artifact> --json` pattern with
  one call. JSON by default; pass `--no-json` for a human summary. Emits
  `{ "done": true }` once every artifact is complete.
- **`openspec mark-task-done <task-id> --change <name>`** — agent helper that
  flips a single checkbox in the change's tracking file (typically `tasks.md`)
  from `- [ ]` to `- [x]`. Idempotent on already-checked lines, preserves
  CRLF/LF endings, and uses anchored matching so `1.1` does not match `1.10`.

### Changed

- `openspec instructions apply --change <n> --json` payload is now richer:
  - Each task in the `tasks` array carries an optional `numericId` field
    (`"1.1"`, `"2.3.4"`) extracted from the start of the task description when
    the tracking file uses numbered tasks. Existing positional `id` is
    unchanged.
  - The top-level payload includes a new `nextPendingId` field: the first
    unchecked task that has a `numericId`, or `null`. Pair with
    `openspec mark-task-done` to drive an apply loop without re-parsing
    `tasks.md`.
- Skill workflow templates for `openspec-propose` and `openspec-apply-change`
  now use the three new commands instead of inlining multi-step CLI
  orchestration. Run `openspec update` against an existing OpenSpec project to
  pick up the slimmer skill bodies. Net effect: fewer tokens per propose/apply
  cycle and fewer round-trips between the agent and the CLI.
