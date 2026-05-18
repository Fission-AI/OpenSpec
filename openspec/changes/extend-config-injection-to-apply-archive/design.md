## Context

Project config (`openspec/config.yaml`) supports two injection fields: a top-level `context` string and a `rules` map keyed by artifact ID. Currently, `generateInstructions()` in `instruction-loader.ts` reads both fields and surfaces them in artifact instruction output as `<project_context>` and `<rules>` blocks.

`generateApplyInstructions()` in `src/commands/workflow/instructions.ts` builds apply output from the schema's `apply` block and task progress, but does not read or surface project config. The archive instruction surface is a static template in `src/core/templates/workflows/archive-change.ts`; it is not generated dynamically and receives no config input.

Rule target validation runs in `validateConfigRules()` (`project-config.ts`), which checks each key in `rules` against the schema's known artifact IDs and emits a warning for any unrecognized key. `apply` and `archive` are not currently registered as valid targets, so a user who writes `rules.apply` today gets a spurious warning.

## Goals / Non-Goals

**Goals:**
- Inject project `context` into apply and archive instruction output alongside artifacts.
- Inject `rules.apply` into apply instruction output, and `rules.archive` into archive instruction output.
- Register `apply` and `archive` as known workflow rule targets so `validateConfigRules()` accepts them without warning.
- Keep built-in apply/archive safety behavior (task-progress checks, archive readiness checks) unaffected and higher-priority than injected config guidance.
- Preserve full backward compatibility for all existing artifact rule keys and existing config shapes.

**Non-Goals:**
- Extending injection to `verify` or `sync`.
- Changing the `context` field structure or adding new config fields.
- Making built-in safety checks configurable or bypassable via rules.

## Decisions

### D1: Extend validateConfigRules and introduce emitConfigRuleWarnings

Update `validateConfigRules()` and introduce `emitConfigRuleWarnings()` in `project-config.ts`, both with the signature `(rules, validArtifactIds, schemaName)`. `WORKFLOW_RULE_TARGETS` is a module-level constant in `project-config.ts`; both functions reference it directly rather than accepting it as a parameter. A key is valid if it appears in either `validArtifactIds` or `WORKFLOW_RULE_TARGETS`; only keys absent from both produce a warning. The warning message lists all valid keys — workflow targets and artifact IDs together — so users see the full picture in one message.

`emitConfigRuleWarnings()` calls `validateConfigRules()`, deduplicates warnings against a module-level `shownWarnings` `Set<string>`, and emits each new warning via `console.warn`. Moving the session-level cache into `project-config.ts` means all call sites — artifact, apply, and archive — share one cache, so the same warning is never shown twice regardless of which instruction path runs first.

The `instruction-loader.ts` call site is simplified: remove the old filter-then-call behavior and call `emitConfigRuleWarnings` directly with `(rules, validArtifactIds, schemaName)`. Validation for workflow targets now happens inside `validateConfigRules()` via the shared `WORKFLOW_RULE_TARGETS` constant.

`generateApplyInstructions()` and `generateArchiveInstructions()` call `emitConfigRuleWarnings` after reading config, using artifact IDs from the already-loaded schema.

*Alternative considered:* keeping the filter-then-call pattern and adding separate per-path validation. Rejected — duplicates the dedup logic, risks the session cache diverging between modules, and produces context-inappropriate "Unknown artifact ID" messages in workflow paths.

*Alternative considered:* passing `WORKFLOW_RULE_TARGETS` as a parameter to both functions. Rejected — `WORKFLOW_RULE_TARGETS` is not runtime-variable; it is a fixed protocol constant defined in the same module. Accepting it as a parameter implies caller-controlled flexibility that does not exist and creates unnecessary coupling.

### D2: Extend apply instructions to carry context and rules

The full apply instruction path has three layers that all need updating:

1. **`generateApplyInstructions()`** — add `context` and `rules` to the return type. Call `readProjectConfig()` and extract `context` and `rules.apply`. Config guidance is appended after the built-in content (task list, progress state, schema instruction) so built-in content remains the leading section.

2. **`applyInstructionsCommand()`** — already does `JSON.stringify(instructions)`, so `context` and `rules` appear in JSON output automatically once the return type includes them. No additional change needed here.

3. **`printApplyInstructionsText()`** — add rendering of `<project_context>` and `<rules>` blocks using the same pattern as `printInstructionsText()` for artifacts.

*Alternative considered:* inline config text directly into the instruction string inside `generateApplyInstructions()`. Rejected — mixes data with presentation, prevents callers from filtering or reformatting independently.

### D3: Add archive instruction generation as a new CLI path

`openspec instructions archive` currently falls into the CLI handler's else branch and calls `instructionsCommand('archive', ...)`, which looks for an artifact named `archive` in the schema and fails. Archive needs its own generation path analogous to apply:

