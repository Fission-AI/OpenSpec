## 1. CLI init support
- [x] 1.1 Surface Amp in the native-tool picker (interactive + `--tools`) so it toggles alongside other IDEs.
- [x] 1.2 Generate `.agents/skills/openspec-proposal/SKILL.md`, `.agents/skills/openspec-apply/SKILL.md`, and `.agents/skills/openspec-archive/SKILL.md` with YAML frontmatter containing `name` and `description` fields for each stage and wrap the body in OpenSpec markers.
- [x] 1.3 Confirm workspace scaffolding covers missing directory creation and re-run scenarios so repeated init refreshes the managed block.

## 2. CLI update support
- [x] 2.1 Detect existing Amp skill files during `openspec update` and refresh only the managed body, skipping creation when files are missing.
- [x] 2.2 Ensure update logic preserves the `name` and `description` frontmatter block exactly as written by init, including case and spacing, and refreshes body templates alongside other tools.

## 3. Templates and tests
- [x] 3.1 Add AmpSlashCommandConfigurator that reuses the shared proposal/apply/archive templates but targets `.agents/skills/` and includes the proper frontmatter.
- [x] 3.2 Register the configurator in the slash command registry.
- [x] 3.3 Expand automated coverage (unit or integration) verifying init and update produce the expected file paths and frontmatter + body markers for Amp.
