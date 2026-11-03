## 1. Implementation

- [x] 1.1 Add the shared `OPENSPEC_CLI_ALLOWED_TOOLS = 'Bash(openspec:*)'` constant (`src/core/shared/allowed-tools.ts`) and emit `allowed-tools` in the frontmatter built by `generateSkillContent`
- [x] 1.2 Emit the same `allowed-tools` field in the Claude command adapter's frontmatter (`src/core/command-generation/adapters/claude.ts`); other adapters unchanged — no other tool defines a per-command pre-approval field

## 2. Tests

- [x] 2.1 Regenerate the golden generated-content hashes in `skill-templates-parity.test.ts`
- [x] 2.2 Add a test asserting every deployed skill's generated content contains `allowed-tools: Bash(openspec:*)` (iterates the registry so new skills are covered)
- [x] 2.3 Assert the Claude adapter output contains the field (`adapters.test.ts`)
- [x] 2.4 Verify end-to-end: `openspec init --tools claude` emits the field in both SKILL.md and `.claude/commands/opsx/*.md`, and it parses as the YAML string `Bash(openspec:*)`

## 3. Release

- [x] 3.1 Add a changeset describing the auto-approval
