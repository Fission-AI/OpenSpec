## Context

OpenSpec project config currently provides a top-level `context` value and an artifact-keyed `rules` map. Artifact instruction generation reads both values at runtime, but the apply and archive workflow surfaces do not expose equivalent current inputs.

Apply already has a dynamic instruction command: `openspec instructions apply --change <name>`. Archive skills are generated from static templates and currently have no dedicated runtime-input command. Adding operation-specific advice directly to generated templates would make it stale whenever project config changes.

This change adds a small runtime contract for apply and archive without changing archive execution ownership. The existing single-change archive skill, bulk archive skill, spec sync behavior, and direct `openspec archive` command keep their current flows.

## Goals / Non-Goals

**Goals:**

- Model optional apply and archive working preferences as `operations.<operation>.guidance`.
- Fetch current project context and matching operation guidance whenever apply or archive instructions are requested.
- Return context and operation guidance as separate structured fields.
- Make the single-change and bulk archive skills consume current inputs at execution time.
- Carry current `specs` artifact rules into archive-driven and standalone spec sync whenever concrete delta specs are merged into main specs.
- Preserve existing artifact rules, skill steps, user prompts, and CLI behavior.
- Keep config parsing resilient so malformed operation config does not invalidate unrelated fields.

**Non-Goals:**

- Change archive execution ownership, phases, safety guarantees, or filesystem behavior.
- Change `openspec archive`, its flags, filesystem behavior, or compatibility contract.
- Change semantic spec sync ownership, merge phases, or main-spec format.
- Add new enforceable archive checks or configurable operation checks.
- Make natural-language operation guidance a security or validation boundary.
- Change the structure or meaning of artifact `rules`.
- Generalize semantic spec sync to arbitrary artifact IDs or infer delta specs from non-`specs` artifacts.

## Decisions

### D1: Give operation guidance its own typed namespace

Project config gains this optional shape:

```yaml
context: |
  TypeScript project using pnpm.

rules:
  specs:
    - Preserve requirement IDs when meaning is unchanged.

operations:
  apply:
    guidance:
      - Keep test summaries concise.
  archive:
    guidance:
      - Summarize the archive outcome before finishing.
```

The in-memory model uses explicit operation IDs:

```ts
const OPERATION_IDS = ['apply', 'archive'] as const;
type OperationId = (typeof OPERATION_IDS)[number];

interface OperationConfig {
  guidance?: string[];
}
```

Parsing remains resilient and field-by-field. An invalid operation entry is omitted with a warning without discarding valid context, rules, references, store settings, or other operation entries. Unknown operation IDs and unknown fields receive actionable warnings. Empty guidance strings are removed while non-empty strings retain their original order, line breaks, and Markdown.

Artifact `rules` remain unchanged and are not read as operation guidance.

### D2: Load operation inputs through one shared helper

Apply and archive instruction generation use a shared helper conceptually shaped as:

```ts
loadOperationInputs(projectConfig, operationId): {
  context?: string;
  operationGuidance?: string[];
}
```

The existing root-config loader calls `readProjectConfig()` once for each instruction command and passes that parsed `ProjectConfig` to the helper. The same config snapshot supplies references, context, and operation guidance, so malformed-field warnings are not duplicated and one command cannot mix values from two reads. There is no generated-skill or module-state cache, so the next command observes later config changes.

Absent context and empty guidance are omitted rather than returned as empty values.

### D3: Extend apply output without changing apply state behavior

`generateApplyInstructions()` adds the shared operation inputs to its existing result:

```ts
{
  context?: string;
  operationGuidance?: string[];
}
```

The existing apply state, task progress, missing-artifact checks, context files, references, and schema instruction remain unchanged. JSON serialization includes the new fields automatically. Text output renders project context and operation guidance as distinct advisory sections after the built-in apply instruction content.

The apply skill template lists both fields as runtime inputs, labels them as advisory, and keeps them structurally separate from CLI-returned state, progress, tasks, missing artifacts, context files, and built-in instruction. This change does not modify those CLI-controlled fields or their state transitions. The template tells the agent not to treat context or guidance as task completion, a replacement instruction, or permission to bypass a blocked state, and not to copy their contents into implementation files or planning artifacts. This is prompt guidance rather than an enforcement boundary.

### D4: Add a dedicated archive runtime-input branch

`openspec instructions archive --change <name> --json` is handled as a workflow instruction branch alongside apply. It:

- resolves the selected repo or store using the existing instruction-command options;
- requires and validates the change name so the invocation stays scoped to the intended planning root;
- reads the current config through the shared operation-input helper;
- returns `changeName`, optional `context`, optional `operationGuidance`, and the normal resolved-root envelope;
- does not return a static archive workflow template;
- does not inspect delta specs, update specs, move the change, or invoke `openspec archive`.

Human-readable output shows the same values as labeled advisory sections. If neither value is configured, the command still succeeds with the change and root metadata so skill behavior is uniform.

Keeping this as an instruction surface makes the runtime contract available immediately while leaving archive execution redesign independent.

### D5: Archive and sync skills consume inputs without changing their flow

After resolving the target change and selected root, the single-change archive skill calls:

```bash
openspec instructions archive --change "<name>" --json
```

It uses returned context as project background and archive guidance as optional advice. Built-in archive steps, explicit user choices, target paths, and command flags are not replaced or inferred from guidance.

