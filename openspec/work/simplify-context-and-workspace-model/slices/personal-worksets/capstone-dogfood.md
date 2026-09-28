# 7.1 Capstone Dogfood Transcript

Date: 2026-06-12, after the simplify pass (567bb03). Environment: a
scratch dir with isolated XDG state (`XDG_DATA_HOME`/`XDG_CONFIG_HOME`
under `/tmp/openspec-7.1-dogfood/`), three member folders (a planning
root, a code repo, a plain notes folder), and fake `code`, `cursor`,
`claude`, `codex` executables on a fully controlled PATH — each shim
records its cwd and argv to a launch log and exits 0. The CLI under
test is the built `dist/cli/index.js` via an `openspec` wrapper on the
same PATH. Per the runbook's 7.1 amendment: the scripted
compose→list→open walk for both launch styles with exact-argv
verification, then a cold-start UX walk by a fresh headless agent.

## Leg 1 — scripted walk (the user's seat, non-interactive)

```text
$ openspec workset create platform --member src/team-context --member src/web-app --member notes --tool claude

Saved workset 'platform' (3 members) to your machine.
Open it any time with: openspec workset open platform
exit=0

$ openspec workset list
platform  (opens in Claude Code)
  team-context  /private/tmp/openspec-7.1-dogfood/src/team-context
  web-app       /private/tmp/openspec-7.1-dogfood/src/web-app
  notes         /private/tmp/openspec-7.1-dogfood/notes
exit=0

$ openspec workset open platform --tool code
Opening 'platform' in VS Code (a window opens; this command returns).
exit=0

$ openspec workset open platform   # saved tool: claude (attach-dirs)
Handing this terminal to Claude Code for 'platform' (the session ends when you exit).
exit=0

$ openspec workset open platform --tool codex
Handing this terminal to codex for 'platform' (the session ends when you exit).
exit=0
```

The generated `.code-workspace` (regenerated on every open):

```json
{
  "folders": [
    { "name": "team-context", "path": "/private/tmp/openspec-7.1-dogfood/src/team-context" },
    { "name": "web-app", "path": "/private/tmp/openspec-7.1-dogfood/src/web-app" },
    { "name": "notes", "path": "/private/tmp/openspec-7.1-dogfood/notes" }
  ]
}
```

The recorded launches — exact argv per tool, cwd at the primary
member, **no positional anywhere** (the no-prompt rule), one attach
pair per member with the primary included, codex's sandbox pre-args
first:

```json
{"tool":"code","cwd":".../src/team-context","args":[".../data/openspec/worksets/platform.code-workspace"]}
{"tool":"claude","cwd":".../src/team-context","args":["--add-dir", ".../src/team-context", "--add-dir", ".../src/web-app", "--add-dir", ".../notes"]}
{"tool":"codex","cwd":".../src/team-context","args":["--sandbox", "workspace-write", "--add-dir", ".../src/team-context", "--add-dir", ".../src/web-app", "--add-dir", ".../notes"]}
```

The wrong turns:

```text
$ openspec workset open platform --tool zed   # unknown tool: the strand test
Error: Unknown tool 'zed'.
Fix: Known tools: code, cursor, claude, codex. Add new tools under "openers" in /tmp/openspec-7.1-dogfood/config/openspec/config.json.
Open manually:
  Workspace file: /tmp/openspec-7.1-dogfood/data/openspec/worksets/platform.code-workspace
  Members:
    team-context  /private/tmp/openspec-7.1-dogfood/src/team-context
    web-app       /private/tmp/openspec-7.1-dogfood/src/web-app
    notes         /private/tmp/openspec-7.1-dogfood/notes
exit=1

$ rm -rf notes && openspec workset open platform --tool code   # missing member
Skipped 'notes' (/private/tmp/openspec-7.1-dogfood/notes is not available).
Opening 'platform' in VS Code (a window opens; this command returns).
exit=0

$ openspec workset remove platform --yes
Removed workset 'platform'. Member folders were not touched.
exit=0

$ openspec workset list
No worksets saved. Create one with: openspec workset create
exit=0
```

Member folders verified byte-untouched after the whole walk (only the
original fixture files present).

## Leg 1b — the interactive wizard (real pty, driven by expect)

Answers: name typed, first folder accepted at the `.` default, Finish,
first tool in the select (VS Code — all four fakes available), open-now
declined.

```text
[1/3] Name the workset
? Workset name: platform-two
[2/3] Add member folders (the first one is the primary - sessions start there)
? Folder path: .
  Added 'openspec-7.1-dogfood' (/private/tmp/openspec-7.1-dogfood)
? Add another folder or finish: Finish
[3/3] Choose your tool
? Open with: VS Code

Saved workset 'platform-two' (1 member) to your machine.
? Open it now in VS Code? No
Open it any time with: openspec workset open platform-two
exit=0
```

Saved state confirmed (`tool: code`, basename-labeled member, absolute
path). A separate pty run where stdin hit EOF at the name prompt
exercised the cancellation path live: `Cancelled.`, exit 130, nothing
saved.

## Leg 2 — cold start (fresh headless agent, no insider knowledge)

A fresh `codex exec` session (gpt-5.5, medium) in the scratch dir with
fresh XDG state, given only this prompt: the user works across the
three folders daily, was told "the openspec CLI can keep a named view
of folders and open them together", knows no commands, and must start
from `openspec --help`. The agent's own report of its path:

```sh
openspec --help
openspec workset --help
openspec workset create --help
openspec workset open --help
openspec workset list --help
openspec workset create daily-context --member ./src/team-context --member ./src/web-app --member ./notes --tool claude --json
openspec workset open daily-context --tool claude
```

It discovered the group from top-level help ("personal working
views"), drilled into subcommand help, composed non-interactively with
repeatable `--member` flags, and opened the view. Physical evidence:
the launch log shows claude invoked with cwd at the primary and one
`--add-dir` pair per member (no positional), and the fresh data dir
holds exactly the spec-shaped `worksets.yaml`. **An agent with zero
insider knowledge reached an opened workset from `--help` alone.**

## Verdict

Every runbook capstone check passes: compose→list→open for both launch
styles with exact argv verified (including the no-prompt rule), the
generated workspace-file contents, the failure fallback, the
missing-member skip, safe removal, member-folder isolation, the
interactive wizard from a real pty, live cancellation, and the
cold-start agent walk. No product findings surfaced — the only defect
found during the run was in the dogfood's own first fake-tool shim
(it routed argv through `node -e`, which ate `--add-dir` as a node
option; rewritten with printf). Raw transcripts in
`/tmp/openspec-7.1-dogfood/` during the run; the durable record is
this file.
