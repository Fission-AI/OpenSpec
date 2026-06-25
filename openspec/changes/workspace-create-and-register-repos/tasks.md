## 1. POC Findings And Scope

- [x] 1.1 Confirm `setup`, `list`, and `doctor` belong to this slice
- [x] 1.2 Capture that setup should not own preferred-agent or workspace-open behavior
- [x] 1.3 Capture that linked repos/folders and monorepo paths are allowed without repo-local OpenSpec state
- [x] 1.4 Capture decisions for JSON output, `ls`, `.gitignore`, non-interactive setup, required first link, and relink behavior
- [x] 1.5 Capture that public `workspace create` is out of scope for the first release
- [x] 1.6 Capture `link`/`relink` as the user-facing commands

## 2. Workspace Setup

- [ ] 2.1 Implement `openspec workspace setup` as the only public creation path
- [ ] 2.2 Prompt for workspace name first in interactive setup
- [ ] 2.3 Validate workspace names with lowercase letters, numbers, and hyphens
- [ ] 2.4 Require at least one existing repo or folder path during setup
- [ ] 2.5 Infer link names from folder basenames during setup
- [ ] 2.6 Let users add more repos/folders with a simple repeated prompt
- [ ] 2.7 Run `workspace doctor` after setup and show a readable summary
- [ ] 2.8 Print the workspace root, planning path, linked repos/folders, and next useful commands
- [ ] 2.9 Keep preferred-agent prompts and workspace opening out of this slice
- [ ] 2.10 Add `.gitignore` handling for machine-local workspace state
- [ ] 2.11 Register created workspaces in the local workspace registry
- [ ] 2.12 Add tests for native Windows/PowerShell and WSL2-compatible path construction where practical

## 3. Non-Interactive Setup

- [ ] 3.1 Add `workspace setup --no-interactive --name <name> --link <path>` support
- [ ] 3.2 Support repeated `--link` values
- [ ] 3.3 Support `--link <path>` with inferred names
- [ ] 3.4 Support `--link <name>=<path>` with explicit names
- [ ] 3.5 Fail cleanly when non-interactive setup is missing a name or at least one link
- [ ] 3.6 Add `--json` output for non-interactive setup
- [ ] 3.7 Preserve the interactive setup UX when `--no-interactive` is not passed

## 4. Workspace Listing

- [ ] 4.1 Implement `openspec workspace list`
- [ ] 4.2 Add `workspace ls` as an alias for `workspace list`
- [ ] 4.3 List known OpenSpec-managed workspaces from the local workspace registry
- [ ] 4.4 Handle the no-workspaces case with a clear next step
- [ ] 4.5 Show each workspace path and linked repos/folders
- [ ] 4.6 Report stale registry entries without doing deep doctor validation
- [ ] 4.7 Add JSON output for scripts

## 5. Workspace Selection

- [ ] 5.1 Make workspace commands work from outside workspace directories
- [ ] 5.2 Add `--workspace <name>` to commands that need one workspace
- [ ] 5.3 Use the current workspace when running from inside a workspace
- [ ] 5.4 Show an interactive picker when multiple known workspaces exist and no workspace is specified
- [ ] 5.5 Select the only known workspace automatically when there is exactly one
- [ ] 5.6 Fail clearly in non-interactive mode when workspace selection is ambiguous
- [ ] 5.7 Use the local workspace registry for workspace lookup

## 6. Workspace Links

- [ ] 6.1 Implement `openspec workspace link <path>` with inferred link names
- [ ] 6.2 Implement `openspec workspace link <name> <path>` with explicit link names
- [ ] 6.3 Accept full repo roots and monorepo package/service/app folder paths
- [ ] 6.4 Require linked paths to exist
- [ ] 6.5 Allow links without repo-local `openspec/`
- [ ] 6.6 Store stable link names in shared state and local paths in machine-local state
- [ ] 6.7 Detect duplicate link names with a clear error or interactive rename prompt
- [ ] 6.8 Preserve native Windows and WSL2-style paths as local path values
- [ ] 6.9 Ensure link only records state and does not edit the linked repo/folder
- [ ] 6.10 Add `--json` output for `workspace link`

## 7. Workspace Relinks

- [ ] 7.1 Implement `openspec workspace relink <name> <path>`
- [ ] 7.2 Let users repair or change the local path for an existing link
- [ ] 7.3 Require relink paths to exist
- [ ] 7.4 Keep owner/handoff metadata out of this slice
- [ ] 7.5 Add `--json` output for `workspace relink`
- [ ] 7.6 Return a clear error for unknown link names

## 8. Workspace Doctor

- [ ] 8.1 Implement `openspec workspace doctor`
- [ ] 8.2 Show the workspace root and workspace planning path
- [ ] 8.3 Show linked repos/folders in YAML-like human output with snake_case keys
- [ ] 8.4 Report missing local paths, missing filesystem paths, local-only names, and stale registry entries
- [ ] 8.5 Report `repo_specs_path` when repo-local `openspec/specs` exists and `null` otherwise
- [ ] 8.6 Include suggested fixes for each issue
- [ ] 8.7 Avoid automatic repair behavior
- [ ] 8.8 Add JSON output for scripts

## 9. Documentation And Guidance

- [ ] 9.1 Document setup/list/link/relink/doctor in user-facing product language
- [ ] 9.2 Document linked repos/folders and large-monorepo folder links
- [ ] 9.3 Document that workspace visibility is not change commitment
- [ ] 9.4 Avoid "working set", "code area", "entry", "alias", and "local overlay" in human-facing docs
- [ ] 9.5 Document JSON output support for non-interactive/direct commands
- [ ] 9.6 Document global command behavior, workspace picker behavior, and `--workspace <name>`
- [ ] 9.7 Document that setup controls workspace storage and always shows the workspace path

## 10. Verification

- [ ] 10.1 Run `openspec validate workspace-create-and-register-repos --strict`
- [ ] 10.2 Run targeted command tests for workspace setup/list/link/relink/doctor
- [ ] 10.3 Run targeted tests for links without repo-local OpenSpec and monorepo folder links
- [ ] 10.4 Run targeted tests for JSON output, `ls`, `.gitignore`, non-interactive setup, and required first link
- [ ] 10.5 Run targeted tests for global command selection and local workspace registry behavior