A successful response may omit both optional fields, which means no archive operation inputs are configured. If the command exits non-zero or does not return valid archive-instruction JSON, the single-change skill reports the error and stops before inspecting or writing specs or moving the change. A failed lookup is never treated as an empty successful response.

The bulk archive skill makes the same call once for the selected root, using one selected change to establish context, and applies the returned inputs across that batch. If this lookup exits non-zero or returns invalid archive-instruction JSON, the skill reports the error and stops the batch before inspecting or writing specs or moving any change. It does not change the existing bulk conflict analysis or archive orchestration.

Semantic spec sync keeps its existing artifact contract. The concrete delta spec paths are exactly `artifactPaths.specs.existingOutputPaths` from the selected change's status output. If `artifactPaths.specs` is absent or its concrete output list is empty, that change has no delta specs for this workflow: archive continues without a spec-sync prompt, standalone sync reports that there is nothing to sync, and neither workflow infers delta specs from other artifacts.

When concrete `specs` outputs exist and a write-producing sync will run:

1. Use the same selected change and planning root that supplied the status result.
2. Call `openspec instructions specs --change "<name>" --json` once immediately before the semantic merge.
3. Apply only its returned artifact rules to the main specs produced by that merge.
4. Keep those rules separate from archive operation guidance and unrelated workflow steps.

A valid artifact-instruction response that omits `rules` means that no `specs` rules are configured and the existing semantic merge continues. A non-zero exit or a response that is not valid artifact-instruction JSON is a lookup failure, not an empty rule set. Single-change archive and standalone sync report that error and stop before modifying any main spec; archive also stops before moving the change.

The single-change archive skill fetches this specs-instruction snapshot after sync has been selected and immediately before invoking inline semantic sync. The bulk archive skill resolves every required specs-instruction snapshot after its sync decisions but before the first main-spec write; if any lookup fails, it reports the affected change and stops the whole batch before writing any main spec or moving any change. Archive passes each successful specs-rule snapshot into the inline sync workflow, which reuses it without fetching the same instructions again. When the sync skill is invoked directly, with no archive-supplied snapshot, it fetches current `specs` instructions itself.

For a mixed-schema batch, this decision is made independently for each change. A change whose resolved schema exposes concrete `artifactPaths.specs.existingOutputPaths` participates in spec sync and receives that change's current `specs` rules. A change whose schema has no `specs` artifact, such as a research/design/plan workflow, has no spec sync and continues through the existing archive path.

Artifact rules are not returned from the archive operation-input surface, relabeled as archive guidance, or applied to unrelated archive steps.

The archive, bulk archive, and sync templates retain the existing rule that runtime context, operation guidance, and rule text must not be copied verbatim into specs, change artifacts, summaries, or other files unless the user separately asks for that content. Artifact rules constrain the produced artifact without becoming artifact content.

### D6: Keep enforcement claims within the current scope

Operation guidance is prompt input, not an enforcement mechanism. This change guarantees that OpenSpec validates its config shape, keeps guidance separate from CLI-controlled fields, delivers current values through the documented instruction surfaces, and leaves existing CLI checks unchanged.

Existing checks continue to run wherever the current CLI already owns them. Skill templates label operation guidance as advisory and state the intended precedence, but do not claim that prompt text can force agent compliance. Any invariant that must be non-bypassable belongs in a real CLI check and remains outside this change; stronger archive guarantees require a separate archive execution design.

## Risks / Trade-offs

- **Guidance conflicts with built-in workflow text** -> Keep guidance in a separate field, label it advisory, and leave CLI-controlled state, validation, paths, and command contracts unchanged; do not claim prompt-level enforcement.
- **Generated skills become stale** -> Skills fetch current inputs on every invocation instead of embedding config content.
- **Repo/store roots diverge** -> Instruction commands reuse existing root selection and read one config snapshot from the resolved root.
- **Archive runtime input is mistaken for archive execution** -> Command naming, JSON fields, docs, and tests state that the instruction surface is read-only and performs no archive mutation.
- **Bulk archive spans an unexpected root** -> The skill resolves the batch root first and fetches inputs once for that root; cross-root batching remains outside the current behavior.
- **Artifact rules are mistaken for archive guidance** -> Fetch them only when writing their artifact, keep them out of `operationGuidance`, and test that they do not affect unrelated archive steps.
- **A custom schema has no `specs` artifact** -> Treat it as having no semantic spec-sync input; do not infer delta specs from unrelated artifacts.
- **Archive and inline sync fetch different rule snapshots** -> Archive fetches once and inline sync reuses the supplied specs-rule snapshot; only standalone sync performs its own lookup.
- **A failed instruction lookup is mistaken for absent optional input** -> Require a successful, valid JSON response before continuing; archive-input failures stop before spec inspection or change moves, and specs-instruction failures stop before main-spec writes or change moves.

## Implementation Plan

1. Add typed operation config parsing and tests.
2. Add the shared runtime-input loader using the root command's single parsed config snapshot.
3. Extend apply instruction JSON and text output.
4. Add archive instruction JSON and text output without changing archive execution.
5. Update single-change archive, bulk archive, and standalone sync templates to fetch current `specs` rules when concrete delta specs exist and reuse the same snapshot during inline sync.
6. Update generated config help, documentation, template parity fixtures, and end-to-end coverage.

Rollback is a code revert. The config field is additive, and no archive filesystem format or durable project state changes in this change.

## Open Questions

None.
