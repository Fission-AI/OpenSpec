# The Phase 5 Remainder (closing out 5.1)

Decided and executed 2026-06-11, after 4.1, per the queue. The locked
5.1 criteria govern: delete, don't hide; never auto-delete user data.
Everything below is repo-owned project material in THIS repository
(schemas we ship, our own planning artifacts, our own accepted specs) —
not user data.

## 1. `schemas/workspace-planning/` — DELETED

After 4.1, no src code names the schema (`WORKSPACE_DEFAULT_SCHEMA`
died with planning-home's collapse), but `openspec schemas` still
ADVERTISED it — a shipped invitation into a workflow whose commands,
mode, and state model no longer exist. That is the precise "old surface
that misleads" the 5.1 criteria target. The directory (schema.yaml +
templates) is deleted; `openspec schemas` now lists `spec-driven`
alone.

## 2. Obsolete beta change folders — the four `workspace-*` DELETED

`openspec/changes/{workspace-agent-guidance, workspace-apply-repo-slice,
workspace-reimplementation-roadmap, workspace-verify-and-archive}` are
planning relics of the dead beta (mostly bare proposals; none
implemented). Archiving them would assert they were completed — a lie;
keeping them active advertises dead work. Deleted; git history
preserves them. The other change folders (add-*, fix-*, schema-*, etc.)
are NOT workspace-beta material and stay untouched.

## 3. L2 — the accepted workspace-era specs

The parked question: what happens to accepted specs that REQUIRE
deleted behavior. Decision in two grades:

- **Wholly-workspace specs DELETED**: `workspace-open`,
  `workspace-foundation`, `workspace-change-planning`,
  `workspace-links`. Every requirement in them mandates commands and
  state that no longer exist; an accepted-spec library that REQUIRES
  the impossible is worse than one with a gap. Capability gone =
  spec gone.
- **Mixed specs get a bounded excision, not a rewrite**: in
  `cli-config`, the "Config profile applies to current workspace"
  requirement dies (the prompt flow it mandates was deleted). In
  `cli-artifact-workflow`, the "Workspace Setup Commands" and
  "Workspace schema instructions" requirements die whole, and the
  workspace-scoped scenarios/clauses inside the status-JSON and
  planning-context requirements are removed (status JSON no longer
  reports workspace anything). No other rewording.
- **Incidental mentions elsewhere are recorded, not rewritten**:
  `change-creation`, `artifact-graph`, `cli-update`,
  `openspec-conventions`, `schema-resolution` mention workspace
  historically or peripherally; sweeping them is the broad docs
  rewrite the roadmap forbids. Recorded as capstone
  vocabulary-audit input.
