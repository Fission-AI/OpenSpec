## 1. POC Findings And Scope

- [x] 1.1 Confirm `setup`, `list`, and `doctor` belong to this slice
- [x] 1.2 Capture that setup should not own preferred agent or workspace open behavior
- [x] 1.3 Capture that linked repos or folders and monorepo paths are allowed without repo-local OpenSpec state
- [x] 1.4 Capture decisions for JSON output, `ls`, `.gitignore`, non-interactive setup, required first link, and relink behavior
- [x] 1.5 Capture that public `workspace create` is out of scope for the first release
- [x] 1.6 Capture `link`/`relink` as the user-facing commands

## 2. Workspace Setup

- [x] 2.1 Implement `openspec workspace setup` as the only public creation path
- [x] 2.2 Prompt for workspace name first in interactive setup
- [x] 2.3 Validate workspace names as kebab-case and let interactive users retry invalid names
- [x] 2.4 Require at least one existing repo or folder path during setup
- [x] 2.5 Infer link names from folder basenames during setup
- [x] 2.6 Let users add more repos or folders with a simple repeated prompt
- [x] 2.7 Run `workspace doctor` after setup and show a readable summary
- [x] 2.8 Print the workspace location, planning path, linked repos or folders, and next useful commands
- [x] 2.9 Keep preferred agent prompts and workspace opening out of this slice
- [x] 2.10 Add `.gitignore` handling for machine-local workspace state
- [x] 2.11 Record created workspaces in the local workspace registry
- [x] 2.12 Add tests for native Windows/PowerShell and WSL2-compatible path construction where practical

## 3. Non-Interactive Setup

- [x] 3.1 Add `workspace setup --no-interactive --name <name> --link <path>` support
- [x] 3.2 Support repeated `--link` values
- [x] 3.3 Support `--link <path>` with inferred names
- [x] 3.4 Support `--link <name>=<path>` with explicit names
- [x] 3.5 Fail cleanly when non-interactive setup is missing a name or at least one link
- [x] 3.6 Resolve relative link paths to verified absolute runtime-local paths before storing local state
- [x] 3.7 Require `--no-interactive` when `workspace setup --json` is used
- [x] 3.8 Add `--json` output for non-interactive setup
- [x] 3.9 Preserve the interactive setup UX when `--no-interactive` is not passed

## 4. Workspace Listing

- [x] 4.1 Implement `openspec workspace list`
- [x] 4.2 Add `workspace ls` as an alias for `workspace list`
- [x] 4.3 List known OpenSpec-managed workspaces from the local workspace registry
- [x] 4.4 Handle the no-workspaces case with a clear next step
- [x] 4.5 Show each workspace location and linked repos or folders
- [x] 4.6 Report stale registry entries with status entries without deleting, rewriting, or repairing registry state
- [x] 4.7 Add JSON output with typed workspace objects and structured status arrays

## 5. Workspace Selection

- [x] 5.1 Make workspace commands work from outside workspace directories
- [x] 5.2 Add `--workspace <name>` to commands that need one workspace
- [x] 5.3 Use the current workspace when running from inside a workspace
- [x] 5.4 Use unregistered current workspaces with a non-fatal warning status
- [x] 5.5 Record unregistered current workspaces in the local registry after successful `workspace link` or `workspace relink`
- [x] 5.6 Keep `workspace doctor` diagnostic-only when the current workspace is unregistered
- [x] 5.7 Show an interactive picker when multiple known workspaces exist and no workspace is specified
- [x] 5.8 Select the only known workspace automatically when there is exactly one
- [x] 5.9 Fail clearly in non-interactive mode when workspace selection is ambiguous
- [x] 5.10 Fail with structured status output instead of prompting when `--json` workspace selection is ambiguous
- [x] 5.11 Use the local workspace registry for workspace lookup

## 6. Workspace Links

