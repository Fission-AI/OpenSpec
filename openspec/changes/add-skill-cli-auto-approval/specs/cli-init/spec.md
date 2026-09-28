## MODIFIED Requirements

### Requirement: Skill Generation

The command SHALL generate Agent Skills for selected AI tools.

#### Scenario: Generating skills for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 9 skill directories under `.<tool>/skills/`:
  - `openspec-explore/SKILL.md`
  - `openspec-new-change/SKILL.md`
  - `openspec-continue-change/SKILL.md`
  - `openspec-apply-change/SKILL.md`
  - `openspec-ff-change/SKILL.md`
  - `openspec-verify-change/SKILL.md`
  - `openspec-sync-specs/SKILL.md`
  - `openspec-archive-change/SKILL.md`
  - `openspec-bulk-archive-change/SKILL.md`
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

#### Scenario: Pre-approving the OpenSpec CLI in skill frontmatter

- **WHEN** generating a skill's YAML frontmatter
- **THEN** the frontmatter SHALL include an `allowed-tools` field with the value `Bash(openspec:*)`
- **AND** an agent that honors `allowed-tools` SHALL run `openspec` commands from the skill without prompting for approval
- **AND** because `allowed-tools` pre-approves rather than restricts, any other tool the skill uses SHALL remain available under the user's existing permission settings
