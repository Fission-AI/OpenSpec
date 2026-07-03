## 1. Implementation

- [x] 1.1 Add `SKILL_ALLOWED_TOOLS = 'Bash(openspec:*)'` and emit `allowed-tools: ${SKILL_ALLOWED_TOOLS}` in the frontmatter built by `generateSkillContent`

## 2. Tests

- [x] 2.1 Regenerate the golden generated-content hashes in `skill-templates-parity.test.ts`
- [x] 2.2 Add a test asserting every deployed skill's generated content contains `allowed-tools: Bash(openspec:*)` (iterates the registry so new skills are covered)
- [x] 2.3 Verify end-to-end: `openspec init --tools claude` emits the field and it parses as the YAML string `Bash(openspec:*)`

## 3. Release

- [x] 3.1 Add a changeset describing the auto-approval
