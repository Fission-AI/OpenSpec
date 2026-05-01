## Why

Users start workspace work by creating a planning home and linking the repos or folders OpenSpec should know about.

They should not have to create a change before OpenSpec can see the relevant repos, monorepo folders, packages, services, or apps.

The product rule is:

```text
Workspace visibility is not change commitment.
```

A workspace is the durable planning home. A change is a feature, fix, project, or other planned piece of work inside that workspace.

## What Changes

Add the first user-facing workspace setup flow:

```text
Set up a workspace.
Link existing repos or folders.
List known workspaces and what they link to.
Check what OpenSpec can resolve and how to fix problems.
```

Expected user surface:

```bash
openspec workspace setup
openspec workspace setup --no-interactive --name platform --link /path/to/api --link web=/path/to/web
openspec workspace list
openspec workspace ls
openspec workspace link /path/to/api
openspec workspace link api-service /path/to/api
openspec workspace relink api /new/path/to/api
openspec workspace doctor
```

`workspace setup` is the creation path for users. It should ask for the workspace name first, create the workspace in the standard location, require at least one existing repo or folder path, infer link names from folder names, show the workspace path, and run a check at the end so the user knows what OpenSpec can see.

`workspace setup --no-interactive` is the automation path. It should require enough flags to create a useful workspace, including a workspace name and at least one link.

`workspace list` shows known OpenSpec-managed workspaces from the local workspace registry, including each workspace path and linked repos or folders.

`workspace link` records an existing local repo or folder path for the selected workspace. It should support a simple form that infers the link name from the folder name and an explicit-name form for conflicts or clarity. Linking does not create, copy, move, initialize, or edit files in the linked repo or folder.

`workspace relink` lets users repair or change the local path for an existing link without recreating the workspace. It should not introduce owner or handoff metadata in this slice.

`workspace doctor` explains what the current machine can resolve: the workspace root, the workspace planning path, linked repos or folders, missing paths, stale local registry entries, repo-local specs paths when present, and suggested fixes. It reports issues but does not repair them automatically.

Workspace commands should work globally. When a command needs one workspace and the user did not specify it, OpenSpec should use the local registry to show an interactive picker. In non-interactive mode, it should fail with a clear message and suggest `--workspace <name>`.

Planning dependency:

- Depends on `workspace-foundation`.

## POC Findings

Behavior to preserve:

- `workspace setup` was the friendly onboarding path.
- `workspace list` made managed workspaces discoverable.
- A direct automation path is still useful, but it should live under `workspace setup --no-interactive`.
- Link repair is useful, but owner/handoff metadata should not carry forward in this slice.
- `workspace doctor` was the right place to answer "what does OpenSpec know about this workspace?"
- Shared workspace state and local paths were stored separately.
- Setup failed cleanly when non-interactive inputs were incomplete.
- Created workspaces ignored machine-local path state.

Behavior to change:

- The POC required registered repos to already contain repo-local `openspec/`. This should become an implementation-readiness signal, not a planning prerequisite.
- The POC used repo-only language. This slice should use "repos or folders" for user-facing text.
- The public command should be `workspace link`, not `workspace add-repo`.
- The repair command should be `workspace relink`, not `workspace update-repo`.
- Public `workspace create` should be removed for the first release. Setup should be the creation flow.
- The POC's `setup` flow stored preferred agent/open behavior. Agent launch preferences belong to `workspace-open-agent-context`, not this slice.
- Human output should avoid implementation terms such as working set, code area, entry, alias, or local overlay.
- `setup` should require at least one linked repo or folder so the created workspace is immediately useful.

## Non-Goals

- No public `openspec workspace create` command in this first release.
- No workspace-open agent launch behavior.
- No preferred-agent prompts or saved agent preference.
- No owner or handoff metadata fields.
- No workspace change creation or target selection.
- No apply, verify, archive, branch, or worktree behavior.
- No requirement that linked repos or folders have repo-local OpenSpec state.
- No automatic repair behavior in `workspace doctor`.

## Capabilities

### New Capabilities

- `workspace-links`: Lets users set up a workspace, link repos or folders, list known workspaces, and check workspace resolution before change creation.

### Modified Capabilities

- `cli-artifact-workflow`: Introduces workspace setup commands that happen before change creation.

## Impact

- `openspec workspace setup`
- `openspec workspace list`
- `openspec workspace ls`
- `openspec workspace link`
- `openspec workspace relink`
- `openspec workspace doctor`
- Local workspace registry usage from `workspace-foundation`.
- Docs and generated guidance that explain linked repos/folders as planning context, not implementation commitment.
