## 1. Type Definitions and Schema

- [x] 1.1 Add `HookEntry` type to `src/core/project-config.ts`: `{ instruction?: string; run?: string }`
- [x] 1.2 Add `HooksConfig` type: record of the eight valid event keys (`pre-propose`, `post-propose`, `pre-explore`, `post-explore`, `pre-apply`, `post-apply`, `pre-archive`, `post-archive`) to `HookEntry | null | undefined`, all optional
- [x] 1.3 Add `VALID_HOOK_EVENTS` constant (array of the eight valid keys) to `src/core/project-config.ts`
- [x] 1.4 Extend `ProjectConfigSchema` Zod object to include `hooks` as an optional field
- [x] 1.5 Update `ProjectConfig` TypeScript type to include `hooks?: HooksConfig`

## 2. Config Parsing

- [x] 2.1 Add `parseHooksField` function in `src/core/project-config.ts` that validates each key against `VALID_HOOK_EVENTS`, warns on unknown keys, and parses each entry's `instruction`/`run` fields resilientely
- [x] 2.2 Call `parseHooksField` in `readProjectConfig` and attach result to partial config object
- [x] 2.3 Verify null/empty hook entries (e.g., `pre-archive:`) are parsed as no-op without warning
- [x] 2.4 Verify that a wrong-type `hooks` field (e.g., `hooks: "string"`) logs a warning and returns other fields intact

## 3. CLI Command: openspec hooks get

- [x] 3.1 Add `hooks` subcommand group to `src/cli/index.ts` (Commander.js)
- [x] 3.2 Add `hooks get <event>` command that accepts `--json` flag
- [x] 3.3 Implement command handler: call `readProjectConfig`, resolve the given event key, output JSON `{ event, instruction, run, exists }`
- [x] 3.4 Validate `<event>` against `VALID_HOOK_EVENTS`; exit with non-zero + error message listing valid events on invalid input
- [x] 3.5 Handle no config / no hooks gracefully: output `{ event, instruction: null, run: null, exists: false }`
- [x] 3.6 Verify `openspec hooks get post-archive --json` returns correct JSON when hook is fully configured
- [x] 3.7 Verify command works cross-platform (use `path.join` / `path.resolve` for project root discovery, not hardcoded slashes)

## 8. Update Existing Spec

- [x] 8.1 Apply delta spec from `openspec/changes/add-config-yaml-hooks/specs/config-loading/spec.md` to `openspec/specs/config-loading/spec.md` (add the two new requirements for hooks field parsing and `ProjectConfig` type)

## 9a. Update Workflow Template Source Files

- [x] 9a.1 Update `src/core/templates/workflows/propose.ts`: add pre-hook step 0 to `getOpsxProposeSkillTemplate().instructions` and `getOpsxProposeCommandTemplate().content`
- [x] 9a.2 Add post-hook block to both propose template strings (before Guardrails)
- [x] 9a.3 Update `src/core/templates/workflows/explore.ts`: add pre/post hook blocks to `getExploreSkillTemplate().instructions`
- [x] 9a.4 Update `getOpsxExploreCommandTemplate().content` in `explore.ts` with pre/post hook blocks
- [x] 9a.5 Update `src/core/templates/workflows/apply-change.ts`: add pre-hook step 0 and post-hook block to both skill and command template strings
- [x] 9a.6 Update `src/core/templates/workflows/archive-change.ts`: add pre-hook step 0 and post-hook block to both skill and command template strings
- [x] 9a.7 Add graceful degradation note to all hook blocks: if `openspec hooks get` exits non-zero (command unavailable), treat as `exists: false` and proceed
- [x] 9a.8 Update SHA-256 hashes in `test/core/templates/skill-templates-parity.test.ts` for all changed template functions
- [x] 9a.9 Update installed SKILL.md files to add graceful degradation note (or re-run `openspec update` equivalent)

## 9. Tests

- [x] 9.1 Add unit tests for `parseHooksField` in `src/core/project-config.test.ts` (or equivalent): valid config, unknown keys, wrong types, null entries, mixed valid/invalid
- [x] 9.2 Add unit tests for `readProjectConfig` hooks integration: config with hooks parses correctly; config without hooks returns undefined
- [x] 9.3 Add CLI integration test for `openspec hooks get`: valid event with configured hook, valid event without hook, invalid event name
- [x] 9.4 Verify tests use `path.join` for all expected path values (cross-platform compliance)
- [x] 9.5 Run full test suite (`pnpm test`) and confirm no regressions
