# Using OpenSpec With Your Coding Agent

Beta note: this is the smallest useful path. You do the local setup. Your agent
manages the OpenSpec work.

## 1. Create The Shared Place

```bash
openspec context-store setup
```

OpenSpec asks for the context store name, where to put it, and whether to
initialize Git. Press Enter for the managed local data directory unless you
want the store somewhere specific.

## 2. Ask Your Agent To Create The Initiative

> Create an OpenSpec initiative called `billing-launch` in `team-context`. Keep
> it short and useful.

## 3. Open Your Local Workbench

```bash
openspec workspace open
```

Select the initiative from the picker. OpenSpec creates a local workspace view
for it if you do not already have one. When creating a new view, it also asks
which local repos or folders to include.

The opened editor view shows linked repos and folders first, initiative context
when attached, and a small `OpenSpec workspace` folder last with `AGENTS.md`,
`workspace.yaml`, and the generated `.code-workspace` file.

Use `openspec workspace open --initiative team-context/billing-launch --editor`
when you want to skip the picker. Use `--agent codex-cli`, `--agent claude`, or
`--agent github-copilot` instead of `--editor` when you want to open an agent
directly.

## 4. Check The Local Context

Ask your agent to inspect the opened workspace before planning work:

> Check this OpenSpec workspace. Resolve the selected initiative, list the
> linked repos or folders, and tell me if anything important is missing before
> we explore the work.

If a repo or folder is missing, tell the agent which local path should be linked.
OpenSpec does not clone anything.

## 5. Explore Before Creating Artifacts

Use the workspace as the place where the conversation happens:

> Using initiative `team-context/billing-launch`, explore the work in this
> workspace. Read the initiative context and linked repo context first. Do not
> create a change yet; help me decide what should be proposed and where the
> OpenSpec artifacts should live.

## 6. Ask For A Draft When Ready

When exploration has converged, ask the agent to create the right artifact in
the right place:

> Create a draft repo-local OpenSpec proposal for the owning linked repo and
> link it to `team-context/billing-launch`. Resolve the workspace and initiative
> context yourself, run the needed OpenSpec commands from the correct repo, and
> report the files you created.

## Tiny Caveat Box

OpenSpec is not cloning, syncing, branching, or tracking progress dashboards in
this beta flow. It gives you shared initiative context, a local workspace view,
and repo-local plans tied back to the bigger mission. The workspace is where
you and the agent work together; durable plan artifacts should live in the
context store initiative or in the owning repo, not in the workspace root.
