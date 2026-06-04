# OpenSpec CLI Playbook For Agents

Beta note: workspace and initiative flows are usable, but still small. Prefer
plain commands, clear paths, and short status reports.

## Start By Resolving Context

Use JSON when you need exact paths.

```bash
openspec context-store list --json
openspec initiative list --json
openspec initiative show <store>/<initiative> --json
openspec workspace doctor --json
```

When the user is working from an opened workspace, treat the workspace as the
local view. Use `workspace doctor --json` to read linked repos/folders and the
selected initiative. Do not assume the current directory is the repo that should
own implementation artifacts.

## Set Up Context Stores Non-Interactively

Humans can run `openspec context-store setup` and answer prompts. Agents should
pass the setup inputs explicitly.

```bash
openspec context-store setup team-context --no-init-git --json
openspec context-store setup team-context --path /path/to/team-context --init-git --json
```

Use `context-store unregister <id> --json` to forget a local registration while
leaving files alone. Use `context-store remove <id> --yes --json` only when the
user explicitly asks to delete the local context-store folder.

## Create Initiatives In Context Stores

Create shared coordination context in a context store.

```bash
openspec initiative create billing-launch --store team-context --title "Billing Launch" --summary "Get billing live without losing the plot."
```

Then edit the initiative files in the context store:

- `requirements.md`
- `design.md`
- `decisions.md`
- `questions.md`
- `tasks.md`

## Explore Or Propose From A Workspace

When the user asks to explore or draft work from a workspace:

1. Resolve the workspace with `openspec workspace doctor --json`.
2. Resolve the initiative with `openspec initiative show <store>/<initiative> --json`.
3. Inspect linked repos or folders and identify the likely owning repo.
4. If ownership is ambiguous, ask the user which linked repo should own the
   repo-local OpenSpec change.
5. Run explore/propose workflow commands from the owning repo, not from the
   workspace root.

The workspace is the cockpit for the conversation. It is not the durable home
for implementation plans.

## Create Changes From The Owning Repo

Repo-local changes belong in the repo that owns the work.

```bash
openspec new change add-billing-api --initiative team-context/billing-launch
```

Run this command with the owning repo as the current working directory. Do not
ask the user to type it and do not run initiative-linked change creation from a
workspace root. If you only know the workspace, resolve linked repo paths first.

After creating a change, report the absolute paths of the created files and the
initiative link you used.

## Use Doctor Before Guessing

```bash
openspec workspace doctor --workspace billing-launch --json
openspec context-store doctor --json
```

## Do Not Promise Yet

- Automatic sync, pull, push, or conflict handling.
- Cloning repos.
- Creating branches, worktrees, or submodules.
- Workspace apply, verify, or archive.
- Progress dashboards.
- Enforced edit boundaries.
