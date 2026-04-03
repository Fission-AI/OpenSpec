## Why

OpenSpec's plugin system supports lifecycle hooks and custom gates, but all execution is sequential. When multiple gates or hooks can run independently (e.g., parallel code reviews by different AI engines), they still run one after another — wasting time and losing the benefit of independent perspectives.

Additionally, there is no mechanism to validate cross-artifact alignment after `/opsx:propose` — proposals can have goals with no matching specs, specs with no implementing tasks, or orphan tasks outside scope. This gap means misalignment is only discovered during implementation.

This change adds CLI-native orchestration hints and two OpenSpec plugins that leverage them: a dual-engine code review gate (Claude + Codex in parallel) and an artifact alignment checker.

## What Changes

- **CLI orchestration layer**: New `--subagents` / `--teams` flags on all workflow phases (propose, apply, verify, archive). CLI analyzes task groups, domain tags, and plugin declarations to output `OrchestrationHints` in the instructions JSON — declaring WHAT can be parallel without dictating HOW.
- **Two-layer orchestration resolution**: Plugins declare parallel capabilities (`parallel_with`); schemas override with project-level decisions. A resolver merges both layers with clear precedence rules.
- **Parallel hook/gate dispatcher**: `hook-dispatcher.ts` and `gate-checker.ts` support parallel execution groups — command-type handlers run via `Promise.all`, prompt-type handlers are marked `pending` for the AI harness.
- **dual-review plugin**: New OpenSpec plugin providing `claude-review` and `codex-review` gates that run in parallel after apply completes, with synthesis logic requiring both to pass.
- **alignment-check plugin**: New OpenSpec plugin providing structural (deterministic) and semantic (LLM) cross-artifact alignment validation after propose completes.
- **`/codex:review` skill**: New Claude Code skill that delegates code review to Codex CLI (GPT-5.4), forming a "dual-engine adversarial review" with `/code-review`.

## Capabilities

### New Capabilities
- `orchestration-hints`: CLI-native orchestration hints system — flags, task group analysis, domain parsing, two-layer resolution (plugin declares, schema overrides), enriched JSON output
- `parallel-dispatch`: Parallel execution support in hook-dispatcher and gate-checker — parallel groups, Promise.all for commands, pending markers for prompts
- `dual-review-gate`: Plugin providing parallel Claude + Codex code review gates with synthesis
- `alignment-check-gate`: Plugin providing structural + semantic cross-artifact alignment validation
- `codex-review-skill`: Claude Code skill for Codex-based code review

### Modified Capabilities
- `artifact-graph`: Add `orchestration` section to schema apply/propose phase definitions

## Impact

- **openspec-fork**: New `src/core/orchestration/` module, modified `plugin/types.ts`, `plugin/hook-dispatcher.ts`, `validation/gate-checker.ts`, `commands/workflow/instructions.ts`, `cli/index.ts`
- **openspec-fork schemas**: `odoo-workflow/schema.yaml` gains orchestration sections
- **odoo-claude-code**: New `dual-review/` and `alignment-check/` plugins under `plugins/odoo-dev/openspec-plugins/`, new `codex-review` skill
- **Cross-platform**: All new code must use `path.join()` — no hardcoded slashes
- **Breaking**: None — orchestration hints are additive; existing workflows without flags behave identically
