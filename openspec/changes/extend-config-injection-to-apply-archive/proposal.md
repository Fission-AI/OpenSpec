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
- Keep built-in skill steps, explicit user choices, and existing CLI behavior authoritative over operation guidance.
- Validate the `operations` config field independently so one malformed operation entry does not discard otherwise valid project configuration.

This change does not redesign archive execution or spec sync. The existing archive skill orchestration and `openspec archive` command remain intact.

## Capabilities

### New Capabilities

- `operation-guidance`: define the `operations.<operation>.guidance` config model, resilient validation, advisory semantics, and runtime delivery for apply and archive
- `cli-archive-instructions`: provide current archive operation inputs in structured JSON and readable text form
- `opsx-apply-skill`: consume current apply context and guidance without changing the built-in apply workflow

### Modified Capabilities

- `config-loading`: parse operation guidance independently from existing project-config fields
- `context-injection`: expose the latest project context to apply and archive runtime surfaces in addition to artifact instructions
- `cli-artifact-workflow`: include current context and apply operation guidance in schema-aware apply instruction output
- `opsx-archive-skill`: fetch and apply current archive context and guidance while preserving the existing archive flow
- `opsx-bulk-archive-skill`: fetch archive context and guidance once for a selected archive batch

## Impact

- Project config types, parsing, generated help text, and documentation gain an optional `operations` section.
- Apply JSON and text instruction output gain separate optional `context` and `operationGuidance` fields.
- The apply skill consumes the new fields as advisory runtime inputs while keeping CLI-returned state, tasks, progress, and instructions authoritative.
- `openspec instructions archive --change <name>` becomes a reserved workflow instruction surface and returns current archive inputs without performing archive work.
- Archive skill templates call the runtime surface at execution time and treat returned values as advisory inputs that are not copied into output files.
- Existing artifact rules, artifact instruction output, archive filesystem behavior, direct archive CLI options, spec sync behavior, and bulk archive orchestration remain unchanged.
- Tests cover resilient config parsing, runtime freshness, field separation, selected-root behavior, output rendering, and generated-template parity.