1. **CLI handler** — add an `archive` branch alongside the existing `apply` branch, routing to a new `archiveInstructionsCommand()`. The `--change` option is required for archive instructions so the schema can be resolved for full rule key validation.

2. **`generateArchiveInstructions(projectRoot, changeName)`** — accepts a required `changeName`, loads the change context to resolve the schema and artifact IDs, reads project config, retrieves the static archive template via `getArchiveChangeSkillTemplate()`, calls `emitConfigRuleWarnings`, and returns `{ template, context?, rules? }` with `context` and `rules.archive` as separate fields.

3. **`archiveInstructionsCommand()`** — mirrors `applyInstructionsCommand()`: calls `generateArchiveInstructions()`, serializes to JSON with `--json`, or calls `printArchiveInstructionsText()` for text output.

4. **`printArchiveInstructionsText()`** — renders the static template content followed by `<project_context>` and `<rules>` blocks, keeping the built-in template text as the leading section.

*Alternative considered:* making `--change` optional and skipping artifact ID validation when absent. Rejected — archive is always scoped to a specific change, requiring `--change` is consistent with the apply command and enables complete validation without special-casing.

*Alternative considered:* embed placeholders inside the static template string. Rejected — brittle string interpolation in a long template is harder to test and couples the template to the injection mechanism.

### D4: Config guidance placement preserves built-in priority

Built-in behavior (archive readiness checks in `ArchiveCommand.execute()`, apply state computation in `generateApplyInstructions()`) runs first and its output is emitted before any config guidance. Config context and rules are a trailing addendum. This means:

- Built-in safety preconditions (all tasks done, specs synced) are hard checks in `ArchiveCommand.execute()` — config rules cannot suppress or override them.
- The instruction text the user sees leads with the built-in contract, followed by project-specific guidance.

### D5: Skill templates explicitly surface injected fields as AI constraints

The three workflow skill templates need to tell the AI agent what to do with the `context` and `rules` fields returned by instruction commands. The templates are the authoritative source of agent behavior — generated command files are derived from them.

- **`apply-change.ts`** — add `context` and `rules` to the Step 3 JSON field list so the agent knows to expect them; add a constraint stating the agent must apply them as behavioral guidance without copying their content into any output file.
- **`archive-change.ts`** — add a new step before the main archive steps: call `openspec instructions archive --change "<name>" --json` and consume the returned `context` and `rules` as constraints for the entire workflow. Built-in readiness checks (artifact completion, task completion, spec sync) are still executed regardless.
- **`bulk-archive-change.ts`** — add a one-time call to `openspec instructions archive --change "<first-change>" --json` at the start of the batch; any change name in the batch may be used since archive instructions depend only on project-level config; apply the returned `context` and `rules` as constraints across all changes. Call is made once, not once per change.

*Alternative considered:* patch generated command files directly. Rejected — generated files are overwritten by `openspec sync` and would lose the changes.

### D6: Workflow targets documented inline in generated config

`config-prompts.ts` generates the initial `openspec/config.yaml` via `serializeConfig()`. The `rules` comment block currently shows only artifact-key examples (`proposal`, `tasks`). Adding `apply` and `archive` as commented examples in the same block ensures users discover workflow targets alongside artifact targets without requiring separate documentation.

The same comment block is the single place to update; no separate documentation file or migration guide change is needed for discoverability.

## Risks / Trade-offs

**Validation warning surfacing for apply/archive** — `generateApplyInstructions()` and `generateArchiveInstructions()` now call `emitConfigRuleWarnings()` directly after reading config. Both paths have the schema loaded (apply already loaded it; archive loads it via the required `changeName`), so artifact IDs are always available for complete validation. The shared `shownWarnings` cache in `project-config.ts` prevents duplicate warnings across paths in the same session.

**`validateConfigRules` call site timing** — validation runs at instruction-generation time when both artifact IDs (from schema) and workflow targets (`WORKFLOW_RULE_TARGETS`) are known. All three paths (artifact, apply, archive) call `emitConfigRuleWarnings` at that point; no earlier validation stage is needed.

**`readProjectConfig` called independently for apply and archive** — config is read per instruction generation call. Two separate invocations each read the file; this matches existing artifact behavior and is acceptable for typical usage.
→ No change needed.

**Static archive template length** — the archive template is a long string. Appending config guidance as a separate labeled section (rather than modifying the template internals) keeps the template itself stable and avoids formatting surprises.
→ Design already accounts for this via the wrapper approach in D3.

## Open Questions

None — proposal scope and alfred's implementation constraints (no artifact-rule warnings for workflow targets; built-in safety prompts outrank config guidance) are fully addressed by D1–D4.
