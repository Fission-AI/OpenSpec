## Prerequisites

- [ ] 0.1 Implement `add-per-change-schema-metadata` change first

## 1. Schema Discovery

- [ ] 1.1 Add CLI command or helper to list schemas with descriptions (for agent use)
- [ ] 1.2 Ensure `openspec templates --schema <name>` returns artifact list for any schema

## 2. Update New Change Skill

- [ ] 2.1 Add schema selection prompt using AskUserQuestion tool
- [ ] 2.2 Present available schemas with descriptions (spec-driven, tdd, etc.)
- [ ] 2.3 Pass selected schema to `openspec new change --schema <name>`
- [ ] 2.4 Update output to show which schema/workflow was selected

## 3. Update Continue Change Skill

- [ ] 3.1 Remove hardcoded artifact references (proposal, specs, design, tasks)
- [ ] 3.2 Read artifact list dynamically from `openspec status --json`
- [ ] 3.3 Adjust artifact creation guidelines to be schema-agnostic
- [ ] 3.4 Handle schema-specific artifact types (e.g., TDD's `tests` artifact)

## 4. Update Apply Change Skill

- [ ] 4.1 Make task detection work with different schema structures
- [ ] 4.2 Adjust context file reading for schema-specific artifacts

## 5. Documentation

- [ ] 5.1 Add schema descriptions to help text or skill instructions
- [ ] 5.2 Document when to use each schema (TDD for bug fixes, spec-driven for features, etc.)
