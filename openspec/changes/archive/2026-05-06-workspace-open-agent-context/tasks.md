## 1. Preferred Opener State

- [x] 1.1 Add structured `preferred_opener` support to workspace local state parsing and serialization
- [x] 1.2 Support backward-compatible parsing for existing local workspace files while adding `preferred_opener`
- [x] 1.3 Validate supported opener values: `codex`, `claude`, `github-copilot`, and `editor`
- [x] 1.4 Map `editor` to `kind: editor, id: vscode`
- [x] 1.5 Map agent opener values to `kind: agent` with the matching `id`
- [x] 1.6 Add simple executable detection for `code`, `codex`, and `claude`
- [x] 1.7 Add unit tests for preferred opener parsing, serialization, and invalid opener values

## 2. Setup Opener Selection

- [x] 2.1 Add interactive setup prompt for the preferred opener
- [x] 2.2 Show all supported opener choices with detected openers ordered first
- [x] 2.3 Mark unavailable opener choices with a clear availability note
- [x] 2.4 Prefer the plain editor option for setup fallback selection when a fallback is needed
- [x] 2.5 Add `workspace setup --opener <id>` for non-interactive setup
- [x] 2.6 Store a preferred opener during non-interactive setup when `--opener` is provided
- [x] 2.7 Add tests for interactive opener selection and non-interactive `--opener`
- [x] 2.8 Add tests that non-interactive setup with omitted `--opener` leaves opener unset

## 3. Open Surface Sync

- [x] 3.1 Add a shared open-surface sync helper used by setup, link, and relink
- [x] 3.2 Create or refresh root `AGENTS.md` with an OpenSpec-managed workspace guidance block
- [x] 3.3 Preserve user-authored `AGENTS.md` content outside the managed block
- [x] 3.4 Append the managed block to unmarked existing `AGENTS.md` files
- [x] 3.5 Create or refresh `<workspace-name>.code-workspace` at the workspace root
- [x] 3.6 Include the workspace root and every linked repo or folder with a valid local path in the `.code-workspace`
- [x] 3.7 Omit linked repos or folders with missing or invalid local paths from the `.code-workspace`
- [x] 3.8 Refresh `.gitignore` with the specific maintained `<workspace-name>.code-workspace` entry
- [x] 3.9 Scope ignore updates to the maintained `<workspace-name>.code-workspace` file
- [x] 3.10 Add cross-platform tests for `.code-workspace` path construction and Windows-style paths where practical

## 4. Workspace Open Selection

- [x] 4.1 Add `openspec workspace open [name]`
- [x] 4.2 Support `openspec workspace open --workspace <name>` as an alias for the positional name
- [x] 4.3 Fail clearly when positional name and `--workspace` are both provided with different values
- [x] 4.4 Open the current workspace when run from a workspace folder or subdirectory
- [x] 4.5 Auto-select the only known workspace when run outside a workspace
- [x] 4.6 Present an interactive picker when multiple workspaces are known
- [x] 4.7 Report ambiguous workspace selection in non-interactive mode and list known workspace names
- [x] 4.8 Report unresolved workspace selection clearly and suggest `openspec workspace setup`
- [x] 4.9 Handle unsupported `--prepare-only`, `--json`, and `--change` flags with clear errors
- [x] 4.10 Add command integration tests for selection, conflict, unsupported flags, and no-workspace cases

## 5. Opener Resolution

- [x] 5.1 Resolve command-line opener overrides before workspace-local preferences
- [x] 5.2 Implement `workspace open --agent codex`
- [x] 5.3 Implement `workspace open --agent claude`
- [x] 5.4 Implement `workspace open --agent github-copilot`
- [x] 5.5 Implement `workspace open --editor`
- [x] 5.6 Keep the stored preferred opener unchanged for `--agent` and `--editor` overrides
- [x] 5.7 Prompt interactively to choose an opener when the opener preference is unset
- [x] 5.8 Report unset opener preference in non-interactive mode with override guidance
- [x] 5.9 Add tests for opener precedence, prompting, non-interactive failure, and unchanged preference behavior

## 6. Opener Launchers

- [x] 6.1 Launch VS Code editor by opening the maintained `.code-workspace` file with `code`
- [x] 6.2 Launch GitHub Copilot by opening the maintained `.code-workspace` file with VS Code
- [x] 6.3 Launch Codex from the workspace root with valid linked paths attached
- [x] 6.4 Launch Claude from the workspace root with valid linked paths attached
- [x] 6.5 Use a minimal launch prompt when an agent CLI requires an initial prompt argument
- [x] 6.6 Report skipped broken links with `openspec workspace doctor` as the repair path
- [x] 6.7 Fail clearly when the selected opener executable is unavailable
- [x] 6.8 Include the `.code-workspace` path in VS Code opener availability errors
- [x] 6.9 Keep the selected opener as required when launching
- [x] 6.10 Add unit tests for launcher command construction using test doubles for external tools

## 7. Documentation And Command Metadata

- [x] 7.1 Update workspace command help for setup `--opener`, open positional name, `--workspace`, `--agent`, and `--editor`
- [x] 7.2 Update command registry and shell completion metadata for the new workspace open surface
- [x] 7.3 Update workspace documentation to describe preferred openers, editor open, agent open, and `.code-workspace` behavior
- [x] 7.4 Document that `.code-workspace` is machine-local and ignored by default
- [x] 7.5 Document that root workspace open supports exploration and planning, with implementation started by explicit user request

## 8. Verification

- [x] 8.1 Run `node bin/openspec.js validate workspace-open-agent-context --strict`
- [x] 8.2 Run targeted workspace command tests
- [x] 8.3 Run targeted workspace foundation tests
- [x] 8.4 Run command-generation or launcher tests that cover Codex, Claude, GitHub Copilot, and VS Code editor paths
- [x] 8.5 Run cross-platform path-focused tests for workspace open surfaces
- [x] 8.6 Run the relevant TypeScript test suite
- [x] 8.7 Run `pnpm run build`
