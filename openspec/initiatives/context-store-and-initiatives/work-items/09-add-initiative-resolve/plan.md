# Reject Initiative Resolve

## Status

Final decision: do not implement a standalone `openspec initiative resolve`
command, now or later.

## Source Of Truth

Start from `../../direction.md` and the boundary:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

Item 8 already established that repo-local changes may reference initiatives
through portable checked-in metadata:

```yaml
initiative:
  store: platform
  id: billing-launch
```

## Final Decision

Do not ship `openspec initiative resolve <id>` as a user-facing command in this
slice or any future slice.

The earlier command framing was too broad. It tried to join initiative identity,
workspace local paths, explicit repo roots, and linked repo-local changes into a
new CLI surface. That makes the command look authoritative even though the
initiative does not own local repo paths, repo participation, or implementation
state.

## Why The Command Is Not Needed

If a user only has a context store clone, OpenSpec can already resolve the
canonical initiative with:

```bash
openspec initiative show billing-launch --json
```

That answers:

```text
What initiative is this, which context store contains it, and where is the
canonical initiative folder?
```

It cannot answer:

```text
Which local implementation repos should exist on this machine?
```

because that information is not in the context store.

If a user has a workspace, the workspace is already the local view. It already
maps local repos and folders to paths on this machine. A separate
`initiative resolve` command would mostly re-describe the workspace the user is
already using.

If a user is in a repo, the repo-local change commands and status commands
already operate from that repo. The user or agent can inspect the current repo's
changes directly.

## Product Rule

Do not create a new command whose main job is to discover local paths that the
workspace already represents.

Rules:

- `initiative show` remains the command for canonical initiative discovery.
- Workspaces remain the local view over repos, folders, context stores, and
  initiatives.
- Repo-local changes remain the implementation artifacts.
- Agents should use the current workspace or current repo context rather than
  asking a standalone initiative command to infer local availability.
- OpenSpec should not infer repo ownership, scan arbitrary repos, clone repos,
  create worktrees, or write backlinks to make resolve appear smarter than it
  is.

## What To Do Instead

Keep the pieces separate:

- Use `openspec initiative show <id> --json` to locate canonical shared context.
- Use workspace commands to set up, link, relink, list, open, update, and doctor
  local views.
- Use repo-local `openspec new change ... --initiative ...` and
  `openspec set change ... --initiative ...` to create durable links from repo
  work to initiative context.
- Use `openspec status --change <id> --json` inside the owning repo to inspect
  implementation progress.

If a future workspace workflow needs to open an initiative-specific view, it
should be designed under workspace behavior, not as a standalone initiative
resolve command.

## Deferred Or Replaced Scope

The following ideas are not part of Item 9 implementation:

- `openspec initiative resolve <id>`
- scanning all registered workspaces
- scanning all repos on disk
- explicit `--path` based initiative resolution
- Git remote matching
- repo ownership inference
- cloning, fetching, pulling, pushing
- branch or worktree creation
- initiative backlinks
- progress dashboards
- local availability dashboards

## Roadmap Disposition

Item 9 is a decision-only checkpoint. It records that standalone initiative
resolution is rejected permanently.

Roadmap framing:

```text
Item 9. Reject Initiative Resolve

Decision: do not add `openspec initiative resolve`, now or later. Initiative
discovery belongs to `initiative show`; local path mapping belongs to
workspaces; implementation progress belongs to repo-local changes.
```

## Next Useful Work

The next useful implementation slice is workspace initiative opening, without a
standalone resolve prerequisite.
