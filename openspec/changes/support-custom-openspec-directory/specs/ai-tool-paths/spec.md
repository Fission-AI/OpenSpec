## ADDED Requirements

### Requirement: Planning relocation does not relocate project-local AI tools

Project-local AI tool skills, commands, prompts, workflows, and managed root stubs SHALL remain anchored to the workspace root when `OPENSPEC_DIR` relocates planning data.

#### Scenario: Tool paths remain at workspace root

- **GIVEN** `OPENSPEC_DIR` selects `ai/openspec`
- **WHEN** init or update generates project-local files for a selected AI tool
- **THEN** those files SHALL remain under the tool's documented workspace-relative path
- **AND** they SHALL NOT be generated beneath `ai/`

#### Scenario: Generated instructions use authoritative planning paths

- **GIVEN** planning data is outside the default root-level `openspec/` directory
- **WHEN** an installed OpenSpec workflow directs an agent to read or write a planning artifact
- **THEN** it SHALL obtain and use the authoritative OpenSpec directory reported by the CLI
- **AND** it SHALL NOT infer the planning path from the workspace or process working directory
