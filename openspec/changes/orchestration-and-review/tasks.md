## 0. Shared Contract (T0 — must complete before parallel work)

- [x] 0.1 [domain: core] Add `OrchestrationDeclSchema` to `src/core/plugin/types.ts` — `parallel_with: z.array(z.string()).optional()`, `preferred_mode: z.enum(['default','subagents','teams']).optional()`. Add to both `GateDefinitionSchema` and `HookDefinitionSchema`.
- [x] 0.2 [domain: core] Create `src/core/orchestration/types.ts` — define `OrchestrationHints`, `TaskGroup`, `GateOrchestration`, `HookOrchestration`, `ParallelGroup`, `ResolvedOrchestration` interfaces.
- [x] 0.3 [domain: core] Add schema orchestration types to `src/core/artifact-graph/types.ts` — `PhaseOrchestration` with `parallel_groups` array containing `gates/hooks: string[]`, `parallel: boolean`, `mode?: string`, `synthesis?: string`.
- [x] 0.4 [domain: test] Write unit tests for new Zod schemas in `test/core/plugin/types.test.ts` — valid orchestration, invalid preferred_mode, missing parallel_with.

## 1. CLI Orchestration Engine (Sub-Change 1: openspec-fork)

- [x] 1.1 [domain: core] Create `src/core/orchestration/group-builder.ts` — parse `## N.` section headers from tasks.md into `TaskGroup[]` with intra-group `parallel: true`, default `depends_on: [N-1]`, and `<!-- parallel-with: N -->` comment parsing for explicit inter-group parallelism.
- [x] 1.2 [domain: core] Create `src/core/orchestration/domain-parser.ts` — extract `[domain: X]` tags from task lines, build `domains: Record<string, string[]>` per group.
- [x] 1.3 [domain: core] Create `src/core/orchestration/resolver.ts` — two-layer merge: read plugin `parallel_with` declarations, read schema `orchestration.parallel_groups`, merge with resolution matrix, emit warnings.
- [x] 1.4 [domain: core] Create `src/core/orchestration/index.ts` — export public API: `buildTaskGroups()`, `parseDomainTags()`, `resolveOrchestration()`.
- [x] 1.5 [domain: core] Add `--subagents` and `--teams` flags to `openspec instructions` commands in `src/cli/index.ts` — mutually exclusive, pass to instructions generator.
- [x] 1.6 [domain: core] Extend `ApplyInstructions` in `src/commands/workflow/shared.ts` — add `orchestration: OrchestrationHints` field.
- [x] 1.7 [domain: core] Update `generateApplyInstructions()` in `src/commands/workflow/instructions.ts` — call `buildTaskGroups()`, `resolveOrchestration()`, include hints in output.
- [x] 1.8 [domain: core] Update schema YAML parser in `src/core/artifact-graph/instruction-loader.ts` — read `orchestration` section from phase definitions.
- [x] 1.9 [domain: test] Write unit tests for `group-builder.ts` — section grouping, no-section fallback, cross-platform line endings, `<!-- parallel-with -->` parsing, default depends_on chain.
- [x] 1.10 [domain: test] Write unit tests for `domain-parser.ts` — tag parsing, multiple domains, no-tag fallback.
- [x] 1.11 [domain: test] Write unit tests for `resolver.ts` — all resolution matrix cases, bidirectional check, warning emission, schema override.
- [x] 1.12 [domain: test] Write integration test for `instructions apply --teams --json` — verify full orchestration output structure.

## 2. Parallel Dispatch (Sub-Change 1: openspec-fork)

