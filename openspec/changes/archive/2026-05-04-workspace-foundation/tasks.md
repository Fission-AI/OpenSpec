## 1. POC Findings And Model Decisions

- [x] 1.1 Capture the foundation POC findings in the proposal/design artifacts
- [x] 1.2 Settle `.openspec-workspace/` as the workspace metadata directory
- [x] 1.3 Define the minimal workspace root shape and root marker
- [x] 1.4 Define committed workspace state versus machine-local workspace state
- [x] 1.5 Capture that workspace setup is useful only after at least one repo or folder is linked
- [x] 1.6 Capture that repo-owned specs and implementation remain owned by repos
- [x] 1.7 Capture that planning can include repos or monorepo folders without repo-local OpenSpec state
- [x] 1.8 Capture that workspaces hold many changes and are not feature containers
- [x] 1.9 Capture `link`/`relink` as the user-facing model instead of `add-repo`/`update-repo`

## 2. Foundation Helpers

- [x] 2.1 Add workspace path constants and helpers for `.openspec-workspace/`, `workspace.yaml`, `local.yaml`, and root `changes/`
- [x] 2.2 Add workspace root detection from an arbitrary starting directory
- [x] 2.3 Add typed parsing and validation for minimal shared workspace state
- [x] 2.4 Add typed parsing and validation for minimal machine-local workspace state
- [x] 2.5 Ensure repo-local `openspec/` projects are not mistaken for coordination workspaces
- [x] 2.6 Add a standard workspace location resolver using `getGlobalDataDir()/workspaces`
- [x] 2.7 Ensure workspace path helpers use platform path APIs and avoid hardcoded POSIX separators
- [x] 2.8 Add local workspace registry path constants and helpers

## 3. Metadata And Local State

- [x] 3.1 Define the versioned shared-state shape with workspace name and stable link map
- [x] 3.2 Define the versioned local-state shape with stable link names mapped to local paths
- [x] 3.3 Ensure local-state files are treated as machine-local and OpenSpec-created workspaces exclude `.openspec-workspace/local.yaml` from portable collaboration state
- [x] 3.4 Add validation for invalid versions, invalid link names, malformed link maps, and malformed local path maps
- [x] 3.5 Preserve native Windows and WSL2 path strings when reading and writing local path state
- [x] 3.6 Define the versioned local registry shape with workspace names mapped to workspace roots
- [x] 3.7 Ensure the local registry is treated as a convenience index, not the workspace source of truth

## 4. Documentation And Guidance

- [x] 4.1 Document the coordination workspace mental model
- [x] 4.2 Document how `.openspec-workspace/` differs from repo-local `openspec/`
- [x] 4.3 Document stable link names as the way to refer to linked repos and folders
- [x] 4.4 Document which behavior is intentionally deferred to later workspace slices
- [x] 4.5 Document native Windows/PowerShell and WSL2 path behavior for managed workspace storage
- [x] 4.6 Document linked repos/folders without repo-local OpenSpec and large-monorepo planning behavior
- [x] 4.7 Document the local workspace registry and global command model

## 5. Verification

- [x] 5.1 Add unit tests for root detection and non-detection cases
- [x] 5.2 Add unit tests for shared-state and local-state parsing
- [x] 5.3 Add unit tests for standard workspace location resolution with XDG/Linux fallback and native Windows fallback
- [x] 5.4 Add unit tests that local-state parsing preserves native Windows and WSL2-style paths
- [x] 5.5 Add unit tests for repo-local compatibility boundaries
- [x] 5.6 Add tests or docs coverage that linked repos/folders do not require repo-local `openspec/`
- [x] 5.7 Add tests or docs coverage for monorepo folder links under the same workspace model
- [x] 5.8 Add tests for local registry parsing and stale registry entries
- [x] 5.9 Add tests or docs coverage for `.openspec-workspace/local.yaml` exclusion in OpenSpec-created workspaces
- [x] 5.10 Run `openspec validate workspace-foundation --strict`
- [x] 5.11 Run targeted test coverage for the new workspace foundation helpers
