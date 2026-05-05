## 1. Preferred Opener State

- [ ] 1.1 Add structured `preferred_opener` support to workspace local state parsing and serialization
- [ ] 1.2 Preserve existing local workspace files that do not include `preferred_opener`
- [ ] 1.3 Validate supported opener values: `codex`, `claude`, `github-copilot`, and `editor`
- [ ] 1.4 Map `editor` to `kind: editor, id: vscode`
- [ ] 1.5 Map agent opener values to `kind: agent` with the matching `id`
- [ ] 1.6 Add simple executable detection for `code`, `codex`, and `claude`
- [ ] 1.7 Add unit tests for preferred opener parsing, serialization, and invalid opener values

## 2. Setup Opener Selection

- [ ] 2.1 Add interactive setup prompt for the preferred opener
- [ ] 2.2 Show all supported opener choices with detected openers ordered first
- [ ] 2.3 Mark unavailable opener choices with a clear availability note
- [ ] 2.4 Avoid implying a default AI agent during setup
- [ ] 2.5 Add `workspace setup --opener <id>` for non-interactive setup
- [ ] 2.6 Store a preferred opener only when non-interactive setup receives `--opener`
- [ ] 2.7 Add tests for interactive opener selection and non-interactive `--opener`
- [ ] 2.8 Add tests that non-interactive setup without `--opener` leaves opener unset

## 3. Open Surface Sync

- [ ] 3.1 Add a shared open-surface sync helper used by setup, link, and relink
- [ ] 3.2 Create or refresh root `AGENTS.md` with an OpenSpec-managed workspace guidance block
- [ ] 3.3 Preserve user-authored `AGENTS.md` content outside the managed block
- [ ] 3.4 Append the managed block when `AGENTS.md` exists without markers
- [ ] 3.5 Create or refresh `<workspace-name>.code-workspace` at the workspace root
- [ ] 3.6 Include the workspace root and every linked repo or folder with a valid local path in the `.code-workspace`
- [ ] 3.7 Omit linked repos or folders with missing or invalid local paths from the `.code-workspace`
- [ ] 3.8 Refresh `.gitignore` with the specific maintained `<workspace-name>.code-workspace` entry
- [ ] 3.9 Avoid ignoring all `*.code-workspace` files
- [ ] 3.10 Add cross-platform tests for `.code-workspace` path construction and Windows-style paths where practical

## 4. Workspace Open Selection

- [ ] 4.1 Add `openspec workspace open [name]`
- [ ] 4.2 Support `openspec workspace open --workspace <name>` as an alias for the positional name
- [ ] 4.3 Fail clearly when positional name and `--workspace` are both provided with different values
- [ ] 4.4 Open the current workspace when run from a workspace folder or subdirectory
- [ ] 4.5 Auto-select the only known workspace when run outside a workspace
- [ ] 4.6 Present an interactive picker when multiple workspaces are known
- [ ] 4.7 Fail in non-interactive ambiguous selection and list known workspace names
- [ ] 4.8 Fail clearly when no workspace can be resolved and suggest `openspec workspace setup`
- [ ] 4.9 Reject `--prepare-only`, `--json`, and `--change` for this slice
- [ ] 4.10 Add command integration tests for selection, conflict, unsupported flags, and no-workspace cases

## 5. Opener Resolution

- [ ] 5.1 Resolve command-line opener overrides before workspace-local preferences
- [ ] 5.2 Implement `workspace open --agent codex`
- [ ] 5.3 Implement `workspace open --agent claude`
- [ ] 5.4 Implement `workspace open --agent github-copilot`
- [ ] 5.5 Implement `workspace open --editor`
- [ ] 5.6 Ensure `--agent` and `--editor` overrides do not rewrite the stored preferred opener
- [ ] 5.7 Prompt for an opener when no preferred opener exists and the terminal is interactive
- [ ] 5.8 Fail when no preferred opener exists and the terminal is non-interactive
- [ ] 5.9 Add tests for opener precedence, prompting, non-interactive failure, and no preference mutation

## 6. Opener Launchers

- [ ] 6.1 Launch VS Code editor by opening the maintained `.code-workspace` file with `code`
- [ ] 6.2 Launch GitHub Copilot by opening the maintained `.code-workspace` file with VS Code
- [ ] 6.3 Launch Codex from the workspace root with valid linked paths attached
- [ ] 6.4 Launch Claude from the workspace root with valid linked paths attached
- [ ] 6.5 Use only a minimal launch prompt when an agent CLI requires an initial prompt argument
- [ ] 6.6 Report skipped broken links with `openspec workspace doctor` as the repair path
- [ ] 6.7 Fail clearly when the selected opener executable is unavailable
- [ ] 6.8 Include the `.code-workspace` path in VS Code opener availability errors
- [ ] 6.9 Avoid silently falling back to a different opener
- [ ] 6.10 Add unit tests for launcher command construction without spawning real external tools

## 7. Documentation And Command Metadata

- [ ] 7.1 Update workspace command help for setup `--opener`, open positional name, `--workspace`, `--agent`, and `--editor`
- [ ] 7.2 Update command registry and shell completion metadata for the new workspace open surface
- [ ] 7.3 Update workspace documentation to describe preferred openers, editor open, agent open, and `.code-workspace` behavior
- [ ] 7.4 Document that `.code-workspace` is machine-local and ignored by default
- [ ] 7.5 Document that root workspace open is for exploration and planning, not implicit implementation

## 8. Verification

- [ ] 8.1 Run `openspec validate workspace-open-agent-context --strict`
- [ ] 8.2 Run targeted workspace command tests
- [ ] 8.3 Run targeted workspace foundation tests
- [ ] 8.4 Run command-generation or launcher tests that cover Codex, Claude, GitHub Copilot, and VS Code editor paths
- [ ] 8.5 Run cross-platform path-focused tests for workspace open surfaces
- [ ] 8.6 Run the relevant TypeScript test suite
- [ ] 8.7 Run `pnpm run build`