- [x] 2.1 [domain: core] Update `src/core/plugin/hook-dispatcher.ts` — add `buildParallelGroups()` function, modify `dispatchHooks()` to accept `orchestrationMode`, run command-type hooks via `Promise.all()` within parallel groups, return prompt-type hooks as `pending` with `parallel_group` metadata.
- [x] 2.2 [domain: core] Extend `HookResult` and `HookPendingResult` interfaces — add `parallel_group?: string[]` field.
- [x] 2.3 [domain: core] Update `src/core/validation/gate-checker.ts` — add parallel gate group support, split command/prompt execution, write results to `.gates/` directory using `path.join()`.
- [x] 2.4 [domain: core] Create gate result persistence logic — write/read `.gates/<gate-id>.json` and `.gates/synthesis.json` to change directory.
- [x] 2.5 [domain: test] Write unit tests for parallel hook dispatch — command parallel, prompt pending, mixed, sequential fallback, failure handling.
- [x] 2.6 [domain: test] Write unit tests for parallel gate execution — command parallel, prompt pending, result persistence, cross-platform paths.

## 3. Dual Review Plugin (Sub-Change 2: odoo-claude-code)

- [x] 3.1 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/dual-review/plugin.yaml` — two gates with `orchestration.parallel_with`, `apply.post` hook, config with `max_loops` and `synthesis`.
- [x] 3.2 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/dual-review/gates/claude-review.md` — prompt template with `{{change_name}}`, `{{change_dir}}`, `{{changed_files}}`, instructions to run `/code-review` and output structured findings.
- [x] 3.3 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/dual-review/gates/codex-review.md` — prompt template instructing AI harness to spawn Codex agent for independent review.
- [x] 3.4 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/dual-review/gates/synthesis.md` — prompt template for merging findings, deduplication logic, verdict synthesis.
- [x] 3.5 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/dual-review/overlays/apply-review.md` — skill overlay injected into apply skill describing the hard review gate.

## 4. Alignment Check Plugin (Sub-Change 2: odoo-claude-code)

- [x] 4.1 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/alignment-check/plugin.yaml` — two gates, `propose.post` hook, config with thresholds.
- [x] 4.2 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/alignment-check/gates/structural.js` — Node.js script: parse proposal capabilities → glob specs dirs → compute goal_coverage; parse spec requirements → scan tasks.md → compute requirement_task_ratio; count scenarios → count test tasks → compute scenario_test_ratio; detect orphan tasks. Output JSON, exit 0/1.
- [x] 4.3 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/alignment-check/gates/semantic.md` — prompt template with `{{command_output}}` (structural results), instructions for LLM semantic evaluation.
- [x] 4.4 [domain: plugin] Create `plugins/odoo-dev/openspec-plugins/alignment-check/overlays/propose-alignment.md` — skill overlay for propose skill.

## 5. Codex Review Skill (Sub-Change 2: odoo-claude-code)

- [x] 5.1 [domain: plugin] Create `universal/skills/codex-review/codex-review.md` — skill definition with frontmatter, trigger description, review prompt construction, output format spec (P0-P3 + verdict).

## 6. Schema Integration

- [x] 6.1 [domain: core] Update `schemas/odoo-workflow/schema.yaml` — add `orchestration.parallel_groups` for `apply.post` (claude-review + codex-review, require-both-pass) and `propose.post` (structural → semantic, sequential).
- [x] 6.2 [domain: plugin] Update `openspec/config.yaml` — add `dual-review` and `alignment-check` to the `plugins:` whitelist array so they are loaded at runtime.
- [x] 6.3 [domain: core] Add `.gates/` to project `.gitignore` — gate results are ephemeral execution state, not archival artifacts.

## 7. Documentation

- [x] 7.1 [domain: docs] Update openspec-fork `README.md` — add Orchestration section: flags usage, plugin orchestration declaration examples, schema orchestration override examples, two-layer resolution diagram, gate result persistence.
- [x] 7.2 [domain: docs] Update `plugins/odoo-dev/openspec-plugins/odoo-lifecycle/ORCHESTRATION.md` — reference CLI-native orchestration, update data flow diagram to show hints.

## 8. Cross-Platform Validation

- [x] 8.1 [domain: test] Verify all new file operations use `path.join()` — no hardcoded slashes in orchestration module, gate persistence, or structural alignment script.
