# Tasks

- [ ] 1. Update the CLI tool registry and interactive prompts to list OpenCode as a configurable assistant.
  - [ ] 1.1 Ensure non-interactive selections (flags/env) accept OpenCode identifiers.
- [ ] 2. Extend the slash command configurator to emit OpenCode targets using the shared templates.
  - [ ] 2.1 Generate `.opencode/command/openspec-{proposal,apply,archive}.md` with proper marker placement.
  - [ ] 2.2 Populate descriptive frontmatter while leaving user-editable metadata outside the managed block.
- [ ] 3. Teach `openspec update` to detect and refresh existing OpenCode command files without creating new ones.
  - [ ] 3.1 Log per-file update results alongside other tools.
- [ ] 4. Add automated coverage (or golden fixtures) for OpenCode generation and update flows.
  - [ ] 4.1 Include mixed-tool scenarios where only some commands exist to confirm update skips missing files.
- [ ] 5. Refresh user-facing docs or success messaging that enumerates slash-command capable tools.