- [x] 6.1 Implement `openspec workspace link <path>` with inferred link names
- [x] 6.2 Implement `openspec workspace link <name> <path>` with explicit link names
- [x] 6.3 Accept full repo roots and monorepo package/service/app folder paths
- [x] 6.4 Require linked paths to exist
- [x] 6.5 Allow links without repo-local `openspec/`
- [x] 6.6 Store stable link names in shared state and local paths in machine-local state
- [x] 6.7 Keep link names folder-style, and detect duplicate link names with a specific error that shows the existing link path and suggests a different name or `workspace relink`
- [x] 6.8 Resolve relative linked paths to verified absolute runtime-local paths before storing local state
- [x] 6.9 Preserve native Windows and WSL2-style paths as local path values without cross-runtime translation
- [x] 6.10 Ensure link only records state and does not edit the linked repo/folder
- [x] 6.11 Add `--json` output for `workspace link`

## 7. Workspace Relinks

- [x] 7.1 Implement `openspec workspace relink <name> <path>`
- [x] 7.2 Let users repair or change the local path for an existing link
- [x] 7.3 Require relink paths to exist
- [x] 7.4 Resolve relative relink paths to verified absolute runtime-local paths before storing local state
- [x] 7.5 Keep owner or handoff metadata out of this slice
- [x] 7.6 Add `--json` output for `workspace relink`
- [x] 7.7 Return a clear error for unknown link names

## 8. Workspace Doctor

- [x] 8.1 Implement `openspec workspace doctor` for one selected workspace only
- [x] 8.2 Show the workspace location and workspace planning path
- [x] 8.3 Show linked repos or folders in readable human output with a clear issues section
- [x] 8.4 Report missing local paths, missing filesystem paths, local-only names, and selected-workspace location problems
- [x] 8.5 Report `repo_specs_path` when repo-local `openspec/specs` exists and `null` otherwise
- [x] 8.6 Include suggested fixes for each issue
- [x] 8.7 Avoid automatic repair behavior
- [x] 8.8 Add JSON output with typed workspace/link objects and structured status arrays
- [x] 8.9 Keep stale registry cleanup commands such as `workspace forget` out of this slice

## 9. Documentation And Guidance

- [x] 9.1 Document setup/list/link/relink/doctor in user-facing product language
- [x] 9.2 Document linked repos or folders and large-monorepo folder links
- [x] 9.3 Document that workspace visibility is not change commitment
- [x] 9.4 Avoid "working set", "code area", "entry", "alias", and "local overlay" in human-facing docs
- [x] 9.5 Document JSON output support and the object/status response pattern for non-interactive/direct commands
- [x] 9.6 Document global command behavior, workspace picker behavior, and `--workspace <name>`
- [x] 9.7 Document that setup controls workspace storage and always shows the workspace location

## 10. Verification

- [x] 10.1 Run `openspec validate workspace-create-and-register-repos --strict`
- [x] 10.2 Run targeted command tests for workspace setup/list/link/relink/doctor, including doctor inferring the current workspace
- [x] 10.3 Run targeted tests for links without repo-local OpenSpec and monorepo folder links
- [x] 10.4 Run targeted tests for JSON output, `ls`, `.gitignore`, non-interactive setup, required first link, verified absolute path storage, and JSON/no-interactive prompt suppression
- [x] 10.5 Run targeted tests for global command selection, unregistered current workspace handling, and local workspace registry behavior

## 11. Review Fixes

- [x] 11.1 Preserve `=` characters in inferred setup link paths while keeping explicit `--link <name>=<path>` support
- [x] 11.2 Add reusable core helpers for optional local state reads and setup link input parsing
- [x] 11.3 Fail `workspace link` and `workspace relink` before mutation when local state is invalid
- [x] 11.4 Report invalid local state distinctly in `workspace list` and `workspace doctor`
- [x] 11.5 Add regression tests for equals-sign setup paths and malformed local state behavior
