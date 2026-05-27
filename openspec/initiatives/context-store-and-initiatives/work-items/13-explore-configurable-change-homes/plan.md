# Explore Initiative-Hosted Target-Bound Change Artifacts

## Status

Not started. Added as a future exploratory work item. Framing updated from
generic "configurable change homes" to the sharper question of when shared
initiative artifacts can become executable, target-bound OpenSpec changes.

## Source Of Truth

Start from `../../direction.md`, especially the current boundary:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Why This Exists

The current initiative direction assumes OpenSpec changes usually live in the
local repo that owns implementation. That keeps validation, archive, and spec
sync close to the code that will change.

Some coordinated work may need a shared home before the owning repo is obvious.
A team may want initiative-hosted planning artifacts, and later may want some
of those artifacts to become implementation-ready plans for a specific repo or
spec root.

This is not just a storage preference. A shared artifact is planning-only until
it has an explicit portable target binding and lifecycle rules for validate,
apply, archive, spec sync, and conflict handling.

## Goal

Decide whether OpenSpec should support initiative-hosted artifacts that can
graduate into executable changes only after they are bound to an implementation
target.

Repo-local changes remain the default executable implementation artifact. Item
13 should decide if, when, and how a context-store-hosted artifact can safely be
treated as a change.

The answer should preserve three boundaries:

- Initiatives coordinate shared context.
- Changes describe executable implementation plans.
- Workspaces open local views and must not imply edit permission.

## Model To Explore

```text
Initiative artifact
  -> planning-only by default
  -> may become target-bound later

Repo-local change
  -> home: repo/openspec/changes/<id>/
  -> target: implicit current repo/spec root
  -> lifecycle: validate/apply/archive/spec sync are repo-local

Initiative-hosted target-bound change
  -> home: context-store/initiatives/<initiative>/changes/<id>/
  -> target: explicit repo/spec root identity
  -> lifecycle: unsupported until target resolution is designed

Agent output
  -> reports the work target
  -> reports where the artifact lives
  -> reports the implementation target, if any
  -> reports allowed edit roots for this machine
```

Keep "change home" as internal resolver language. User-facing and agent-facing
output should prefer clearer phrases like "plan lives in repo-local OpenSpec",
"plan lives with the initiative", and "editable target".

## Core Invariants

- Storage location does not imply ownership, edit permission, or lifecycle.
- Work identity, artifact home, execution target, and allowed edit roots are
  separate decisions.
- Shared context-store files must not store machine-local checkout paths.
- A targetless initiative artifact is a brief, work item, or proposal, not an
  implementation-ready OpenSpec change.
- A context-store-hosted artifact can be considered executable only after it has
  explicit target metadata and lifecycle command support.
- Item 8 remains repo-local: `new change <id> --initiative ...` creates or links
  a repo-local change only.

## Questions To Answer

- What exact artifact types exist under an initiative: work items, briefs,
  target-bound changes, or something else?
- What portable target metadata is required before an initiative-hosted artifact
  can be executable?
- How does local resolution map a target repo identity to a checkout path,
  OpenSpec root, branch, and allowed edit roots?
- Should central target-bound changes require explicit opt-in such as
  `--home initiative`, or can initiative/store policy choose that behavior?
- If config exists, what is the deterministic precedence across explicit CLI
  flags, repo config, initiative preference, context-store default, user default,
  and built-in repo-local behavior?
- How does `openspec new change` report work target, artifact home,
  implementation target, initiative link, action context, and next commands in
  JSON?
- How do validate, apply, archive, and spec sync behave when the artifact lives
  in a context store but the target specs live in a repo?
- Should archive for an initiative-hosted target-bound change archive centrally,
  materialize a repo-local handoff change, or refuse until a repo-local change
  exists?
- Which command and skill surfaces still hardcode `openspec/changes/`, current
  working directory, or repo-local edit assumptions?
- What compatibility behavior preserves existing repo-local and workspace-local
  changes?

## Agent-First Output Contract

Any future command that creates, reads, or resolves this work should make the
agent's next move explicit:

```json
{
  "workTarget": {
    "kind": "repo-change | initiative-work-item | initiative-hosted-change",
    "id": "add-billing-api",
    "root": "/absolute/path/reported/by/cli"
  },
  "initiativeLink": {
    "store": "platform",
    "id": "billing-launch"
  },
  "implementationTarget": {
    "kind": "repo",
    "id": "billing-api",
    "specRoot": "openspec"
  },
  "actionContext": {
    "mode": "implementation-ready | planning-only | target-selection-required | unsupported",
    "sourceOfTruth": "repo | context-store | workspace-local",
    "allowedEditRoots": [],
    "constraints": [
      "Use CLI-reported paths.",
      "Do not infer editable repos from the current working directory."
    ]
  },
  "nextCommands": {}
}
```

If `allowedEditRoots` is empty, the agent should not edit implementation files.
If target selection is required, the command should return options or next
commands instead of creating an ambiguous implementation plan.

## Explicitly Out Of Scope

- Implementing context-store-hosted executable changes before the model is
  decided.
- Moving existing repo-local changes into a context store automatically.
- Making initiatives own implementation artifacts by default.
- Making workspace-level changes the new shared planning model.
- Cross-repo apply, archive, or validation orchestration.
- Storing machine-local checkout paths in shared context-store files.
- Adding global defaults that can surprise ordinary repo-local commands into
  writing shared artifacts.

## Go/No-Go Criteria

Do not implement initiative-hosted executable changes until OpenSpec has one
target-resolution model that can cover:

- create and link output
- status, show, list, and instructions output
- validate, apply, archive, and spec sync behavior
- workspace registry and local repo mapping behavior
- generated skill guidance and command examples
- JSON output for work target, artifact home, implementation target, edit roots,
  unsupported lifecycle commands, and next commands
