# Workspace Demo

This guide is for using workspace mode with **real repos on your machine**.

It is written as a dogfood tutorial:

- use the actual `openspec` repo checkout you already have
- optionally add one or two more real repos if you want to exercise the multi-repo parts more fully
- create a real managed workspace
- try the commands in the order a real user would

If you only have the `openspec` repo available right now, you can still run the core flow. If you also have a second or third repo handy, the guide points out the extra things worth trying.

## What you will exercise

- creating a managed workspace
- registering real repos with stable aliases
- using `workspace doctor`
- creating a workspace change with explicit targets
- workspace-root and change-scoped `workspace open`
- Codex and GitHub Copilot workspace-open flows
- `status` as the coordination view
- `apply` as the handoff into repo-local execution
- optional target mutation before apply
- optional guardrails after apply
- optional workspace archive at the end

## Prerequisites

- `openspec` is installed and available on your `PATH`
- Node.js `20.19.0+`
- `git` is available
- optional: VS Code with GitHub Copilot if you want to try the Copilot path

If you are running from this repo checkout instead of a global install, replace `openspec` below with:

```bash
node /absolute/path/to/openspec/bin/openspec.js
```

## 1. Pick the real repos you want to coordinate

Start in the root of the real `openspec` repo you want to use:

```bash
cd /path/to/your/openspec/repo
pwd
```

Notes:

- this repo path is the one repo this guide assumes you definitely have
- additional repos are optional, but they make workspace mode much more interesting
- You can use any real repos here, not just repos related to OpenSpec.

## 2. Make sure each repo has repo-local OpenSpec state

`workspace add-repo` only accepts repos that already contain repo-local OpenSpec state, which means the repo has an `openspec/` directory.

Check the `openspec` repo:

```bash
test -d /path/to/your/openspec/repo/openspec && echo "openspec repo is ready"
```

If you are adding other repos, initialize them if needed:

```bash
openspec init /absolute/path/to/another/repo --tools none --force
```

Only run that command for repos that do not already have `openspec/`.

## 3. Use the setup wizard the way a real user would

The recommended onboarding path is:

```bash
openspec workspace setup
```

Use these answers when prompted:

```text
Workspace name: openspec-dogfood
Repo path: /absolute/path/to/your/openspec/repo
Repo alias: openspec
Owner (optional): OpenSpec Core
Handoff note (optional): Apply when the shared plan is ready
Add another repo? n
Open the workspace now? y
Which agent should OpenSpec prepare for? codex
```

If you also want to register more repos, answer `y` to `Add another repo?` and keep going until the wizard reaches the summary.

At the end of the wizard, `cd` into the created workspace. If you used the workspace name above, the default path is:

```bash
cd "$HOME/.local/share/openspec/workspaces/openspec-dogfood"
pwd
```

What to check:

- you are now inside the managed workspace root
- these files exist:
  - `.openspec/workspace.yaml`
  - `.openspec/local.yaml`
  - `changes/`

Quick inspection:

```bash
find . -maxdepth 2 -type f | sort
sed -n '1,200p' .gitignore
```

What to notice:

- the workspace is separate from any one repo
- `.openspec/local.yaml` is machine-local state
- `/.openspec/workspace-open/` is ignored because workspace-open may generate local artifacts there

If you want to understand the lower-level equivalent, it is:

```bash
openspec workspace create openspec-dogfood
openspec workspace add-repo openspec /absolute/path/to/your/openspec/repo --owner "OpenSpec Core" --handoff "Apply when the shared plan is ready"
cd "$HOME/.local/share/openspec/workspaces/openspec-dogfood"
```

## 4. Register additional real repos if you want a broader test

If you only want to test the single-repo flow, you can skip this section because the wizard already registered `openspec`.

If you have more repos, register them now:

```bash
openspec workspace add-repo consumer /absolute/path/to/another/repo --owner "Consumer Team" --handoff "Pick up once the core contract is stable"
openspec workspace add-repo docs /absolute/path/to/a/docs-repo --owner "Docs Team" --handoff "Document the rollout after implementation lands"
```

Now validate the workspace registry:

```bash
openspec workspace doctor
sed -n '1,200p' .openspec/workspace.yaml
sed -n '1,200p' .openspec/local.yaml
```

What to notice:

