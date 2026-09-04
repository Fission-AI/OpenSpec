# Name the command that resumes a change

## Why

`openspec status` reported where a change stood and stopped there. The command
that moves it forward was already computed — `buildNextSteps` derives it and
`--json` publishes it as `nextSteps` — but the text surface never rendered it.

So the surface a person actually reads ended on a checklist. `openspec new
change` hands off with `Next: openspec status --change <name>`, and that next
command then had no verb of its own. Picking a change back up after a lost
session, or opening one somebody else started, meant already knowing which
command came next (#906).

The completion case was the worst of it. Once every planning artifact existed,
status printed a lone green "All planning artifacts complete!" — which reads as
*you are done* even while `tasks.md` sits half-checked. That is what #906
reports: every artifact showed `done` rather than `ready`, so the conclusion was
that nothing was left to run.

## What Changes

- `openspec status` ends with a `Next:` line naming one command: the next ready
  artifact's `openspec instructions` call while planning is unfinished, and
  `openspec instructions apply` once every planning artifact exists.
- The line carries `--store <id>` whenever the resolved root is a store. A
  command without the flag would resolve against the pointer repo instead of the
  store the status was read from.
- `--all` gives every change in the sweep its own line, and gives none to an
  entry that failed to load — a failed entry has no artifact statuses to reason
  about.
- The line is built from the same resolution as the JSON `nextSteps` sentence,
  so the two surfaces cannot name different commands. `nextSteps` itself is
  unchanged, character for character.

No new command, no new flag, no new JSON field. This renders a value the agent
contract already publishes.

## Impact

- Affected specs: `cli-artifact-workflow` (MODIFIED: Next Artifact Discovery)
- Affected code: `src/commands/workflow/status.ts`,
  `src/core/change-status-policy.ts`
- Affected docs: `docs/cli.md` (the status text output example)
