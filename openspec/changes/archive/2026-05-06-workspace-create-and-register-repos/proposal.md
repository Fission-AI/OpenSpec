## Why

Note: the change id keeps the older "register repos" wording for continuity. User-facing product language in this slice is `workspace setup`, `workspace link`, `workspace relink`, and "linked repos or folders."

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

`workspace setup` is the creation path for users. It should ask for the workspace name first, create the workspace in the standard location, require at least one existing repo or folder path, infer link names from folder names, show the workspace location, and run a check at the end so the user knows what OpenSpec can see.

Workspace names should be kebab-case so they are clean managed-folder names and stable registry identifiers. Link names should keep the folder-style validation from `workspace-foundation` because they are often inferred directly from existing repo or folder basenames.

`workspace setup --no-interactive` is the automation path. It should require enough flags to create a useful workspace, including a workspace name and at least one link.

`workspace list` shows known OpenSpec-managed workspaces from the local workspace registry, including each workspace location and linked repos or folders.

`workspace link` records an existing local repo or folder path for the selected workspace. It should support a simple form that infers the link name from the folder name and an explicit-name form for conflicts or clarity. Linking does not create, copy, move, initialize, or edit files in the linked repo or folder.

Linking should behave like selecting a folder from a picker: OpenSpec verifies the folder exists, resolves relative inputs to an absolute path in the current runtime, and stores that verified path instead of the raw input string.

When a link name is already in use, OpenSpec should preserve the existing link and show the conflicting name with the existing path. The error should suggest choosing a different link name, or using `workspace relink <name> <path>` if the user intended to change the existing link's path.

`workspace relink` lets users repair or change the local path for an existing link without recreating the workspace. It should not introduce owner or handoff metadata in this slice.

`workspace doctor` explains what the current machine can resolve for one selected workspace: the workspace location, the workspace planning path, linked repos or folders, missing paths, repo-local specs paths when present, and suggested fixes. It should infer the current workspace when run from inside a workspace. It reports issues but does not repair them automatically.

Workspace commands should work globally. When a command needs one workspace and the user did not specify it, OpenSpec should use the local registry to show an interactive picker. In non-interactive mode, it should fail with a clear message and suggest `--workspace <name>`.

When a command runs from inside a valid workspace that is not in the local registry, OpenSpec should still use that current workspace. It should surface a non-fatal warning status that the workspace is not known locally, and successful mutating commands such as `workspace link` or `workspace relink` should record that workspace in the local registry after they update workspace state.

Machine-readable output should separate workspace or link objects from status entries. Status should be an array of structured issues instead of scattering fields such as `root_status`, `issue`, or `fix` through the primary object shape.

Interactive behavior should be disabled whenever output must be script-safe. `--no-interactive` means no prompts, and `--json` should fail instead of prompting when selection or setup inputs are ambiguous. `workspace setup --json` should require `--no-interactive` so JSON setup always uses the explicit automation path.

Planning dependency:

- Depends on `workspace-foundation`.

## POC Findings

Behavior to preserve:

- `workspace setup` was the friendly onboarding path.
- `workspace list` made managed workspaces discoverable.
- A direct automation path is still useful, but it should live under `workspace setup --no-interactive`.
- Link repair is useful, but owner or handoff metadata should not carry forward in this slice.
- `workspace doctor` was the right place to answer "what does OpenSpec know about this workspace?"
- Shared workspace state and local paths were stored separately.
- Setup failed cleanly when non-interactive inputs were incomplete.
- Created workspaces excluded machine-local path state from portable workspace state.

Behavior to change:

- The POC required linked repo paths to already contain repo-local `openspec/`. This should become an implementation-readiness signal, not a planning prerequisite.
- The POC used repo-only language. This slice should use "repos or folders" for user-facing text.
- The public command should be `workspace link`, not `workspace add-repo`.
- The repair command should be `workspace relink`, not `workspace update-repo`.
- Public `workspace create` should be removed for the first release. Setup should be the creation flow.
- The POC's `setup` flow stored preferred agent and open behavior. Agent launch preferences belong to `workspace-open-agent-context`, not this slice.
- Human output should avoid implementation terms such as working set, code area, entry, alias, or local overlay.
- `setup` should require at least one linked repo or folder so the created workspace is immediately useful.

## Non-Goals

- No public `openspec workspace create` command in this first release.
- No agent launch or workspace open behavior.
- No preferred agent prompts or saved agent preference.
- No owner or handoff metadata fields.
- No workspace change creation or target selection.
- No apply, verify, archive, branch, or worktree behavior.
- No requirement that linked repos or folders have repo-local OpenSpec state.
- No automatic repair behavior in `workspace doctor`.
- No registry cleanup command such as `workspace forget`; stale registry entries are report-only in this slice.
- No standalone `workspace register` or `workspace join` command; unregistered current workspaces are usable, and mutating workspace commands can record them locally.

## Capabilities

### New Capabilities

- `workspace-links`: Lets users set up a workspace, link repos or folders, list known workspaces, and check workspace resolution before change creation.

### Modified Capabilities

- `cli-artifact-workflow`: Introduces workspace setup commands that happen before change creation.
- `workspace-foundation`: Tightens workspace names to kebab-case while keeping folder-style link names.

## Impact

- `openspec workspace setup`
- `openspec workspace list`
- `openspec workspace ls`
- `openspec workspace link`
- `openspec workspace relink`
- `openspec workspace doctor`
- Local workspace registry usage from `workspace-foundation`.
- Docs and generated guidance that explain linked repos or folders as planning context, not implementation commitment.
