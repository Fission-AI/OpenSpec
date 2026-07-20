# Dogfood Proof: Single-Prompt Store-Scoped Change

Slice 1.4 acceptance evidence (spec scenario "Single-Prompt Store-Scoped
Change"). Run 2026-06-11 against the built CLI at commit `d2b62cc` (plus
the checkpoint-4 test work in progress).

## Arrangement

- Scratch project repo `/tmp/openspec-dogfood-14/app-repo` (git-inited),
  prepared with `openspec init . --tools claude --profile core` — so the
  repo has its own local OpenSpec root and the five generated core
  workflow skills under `.claude/skills/`.
- Isolated machine state: `XDG_DATA_HOME`/`XDG_CONFIG_HOME` pointed at
  scratch dirs; `OPENSPEC_TELEMETRY=0`; `openspec` on PATH via a shim to
  the repo's built `bin/openspec.js`.
- Store: `openspec store setup team-context --path
  /tmp/openspec-dogfood-14/team-context` (Git on by default, initial
  commit created), registered in the isolated state.

## The prompt (verbatim, the only instruction given)

```text
Create a change in our team store for reworking billing invoicing. Just
create the change itself, no need to write the artifacts yet.
```

No ids, paths, or flags. The store is named only in words ("our team
store").

Invocation: `claude -p "<prompt>" --dangerously-skip-permissions
--max-turns 25 --output-format text`, cwd = the app repo.

## What the agent did (tool calls, from the session log)

```text
TOOL Bash: openspec --help 2>&1 | head -50
TOOL Bash: ls -la /private/tmp/openspec-dogfood-14/app-repo
TOOL Bash: openspec store --help 2>&1; echo "---"; openspec store list 2>&1
TOOL Bash: openspec new --help 2>&1; echo "---"; openspec change --help 2>&1
TOOL Bash: openspec new change --help 2>&1
TOOL Bash: openspec new change rework-billing-invoicing --store team-context --description "Rework billing invoicing" 2>&1
```

Six tool calls: top-level help → store group help + `store list`
(discovered `team-context`) → command help → one store-scoped creation.
No initiative or workspace command was invoked at any point.

## The agent's final message

> Done. I created the change `rework-billing-invoicing` in the
> `team-context` store at
> `/private/tmp/openspec-dogfood-14/team-context/openspec/changes/rework-billing-invoicing/`,
> using the default `spec-driven` schema with the description "Rework
> billing invoicing".
>
> No artifacts (proposal, design, specs, tasks) have been written yet,
> per your request. When you're ready to flesh it out, you can run
> `openspec status --change rework-billing-invoicing --store
> team-context` to see the artifact checklist, or ask me to generate the
> artifacts.

Note the agent's own follow-up suggestion carries `--store team-context`
— the hint-continuity contract from slice 1.3 surviving into agent
behavior.

## End-state assertions (verified on disk)

- `team-context/openspec/changes/` contains `rework-billing-invoicing/`
  (plus `archive/`). ✓
- The app repo's local `openspec/changes/` contains no change — the
  local root was not misused despite being the nearest root. ✓
- No `initiatives/` directory in the store; the isolated
  `XDG_DATA_HOME/openspec/` contains only `stores/` (registry). ✓

Verdict: **pass**. A fresh headless agent session, given one plain
prompt and only the generated guidance plus `--help` output, discovered
the registered store and completed a store-scoped change without
hand-holding.
