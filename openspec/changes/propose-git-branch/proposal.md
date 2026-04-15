## Why

When starting a new change, developers typically also want to work on an isolated git branch for that change. Currently, users must manually create and checkout a git branch after running `openspec new change`, which adds friction to the workflow start.

## What Changes

- Add an optional `--branch` flag to the `openspec new change` command
- When `--branch` is provided, automatically create and checkout a git branch named after the change (e.g., `openspec/propose-git-branch`)
- If the branch already exists, fail with a clear error message
- If the working directory is not a git repository, fail with a clear error message
- Works cross-platform (macOS, Linux, Windows) using Node.js child process instead of shell-specific commands

## Capabilities

### New Capabilities

- `new-change-git-branch`: Optional `--branch` flag for `openspec new change` that creates and checks out a git branch named after the change, enabling a one-step workflow start.

### Modified Capabilities

<!-- No existing spec-level requirement changes. The change-creation spec covers programmatic API; this feature adds a CLI flag and git side-effect which is a new capability. -->

## Impact

- `src/commands/workflow/new-change.ts`: Add branch creation logic and git operations
- `src/cli/index.ts`: Add `--branch` flag to the `new change` command definition
- New tests for the git branch creation feature
- Cross-platform: uses Node.js `child_process` with `git` binary (available on all platforms where git is installed)
