## 1. Core Config System

- [x] 1.1 Create `src/core/project-config.ts` with ProjectConfigSchema using Zod (for docs and type inference)
- [x] 1.2 Implement `readProjectConfig()` with resilient field-by-field parsing using Zod's `safeParse()`
- [x] 1.3 Add support for both .yaml and .yml extensions (prefer .yaml)
- [x] 1.4 Add 50KB hard limit for context field with size check and warning
- [x] 1.5 Implement `validateConfigRules()` to validate artifact IDs against schema (called during instruction loading)
- [x] 1.6 Implement `suggestSchemas()` with Levenshtein distance fuzzy matching for helpful error messages
- [x] 1.7 Add unit tests for resilient parsing (partial configs, field-level errors with Zod safeParse)
- [x] 1.8 Add unit tests for context size limit enforcement
- [x] 1.9 Add unit tests for .yml/.yaml precedence
- [x] 1.10 Add unit tests for fuzzy schema matching with typos

## 2. Schema Resolution Integration

- [x] 2.1 Update `resolveSchemaForChange()` in `src/utils/change-metadata.ts` to check project config (3rd in precedence)
- [x] 2.2 Update `createNewChange()` in `src/utils/change-utils.ts` to use config schema as default
- [x] 2.3 Add integration tests for schema resolution precedence (CLI → change metadata → config → default)
- [x] 2.4 Add test for project-local schema names in config
- [x] 2.5 Add test for non-existent schema error handling with suggestions

## 3. Context and Rules Injection

- [x] 3.1 Update `loadInstructions()` in `src/core/artifact-graph/instruction-loader.ts` to inject context for all artifacts
- [x] 3.2 Add rules injection logic for matching artifacts only with XML tags and bullet formatting
- [x] 3.3 Add validation call during instruction loading to check artifact IDs in rules
- [x] 3.4 Implement session-level warning cache to avoid repeating same validation warnings
- [x] 3.5 Implement proper ordering: `<context>` → `<rules>` → `<template>`
- [x] 3.6 Preserve multi-line strings and special characters without escaping
- [x] 3.7 Add unit tests for context injection (present, absent, multi-line, special chars)
- [x] 3.8 Add unit tests for rules injection (matching artifact, non-matching, empty array, multiple artifacts)
- [x] 3.9 Add unit tests for validation timing (warnings during instruction load, not config load)
- [x] 3.10 Add unit tests for warning deduplication (same warning shown once per session)
- [x] 3.11 Add integration test verifying full instruction output with context + rules + template

## 4. Interactive Config Creation

- [x] 4.1 Add @inquirer/prompts dependency to package.json
- [x] 4.2 Create `src/core/config-prompts.ts` with ConfigPromptResult interface
- [x] 4.3 Implement `promptForConfig()` function with schema selection prompt
- [x] 4.4 Add multi-line context input prompt with examples and skip option
- [x] 4.5 Add per-artifact rules prompts with checkbox selection and line-by-line input
- [x] 4.6 Implement YAML serialization with proper multi-line string formatting
- [x] 4.7 Add validation and retry logic for prompt errors

## 5. Experimental Setup Integration

- [x] 5.1 Update `artifactExperimentalSetupCommand()` in `src/commands/artifact-workflow.ts` to check for existing config
- [x] 5.2 Add config creation section after skills/commands creation with header and description
- [x] 5.3 Integrate `promptForConfig()` calls with proper flow control
- [x] 5.4 Add Ctrl+C (ExitPromptError) handling - log cancellation message, continue with setup (non-fatal)
- [x] 5.5 Write created config to `openspec/config.yaml` using YAML stringify
- [x] 5.6 Display success summary showing path, schema, context lines, rules count
- [x] 5.7 Show usage examples and git commit suggestion
- [x] 5.8 Handle existing config case with skip message and manual update instructions
- [x] 5.9 Add error handling for file write failures with fallback suggestions
- [x] 5.10 Add test for cancellation behavior (skills/commands preserved, config not created)

## 6. Testing and Documentation

- [x] 6.1 Add end-to-end test: run experimental setup → create config → create change → verify schema used
- [x] 6.2 Add end-to-end test: create config → get instructions → verify context and rules injected
- [x] 6.3 Test backwards compatibility: existing changes work without config
- [x] 6.4 Test config changes are reflected immediately (no stale cache)
- [x] 6.5 Add performance benchmark: measure config read time with typical config (1KB context)
- [x] 6.6 Add performance benchmark: measure config read time with large config (50KB context)
- [x] 6.7 Add performance benchmark: measure repeated reads within single command
- [x] 6.8 Document benchmark results and decide if caching is needed (target: <10ms typical, <50ms acceptable)
- [x] 6.9 If benchmarks fail: implement mtime-based caching with cache invalidation
- [x] 6.10 Update README or docs with config feature examples and schema
- [x] 6.11 Document common artifact IDs for different schemas
- [x] 6.12 Add troubleshooting section for config validation errors
