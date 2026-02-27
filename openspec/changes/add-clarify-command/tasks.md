## 1. Core Skill Template Implementation

- [x] 1.1 Create `getClarifyChangeSkillTemplate()` function in `src/core/templates/skill-templates.ts` with complete skill template structure
- [x] 1.2 Add skill metadata (name: "openspec-clarify", description, license: MIT, compatibility, author: "openspec", version: "2.0")
- [x] 1.3 Implement Step 1 instructions: Change selection workflow with auto-detection and prompt fallback
- [x] 1.4 Implement Step 2 instructions: Status validation using `openspec status --change --json` to verify specs exist
- [x] 1.5 Implement Step 3 instructions: Spec artifact loading from `specs/**/*.md` pattern
- [x] 1.6 Implement Step 4 instructions: Ambiguity scanning with 10-category taxonomy (functional scope, data model, UX flow, non-functional, integration, edge cases, constraints, terminology, completion signals, placeholders)
- [x] 1.7 Implement Step 5 instructions: Question queue generation with prioritization (max 5 questions, prioritize by blocking potential)
- [x] 1.8 Implement Step 6 instructions: Interactive Q&A loop with multiple-choice (recommendation tables) and short-answer formats
- [x] 1.9 Implement Step 7 instructions: Incremental spec integration with `## Clarifications` section and timestamped sessions
- [x] 1.10 Implement Step 8 instructions: Coverage summary reporting with resolved/deferred/outstanding breakdown by category

## 2. Template Export and Access

- [x] 2.1 Export `getClarifyChangeSkillTemplate` from `src/core/templates/index.ts`
- [x] 2.2 Verify function returns valid `SkillTemplate` object with correct TypeScript types

## 3. Documentation Updates

- [x] 3.1 Add `/opsx:clarify` command reference to `docs/commands.md` after `/opsx:verify` section with syntax, examples, and usage tips
- [x] 3.2 Add `/opsx:clarify` entry to commands table in `docs/opsx.md`
- [x] 3.3 Document clarify usage in workflow patterns in `docs/workflows.md` (e.g., "When specs are ambiguous during planning or implementation")

## 4. Testing and Validation

- [x] 4.1 Test skill template generation by invoking `getClarifyChangeSkillTemplate()` and validating returned structure
- [x] 4.2 Test with real change containing ambiguous specs to verify end-to-end workflow
- [x] 4.3 Verify cross-platform path handling in template instructions (use path.join() references)
- [x] 4.4 Test multiple-choice question format generates valid markdown tables
- [x] 4.5 Test short-answer question format with suggestions
- [x] 4.6 Test incremental spec updates add `## Clarifications` section correctly
- [x] 4.7 Test timestamped session tracking across multiple clarification runs
- [x] 4.8 Test coverage summary reports correctly show resolved/deferred/outstanding by category

## 5. Edge Cases and Error Handling

- [x] 5.1 Test behavior when change has no spec artifacts (should report and terminate)
- [x] 5.2 Test behavior when no ambiguities are found (should report specs are clear and terminate)
- [x] 5.3 Test user deferral of questions (skip/defer commands)
- [x] 5.4 Test early termination before all questions answered (done/stop commands)
- [x] 5.5 Test answer validation for multiple-choice (reject invalid options)
- [x] 5.6 Test answer validation for short-answer (reject empty responses)
- [x] 5.7 Test spec file write failures (error handling and user notification)
- [x] 5.8 Test cross-spec answer propagation when clarification applies to multiple capabilities
