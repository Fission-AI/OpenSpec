## ADDED Requirements

### Requirement: Codex Review Skill Definition
The `/codex:review` skill SHALL exist in `odoo-claude-code/universal/skills/codex-review/` and delegate code review to the Codex CLI (GPT-5.4).

#### Scenario: Skill triggered
- **WHEN** user runs `/codex:review` or AI harness triggers it via the dual-review gate
- **THEN** the skill spawns the `codex:codex-rescue` agent with a review-specific prompt

#### Scenario: Review prompt content
- **WHEN** the skill constructs the Codex review prompt
- **THEN** it includes: git diff of changed files, project context (language, framework), and instructions to output findings in P0-P3 severity format

### Requirement: Codex Review Output Format
The `/codex:review` skill SHALL produce output compatible with the `/code-review` finding format for synthesis.

#### Scenario: Finding format
- **WHEN** Codex identifies an issue
- **THEN** the finding includes `file`, `line`, `severity` (P0/P1/P2/P3), `category`, and `message`

#### Scenario: Verdict format
- **WHEN** Codex completes review
- **THEN** the output includes a `verdict` field: `"APPROVED"`, `"CHANGES_REQUESTED"`, or `"NEEDS_DISCUSSION"`

### Requirement: Codex Review Independence
The `/codex:review` skill SHALL operate independently from `/code-review` — it MUST NOT read Claude's review results before completing its own review.

#### Scenario: No cross-contamination
- **WHEN** both `/code-review` and `/codex:review` run in parallel
- **THEN** neither reads the other's `.gates/*.json` result file before writing its own

