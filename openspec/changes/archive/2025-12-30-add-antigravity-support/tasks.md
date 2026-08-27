## 1. CLI init support
- [x] 1.1 Surface Antigravity in the native-tool picker (interactive + `--tools`) so it toggles alongside other IDEs.
- [x] 1.2 Generate `.agent/workflows/openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md` with YAML frontmatter restricted to a single `description` field for each stage and wrap the body in OpenSpec markers.
- [x] 1.3 Confirm workspace scaffolding covers missing directory creation and re-run scenarios so repeated init refreshes the managed block.

## 2. CLI update support
- [x] 2.1 Detect existing Antigravity workflow files during `openspec update` and refresh only the managed body, skipping creation when files are missing.
- [x] 2.2 Ensure update logic preserves the `description` frontmatter block exactly as written by init, including case and spacing, and refreshes body templates alongside other tools.

## 3. Templates and tests
- [x] 3.1 Add shared template entries for Antigravity that reuse the Windsurf copy but target `.agent/workflows` plus the description-only frontmatter requirement.
- [x] 3.2 Expand automated coverage (unit or integration) verifying init and update produce the expected file paths and frontmatter + body markers for Antigravity.
