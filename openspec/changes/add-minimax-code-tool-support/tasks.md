## 1. Stacking and Resolver Foundation

- [x] 1.1 Rebase this change on the latest path-planning work so MiniMax Code composes cleanly with install-scope and command-surface capability changes
- [x] 1.2 Add MiniMax Code tool metadata in `src/core/config.ts`, including its stable tool id and `globalSkillsDir: '.minimax'`
- [x] 1.3 Introduce a shared skill-directory helper that can return either project-local `skillsDir` or user-home global `globalSkillsDir` OpenSpec skill locations
- [x] 1.4 Add focused unit tests for MiniMax Code skill target resolution, including Windows-style user-home fixtures
- [x] 1.5 Update skill-capable tool filtering to treat `skillsDir || globalSkillsDir` as supported while keeping path resolution scope-aware

## 2. Detection and Status

- [x] 2.1 Update configured-tool detection helpers to recognize MiniMax Code from its user-home global managed skill directory
- [x] 2.2 Update available-tool detection so MiniMax Code can appear as already configured during init when its managed skills are present globally
- [x] 2.3 Update version/status helpers to read MiniMax Code generated skill metadata from the user-home global target
- [x] 2.4 Add tests for MiniMax Code detection and version checks without any repo-local `.minimax` directory
- [x] 2.5 Add automatic tests proving MiniMax Code configured-tool detection does not depend on repo-local `.minimax` or `.mavis` directories

## 3. Init and Update Behavior

- [x] 3.1 Extend `openspec init` validation so `--tools minimax-code` is accepted in interactive and non-interactive flows
- [x] 3.2 Update init generation logic to write MiniMax Code OpenSpec skills into `<home>/.minimax/skills` and avoid repo-local fallback directories
- [x] 3.3 Update init summaries and error messages so MiniMax Code is reported as a supported global skills-based integration with clear filesystem failure guidance
- [x] 3.4 Update `openspec update` to refresh MiniMax Code managed skills from `<home>/.minimax/skills` and preserve non-OpenSpec MiniMax files
- [x] 3.5 Add targeted init/update tests covering successful MiniMax Code setup, already-configured refresh, filesystem failure paths, and adapterless delivery behavior
- [x] 3.6 Match Codex's non-destructive user-home behavior: when delivery is `commands`, skip MiniMax Code command generation and do not delete existing MiniMax Code skills from `<home>/.minimax/skills`
- [x] 3.7 Update MiniMax Code skill refresh and cleanup to treat `openspec-*` workflow skill directories as OpenSpec-owned, without requiring generated metadata checks
- [x] 3.8 Add automatic tests proving commands-only init/update leaves existing MiniMax Code global skills intact and does not create repo-local `.minimax` or `.mavis` directories
- [x] 3.9 Add automatic tests proving MiniMax Code refresh overwrites and cleanup removes colliding `openspec-*` skill directories even when generated metadata is missing

## 4. Workspace Skills Behavior

- [x] 4.1 Wire `src/core/workspace/skills.ts` to use the shared skill-directory helper for MiniMax Code rather than requiring project/workspace-local `skillsDir`
- [x] 4.2 Ensure workspace setup can select `minimax-code`, writes skills to `<home>/.minimax/skills`, and reports the resolved global skills path
- [x] 4.3 Ensure workspace update refreshes stored or selected MiniMax Code workspace skills through the global target and avoids workspace-local `.minimax` or `.mavis` fallbacks
- [x] 4.4 For MiniMax Code workspace update, treat `openspec-*` workflow skill directories as OpenSpec-owned without checking generated metadata
- [x] 4.5 Add automatic workspace setup/update tests for MiniMax Code global path resolution, command-delivery skill refresh, no workspace-local fallback directories, and `openspec-*` overwrite/removal behavior

## 5. Documentation and Verification

- [x] 5.1 Update `docs/supported-tools.md` with MiniMax Code, its tool id, and its global skills-based installation behavior
- [x] 5.2 Update `docs/cli.md` to include `minimax-code` in supported `--tools` examples and explain how OpenSpec finds the MiniMax Code install target
- [x] 5.3 Update `docs/commands.md` command syntax guidance with MiniMax Code's skill-based invocation style
- [x] 5.4 Document that repo-local `delivery=commands` skips MiniMax Code command generation and preserves existing global MiniMax Code skills
- [x] 5.5 Run targeted tests for skill-directory helper, detection, init, update, and workspace setup/update behavior
- [x] 5.6 Run the full test suite (`pnpm test`) and resolve regressions
- [x] 5.7 Perform a manual Windows smoke test against a real MiniMax Code installation, confirming `%USERPROFILE%\.minimax\skills` is loaded and `.mavis` compatibility does not require OpenSpec-side path handling
