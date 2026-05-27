## 1. Manifest Foundation

- [ ] 1.1 Create canonical workflow manifest registry under `src/core/templates/`
- [ ] 1.2 Define shared manifest types for workflow IDs, skill metadata, and optional command descriptors
- [ ] 1.3 Migrate existing workflow registration (`getSkillTemplates`, `getCommandTemplates`, `getCommandContents`) to derive from the manifest
- [ ] 1.4 Preserve existing external exports/API compatibility for `src/core/templates/skill-templates.ts`

## 2. Tool Profile Layer

- [ ] 2.1 Add `ToolProfile` types and `ToolProfileRegistry`
- [ ] 2.2 Map all currently supported tools to explicit profile entries
- [ ] 2.3 Wire profile lookups to command adapter resolution and skills path resolution
- [ ] 2.4 Replace hardcoded detection arrays (for example `SKILL_NAMES`) with manifest-derived values

## 3. Transform Pipeline

- [ ] 3.1 Introduce transform interfaces (`scope`, `phase`, `priority`, `applies`, `transform`)
- [ ] 3.2 Implement transform runner with deterministic ordering
- [ ] 3.3 Migrate OpenCode command reference rewrite to transform pipeline
- [ ] 3.4 Remove ad-hoc transform invocation from `init` and `update`

## 4. Artifact Sync Engine

- [ ] 4.1 Create shared artifact sync engine for generation planning + rendering + writing
- [ ] 4.2 Integrate engine into `init` flow
- [ ] 4.3 Integrate engine into `update` flow
- [ ] 4.4 Integrate engine into legacy-upgrade artifact generation path

## 5. Validation and Tests

- [ ] 5.1 Add manifest completeness tests (metadata required fields, command IDs, dir names)
- [ ] 5.2 Add tool-profile consistency tests (skillsDir support and adapter/profile alignment)
- [ ] 5.3 Add transform applicability/order tests
- [ ] 5.4 Expand parity tests for representative workflow/tool matrix
- [ ] 5.5 Run full test suite and verify generated artifacts remain stable

## 6. Cleanup and Documentation

- [ ] 6.1 Remove superseded helper code and duplicate write loops after cutover
- [ ] 6.2 Update internal developer docs for template generation architecture
- [ ] 6.3 Document migration guardrails for future workflow/tool additions
