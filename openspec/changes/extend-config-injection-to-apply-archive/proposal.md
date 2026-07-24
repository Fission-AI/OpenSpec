## Why

Project configuration reaches agents while they create OpenSpec artifacts, but apply and archive workflows cannot fetch the same current project context or operation-specific working preferences when they run. Generated skills therefore lack a stable runtime input contract and can become disconnected from later configuration changes.

OpenSpec needs a clear separation between artifact requirements and operation advice. Artifact `rules` continue to describe the artifacts an agent produces, while optional operation guidance describes how an agent should conduct apply or archive work. Both apply and archive should fetch their current inputs from OpenSpec at execution time.

## What Changes

- Add optional `operations.apply.guidance` and `operations.archive.guidance` configuration for additive, advisory instructions about how an agent should perform those operations.
- Keep `rules` artifact-specific and preserve all existing artifact-instruction behavior.
- Extend apply instruction output with separate optional fields for current project context and apply operation guidance.
- Update the apply skill template to consume those current runtime inputs while preserving its existing state-driven workflow.
- Add an archive runtime-input surface through `openspec instructions archive --change <name>` so archive skills can fetch current project context and archive operation guidance when they run.
- Update the single-change and bulk archive skill templates to consume current archive inputs without embedding configuration snapshots in generated skill text.
- Resolve the artifact that owns each concrete delta spec by matching its path against `artifactPaths.<id>.existingOutputPaths` from status output, so custom and mixed-schema workflows do not assume a literal `specs` artifact ID.
- When archive-driven or standalone spec sync creates or updates a spec artifact, fetch that owning artifact's current instructions and apply its artifact rules to the semantic merge. Archive passes its fetched rule snapshot into the inline sync workflow; standalone sync fetches the same inputs itself.
- Keep operation guidance structurally separate from built-in skill steps, explicit user choices, and CLI-controlled behavior without claiming prompt text can enforce precedence.
- Validate the `operations` config field independently so one malformed operation entry does not discard otherwise valid project configuration.

This change does not redesign archive execution or the semantic spec-merge algorithm. The existing archive skill orchestration and `openspec archive` command remain intact.

## Capabilities

### New Capabilities

- `operation-guidance`: define the `operations.<operation>.guidance` config model, resilient validation, advisory semantics, and runtime delivery for apply and archive
- `cli-archive-instructions`: provide current archive operation inputs in structured JSON and readable text form
- `opsx-apply-skill`: consume current apply context and guidance without changing the built-in apply workflow
- `opsx-bulk-archive-skill`: fetch current archive inputs for a selected batch and apply relevant artifact rules during each spec sync

### Modified Capabilities

- `config-loading`: parse operation guidance independently from existing project-config fields
- `context-injection`: expose the latest project context to apply and archive runtime surfaces in addition to artifact instructions
- `cli-artifact-workflow`: include current context and apply operation guidance in schema-aware apply instruction output
- `opsx-archive-skill`: fetch and apply current archive context and guidance, and carry artifact rules into archive-driven spec sync, while preserving the existing archive flow
- `specs-sync-skill`: resolve the owning artifact and apply its current rules during standalone sync, while reusing an archive-supplied rule snapshot when invoked inline

## Impact

- Project config types, parsing, generated help text, and documentation gain an optional `operations` section.
- Apply JSON and text instruction output gain separate optional `context` and `operationGuidance` fields.
- The apply skill consumes the new fields as advisory runtime inputs while CLI-returned state, tasks, progress, and instructions remain structurally unchanged.
- `openspec instructions archive --change <name>` becomes a reserved workflow instruction surface and returns current archive inputs without performing archive work.
- Archive skill templates call the runtime surface at execution time and treat returned values as advisory inputs that are not copied into output files.
- Archive-driven and standalone spec sync resolve artifact ownership from concrete status paths, fetch current instructions for each owning artifact, and follow its rules without exposing them as operation guidance.
- Inline sync reuses the rule snapshot supplied by archive, avoiding a second fetch with potentially different config or duplicate warnings.
- Existing artifact-rule configuration and instruction output, archive filesystem behavior, direct archive CLI options, semantic merge ownership, and bulk archive orchestration remain unchanged.
- Tests cover resilient config parsing, runtime freshness, single-read config handling, field separation, selected-root behavior, output rendering, owning-artifact resolution, archive and standalone-sync rule consumption, mixed-schema batches, and generated-template parity.
