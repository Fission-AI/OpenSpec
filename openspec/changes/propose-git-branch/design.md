## Context

The `openspec new change <name>` command creates a new change directory but leaves the developer on their current git branch. Developers then manually run `git checkout -b <branch>` to isolate their work. This is a recurring two-step friction point in the workflow.

The codebase already uses Node.js built-in `child_process` (`execSync`, `execFileSync`) for running external commands (see `src/commands/feedback.ts`). No third-party git library is present. The CLI is Commander.js-based (TypeScript, ESM, Node ≥20.19.0) and must run on macOS, Linux, and Windows.

## Goals / Non-Goals

**Goals:**
- Add `--branch` boolean flag to `openspec new change <name>`
- When `--branch` is set, create and checkout a git branch named `openspec/<change-name>` after the change directory is created
- Fail clearly if the working directory is not a git repository
- Fail clearly if the branch already exists
- The change directory creation still succeeds even if git branch creation fails (git step is last)

**Non-Goals:**
- Pushing the branch to remote
- Automatically creating a branch without the explicit `--branch` flag
- Supporting a custom branch name override (the name is always derived from the change name)
- Modifying `git config` or any git settings

## Decisions

### Use `execFileSync` with `git` binary directly

**Decision**: Run git commands via `execFileSync('git', args, { cwd: projectRoot, stdio: 'pipe' })`.

**Rationale**: Consistent with existing pattern in `src/commands/feedback.ts`. `execFileSync` avoids shell injection risks and works cross-platform (Windows, macOS, Linux) as long as `git` is on PATH. No new dependencies needed.

**Alternative considered**: `simple-git` or `execa` — rejected to avoid adding a dependency for what amounts to two git commands.

### Branch naming: `openspec/<change-name>`

**Decision**: Branch name is always `openspec/<change-name>` (e.g., `openspec/propose-git-branch`).

**Rationale**: Using a namespace prefix groups openspec-related branches in git tooling (GitLens, GitHub, etc.) and avoids conflicts with common branch names like `main`, `feature`, `fix`. The `/` is a standard git branch namespace separator.

**Alternative considered**: Using the raw change name (e.g., `propose-git-branch`) — rejected because it risks collisions with existing branch names and provides no namespace context.

### Git detection: `git rev-parse --git-dir`

**Decision**: Before creating the branch, verify the working directory is inside a git repo using `execFileSync('git', ['rev-parse', '--git-dir'], ...)`. If it throws, the directory is not a git repo.

**Rationale**: Simple, fast, cross-platform. Returns `.git` (or the git dir path) on success and exits nonzero on failure.

### Change creation first, git operation second

**Decision**: Create the change directory first, then perform the git branch operation. If git fails, the change directory already exists (acceptable).

**Rationale**: Change directory creation is the primary operation. Git branching is a convenience side-effect. A failed git step should not roll back a successful change creation — the user can create the branch manually.

## Risks / Trade-offs

- **git not on PATH** → Clear error: "git not found. Please ensure git is installed and available on PATH." Unlikely in practice but worth handling.
- **Branch already exists** → Clear error: `Branch 'openspec/<name>' already exists`. User must delete it manually.
- **Detached HEAD state** → `git checkout -b` still works in detached HEAD, so this is not a blocker.
- **Windows path separator in branch name** → Branch name is derived from the kebab-case change name (already validated, only `[a-z0-9-]`), so no slashes or backslashes appear in the name part. The `openspec/` prefix uses a forward slash which git handles correctly on all platforms (git always uses forward slashes for branch namespaces).