- `workspace.yaml` holds alias metadata you could share or commit
- `local.yaml` holds machine-local repo paths
- `workspace doctor` is the first thing to run if the registry feels wrong later

## 5. Create a real workspace change

Choose one of these commands based on the aliases you actually want to coordinate.

Single-repo flow:

```bash
openspec new change workspace-dogfood --targets openspec
```

Two-repo flow:

```bash
openspec new change workspace-dogfood --targets openspec,consumer
```

Three-repo flow:

```bash
openspec new change workspace-dogfood --targets openspec,consumer,docs
```

Inspect what was created:

```bash
find changes/workspace-dogfood -maxdepth 3 -type f | sort
sed -n '1,200p' changes/workspace-dogfood/proposal.md
sed -n '1,200p' changes/workspace-dogfood/design.md
sed -n '1,200p' changes/workspace-dogfood/tasks/coordination.md
```

If you targeted more than one repo, also inspect the draft slices:

```bash
find changes/workspace-dogfood/targets -maxdepth 2 -type f | sort
```

What to notice:

- the workspace owns the shared planning artifacts
- the target repo drafts live under `targets/<alias>/`
- no repo-local change exists yet in any repo

Confirm that for the `openspec` repo:

```bash
test ! -e /path/to/your/openspec/repo/openspec/changes/workspace-dogfood && echo "openspec repo not materialized yet"
```

## 6. Try `workspace open` in the order a real user would

### 6a. Root coordination open

```bash
openspec workspace open
```

What to look for:

- your preferred agent should launch
- the session should open in workspace-root mode
- `Attached repos:` should list the registered repos with valid local paths
- the agent should have the registered repos, repo inventory, and active workspace changes available for coordination

If you want to inspect the prepared surface without launching the agent:

```bash
openspec workspace open --prepare-only
```

### 6b. Change-scoped open for the default agent

```bash
openspec workspace open --change workspace-dogfood
```

What to look for:

- your preferred agent should launch again, now change-scoped
- only the targeted aliases should appear
- owner and handoff notes should appear
- non-targeted repos should not appear

If you want to inspect the prepared surface without launching the agent:

```bash
openspec workspace open --change workspace-dogfood --prepare-only
```

### 6c. Change-scoped open for Codex

```bash
openspec workspace open --change workspace-dogfood --agent codex
```

What to look for:

- Codex should launch with the workspace root plus only the targeted repos attached
- the session should stay scoped to the targeted repos

If you want to inspect the generated prompt surface without launching Codex:

```bash
openspec workspace open --change workspace-dogfood --agent codex --prepare-only
```

### 6d. Change-scoped open for GitHub Copilot in VS Code

```bash
openspec workspace open --change workspace-dogfood --agent github-copilot
```

Inspect the generated artifacts:

```bash
sed -n '1,200p' .github/prompts/opsx-workspace-open.prompt.md
sed -n '1,200p' .openspec/workspace-open/github-copilot/workspace-dogfood.code-workspace
```

What to notice:

- the prompt file lives under `.github/prompts/`
- the VS Code workspace file lives under `.openspec/workspace-open/github-copilot/`
- the `.code-workspace` file includes:
  - the workspace root
  - only the targeted repos

If you have VS Code installed, open the generated workspace:

```bash
code .openspec/workspace-open/github-copilot/workspace-dogfood.code-workspace
```

This is the real Copilot path: open the generated VS Code workspace and use Copilot there.

## 7. Use `status` as your control plane

Run:

```bash
openspec status --change workspace-dogfood
openspec status --change workspace-dogfood --json
```

What to look for:

- overall change state
- target-by-target progress
- owner and handoff notes
- the next recommended step

This is the main command to re-enter an in-flight cross-repo change later.

## 8. Optional: try target-set changes before apply

This section is only interesting if you registered at least one repo that is **not** already in the change target list.

For example, if you registered `docs` but did not target it yet:

```bash
openspec workspace targets workspace-dogfood --add docs
find changes/workspace-dogfood/targets -maxdepth 2 -type f | sort
openspec status --change workspace-dogfood
```

What to notice:

- the `docs` target draft gets scaffolded
- `status` now includes `docs`

Now remove it again before any apply:

```bash
openspec workspace targets workspace-dogfood --remove docs
find changes/workspace-dogfood/targets -maxdepth 2 -type f | sort
openspec status --change workspace-dogfood
```

What to notice:

- removing an unmaterialized target is allowed
- the remaining targets stay intact

