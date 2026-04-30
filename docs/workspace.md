# Workspace Mode

Workspace mode is the cross-repo coordination path for OpenSpec. It gives you one planning home for a change that spans multiple repositories, while keeping canonical specs and execution owned by the real repos.

## When To Use Workspace Mode

Use workspace mode when repo-local OpenSpec is no longer an honest representation of the work.

Typical signals:

- one change spans two or more repos
- the canonical contract owner is different from one or more implementation repos
- repos or teams need to move at different cadences
- you need one place to pause, resume, or hand off a cross-repo change

Stay repo-local when:

- the work fits in one repo
- the same repo owns planning, implementation, and archive
- you do not need a separate coordination surface

Rule of thumb:

> Plan centrally, execute locally, preserve repo ownership.

Need a runnable walkthrough instead of a reference page? See [Workspace Demo](workspace-demo.md).

## Recommended First Run

Most people should start with the guided setup wizard:

```bash
openspec workspace setup
```

That flow:

1. creates the managed workspace root
2. prompts for one or more repo paths and aliases
3. stores optional owner and handoff notes
4. runs `openspec workspace doctor`
5. stores a preferred workspace-open agent in `.openspec/local.yaml`
6. offers to open the workspace immediately using that preferred agent

Use the lower-level commands directly when you already know the exact workspace shape you want or when you are scripting against the workspace model.

## Supported CLI Flow

The current supported v0 flow is:

```bash
openspec workspace setup
openspec workspace list
openspec new change <id> --targets <alias-a,alias-b>
openspec workspace targets <id> --add <alias-c> --remove <alias-d>
openspec workspace open [--change <id>] [--name <workspace>] [--agent claude|codex|github-copilot] [--prepare-only]
openspec apply --change <id> --repo <alias>
openspec status --change <id>
```

The equivalent manual setup path is:

```bash
openspec workspace create <name>
openspec workspace add-repo <alias> <path> [--owner "<team or person>"] [--handoff "<next step>"]
```

What each step does:

1. `workspace setup` is the onboarding path. It creates the workspace, registers repos, validates the registry, stores a preferred workspace-open agent, and can optionally launch the workspace immediately.
2. `workspace list` shows the locally managed workspaces OpenSpec knows about.
3. `workspace create` and `workspace add-repo` remain the manual setup path. `workspace create` creates a managed coordination root with `.openspec/` metadata and top-level `changes/`. `workspace add-repo` registers stable repo aliases. Repo paths stay local in `.openspec/local.yaml`. Optional owner and handoff notes are committed in `.openspec/workspace.yaml`.
4. `new change --targets` creates one workspace change with shared planning artifacts plus per-target draft slices.
5. `workspace targets <id>` adjusts the target set without manual file edits. It scaffolds added draft slices, removes unmaterialized draft slices, and refuses add or remove mutations once the same change ID already has repo-local execution or archive state for that alias.
6. `workspace open` launches a workspace-root coordination session. If you are already inside a workspace root, it uses that workspace. If you are outside a workspace and only one managed workspace exists, it uses that automatically. If multiple managed workspaces exist, it prompts interactively or you can pass `--name <workspace>`. When you omit `--agent`, OpenSpec uses the preferred agent stored during setup, or prompts once and persists it for older workspaces with no stored preference.
7. Workspace-root mode opens the workspace working set: the coordination root plus registered repos with valid local paths. It also gives the agent the registered repo inventory, owner or handoff notes, and active workspace changes so it can explore before proposal creation.
8. `workspace open --change <id>` adds focused change context for an existing workspace change. Use `--agent codex` when you want Codex launched with the workspace working set attached, or `--agent github-copilot` when you want VS Code opened on a generated `.code-workspace` file.
9. `workspace open --prepare-only` or `workspace open --json` prepares the surfaces without launching an external tool. Use that when you want to inspect or script the generated state.
10. `apply --change <id> --repo <alias>` materializes one repo-local execution surface. After that point, repo-local execution remains local to that repo.
11. `status --change <id>` from the workspace root rolls up coordination state, repo progress, blockers, owner or handoff notes, and the next action.

## Re-Enter An Existing Workspace

When you return to an in-flight cross-repo change:

1. Run `openspec status --change <id>` to see the overall state, affected repos, owner or handoff notes, and the next step.
2. Run `openspec workspace open` when you want the root coordination session. You can run this from anywhere if OpenSpec can uniquely resolve the workspace. Add `--name <workspace>` when more than one managed workspace exists.
3. Run `openspec workspace open --change <id>` when you want the current planning context reopened with just the targeted repos in view.
4. Run `openspec workspace targets <id> --add <alias>` or `--remove <alias>` if the repo scope changed and that alias has not already crossed into repo-local execution for the same change ID.
5. Run `openspec workspace doctor` if `status` reports a stale or missing repo alias.

If you need to explore or plan across the workspace, `openspec workspace open` without `--change` launches the workspace-root session with registered repo roots attached. The supported workspace-open agents are `claude`, `codex`, and `github-copilot`. The default agent comes from the workspace-local preferred agent stored in `.openspec/local.yaml`.

If you create a targeted workspace change from a launched root session, stop after the change is created. OpenSpec records that scope upgrade and reopens the next session change-scoped. Today that automatic upgrade is implemented as a relaunch or continue flow for Claude and Codex, not a live directory attach inside the existing TUI.

For GitHub Copilot, `workspace open` targets VS Code rather than Copilot CLI:

- it writes the scoped prompt file to `.github/prompts/opsx-workspace-open.prompt.md`
- it writes a managed `.code-workspace` file under `.openspec/workspace-open/github-copilot/`
- in workspace-root mode that workspace file includes the coordination root plus registered repos with valid local paths
- in change-scoped mode it includes the coordination root plus only the targeted repos

## Hand Off Work To Another Repo Owner

Owner and handoff metadata are lightweight coordination notes for the workspace registry:

- `--owner` is the repo owner, primary contact, or team that should own the repo-local slice.
- `--handoff` is the short next-step note another engineer should follow when they pick up that repo.

You can add or update those notes later without changing local repo paths:

```bash
openspec workspace update-repo <alias> --owner "<team or person>" --handoff "<next step>"
```

You can also adjust the target set later without editing `.openspec.yaml` by hand:

```bash
openspec workspace targets <id> --add <alias-a,alias-b>
openspec workspace targets <id> --remove <alias-c>
```

That command keeps authority handoff explicit. If the same change ID already exists or was already archived in a target repo, `workspace targets` fails instead of silently mutating the workspace target set around repo-local execution.

The committed workspace metadata stays machine-safe:

- `.openspec/workspace.yaml` stores aliases plus optional owner or handoff notes
- `.openspec/local.yaml` stores machine-specific repo paths

That split keeps shared workspace state portable while still letting each machine resolve local repo roots.
