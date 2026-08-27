# Item 9 Decision: Reject Initiative Resolve

## Final Decision

Do not implement a standalone `openspec initiative resolve <id>` command, now
or later.

The command is unnecessary because it tries to do work that already belongs to
other concepts:

- `initiative show` finds the canonical initiative.
- A workspace is the local view over repos and folders.
- Repo-local changes link themselves to initiatives.
- Repo-local status reports work progress.

## Decision 1: No Command

No separate initiative command is needed.

If the user only has a context store, `initiative show` is enough. If the user
has a workspace, the local view is already represented by that workspace. If the
user is inside a repo, repo-local commands are enough.

## Decision 2: Local Resolution Belongs To Workspace

A workspace maps local repos and folders to paths on one machine. Future
initiative-aware local opening belongs in workspace behavior.

## Decision 3: Agent Behavior

Agents should:

- Use `openspec initiative show <id> --json` for shared context.
- Use the current workspace view when the user is working in a workspace.
- Use repo-local commands when the user is working in a repo.
- Let the user decide which repos are present locally.

## Decision 4: Rejected Scope

Remove all standalone resolve behavior:

- no `initiative resolve`
- no all-repo scan
- no all-workspace scan
- no `--path` search roots
- no Git remote matching
- no cloning
- no worktree or branch creation
- no initiative backlinks
- no local availability dashboard

## Decision 5: Roadmap Update

Convert Item 9 into a decision-only checkpoint.

Replacement:

```text
Item 9. Reject Initiative Resolve

Decision: do not add `openspec initiative resolve`, now or later. Initiative
discovery belongs to `initiative show`; local path mapping belongs to
workspaces; implementation progress belongs to repo-local changes.
```
