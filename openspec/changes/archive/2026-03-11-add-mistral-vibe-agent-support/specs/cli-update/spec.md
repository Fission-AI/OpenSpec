## MODIFIED Requirements

### Requirement: Tool-Agnostic Updates
The update command SHALL refresh OpenSpec-managed files in a predictable manner while respecting each team's chosen tooling.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** create or refresh the root-level `AGENTS.md` stub using the managed marker block, even if the file was previously absent
- **AND** update only the OpenSpec-managed sections inside existing AI tool files, leaving user-authored content untouched
- **AND** avoid creating new native-tool configuration files (slash commands, CLAUDE.md, etc.) unless they already exist

#### Scenario: Updating configured Mistral Vibe skills
- **WHEN** `.vibe/skills/` contains OpenSpec workflow skills
- **THEN** refresh each existing OpenSpec-managed skill file using the latest templates
- **AND** preserve unmanaged content outside OpenSpec markers where marker-based updates apply
- **AND** skip creating missing Vibe skill or command files during update