## 9. Materialize one real repo

Now hand execution off into the `openspec` repo:

```bash
openspec apply --change workspace-dogfood --repo openspec
openspec status --change workspace-dogfood
find /path/to/your/openspec/repo/openspec/changes/workspace-dogfood -maxdepth 3 -type f | sort
sed -n '1,200p' /path/to/your/openspec/repo/openspec/changes/workspace-dogfood/tasks.md
```

What to notice:

- the workspace change still exists
- the `openspec` repo now has a repo-local change
- the source of truth for execution of that slice has moved into the repo

This is the core handoff:

- plan centrally
- execute locally

## 10. Optional: trigger a guardrail after apply

Once a repo has crossed into repo-local execution, try to remove it from the target set:

```bash
openspec workspace targets workspace-dogfood --remove openspec
```

This should fail.

What to learn:

- workspace target mutation is allowed only while the alias is still workspace-owned
- after apply, the workspace refuses to silently rewrite the target set around a repo-local slice

## 11. Continue from inside the real repo

Now switch into the `openspec` repo and look at the repo-local change directly:

```bash
cd /path/to/your/openspec/repo
find openspec/changes/workspace-dogfood -maxdepth 3 -type f | sort
sed -n '1,200p' openspec/changes/workspace-dogfood/tasks.md
```

This is where you would now do real implementation work.

When you want the workspace view again:

```bash
cd "$HOME/.local/share/openspec/workspaces/openspec-dogfood"
openspec status --change workspace-dogfood
```

## 12. Optional: test `workspace doctor` on a real broken path

If you want to see the repair flow, temporarily break one alias in `.openspec/local.yaml`.

The simplest safe way is:

1. open `.openspec/local.yaml`
2. replace one repo path with a missing path like `/tmp/does-not-exist`
3. run:

```bash
openspec workspace doctor
openspec status --change workspace-dogfood
```

Then repair the path in `.openspec/local.yaml` and run:

```bash
openspec workspace doctor
```

What to learn:

- broken local paths are a **doctor** problem
- the fix belongs in `local.yaml`, not in the shared workspace metadata

## 13. Optional: complete and archive the full flow

If you want to exercise the whole lifecycle, finish the tasks and archive the repo-local change.

In the `openspec` repo:

```bash
cd /path/to/your/openspec/repo
perl -0pi -e 's/- \[ \]/- [x]/g' openspec/changes/workspace-dogfood/tasks.md
openspec archive workspace-dogfood --yes --skip-specs --no-validate
```

Back in the workspace:

```bash
cd "$HOME/.local/share/openspec/workspaces/openspec-dogfood"
perl -0pi -e 's/- \[ \]/- [x]/g' changes/workspace-dogfood/tasks/coordination.md
openspec status --change workspace-dogfood
openspec archive workspace-dogfood --workspace
openspec status --change workspace-dogfood
```

What to notice:

- repo-local archive and workspace archive are distinct
- the workspace archive is the explicit “this cross-repo change is done” step

## 14. The re-entry flow you will actually use later

Once you have a real workspace in use, this is the normal re-entry sequence:

```bash
cd "$HOME/.local/share/openspec/workspaces/openspec-dogfood"
openspec status --change workspace-dogfood
openspec workspace open --change workspace-dogfood
openspec workspace open --change workspace-dogfood --agent codex
openspec workspace open --change workspace-dogfood --agent github-copilot
```

Use:

- `status` to understand current state and next action
- `workspace open` to relaunch the root or change-scoped session
- `workspace doctor` if aliases or paths look stale
- `apply` only when you are ready to hand execution off into a repo

## If you want to remove the workspace later

The workspace is just a managed directory under:

```bash
$HOME/.local/share/openspec/workspaces/
```

So if you want to discard this dogfood workspace after testing:

```bash
rm -rf "$HOME/.local/share/openspec/workspaces/openspec-dogfood"
```

That does **not** delete your registered repos. It only deletes the coordination root.

## Optional convenience shortcuts

If you end up using the same repos repeatedly, you can set shell variables to avoid retyping long paths:

```bash
export OPENSPEC_REPO="/path/to/your/openspec/repo"
export WORKSPACE_ROOT="$HOME/.local/share/openspec/workspaces/openspec-dogfood"
```

Those shortcuts are optional. They are not required for the walkthrough above.
