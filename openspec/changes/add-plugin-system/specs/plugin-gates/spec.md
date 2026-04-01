## ADDED Requirements

### Requirement: Plugin-provided gate types

Plugins SHALL be able to register custom gate types that can be referenced in schema `apply.gates` definitions.

#### Scenario: Plugin registers a gate type
- **WHEN** a plugin's `plugin.yaml` contains `gates: [{ id: "codex-review", handler: { type: "both", run: "codex review ...", file: "gates/interpret.md" } }]`
- **THEN** the gate type "codex-review" becomes available for use in `schema.yaml`'s `apply.gates.pre` or `apply.gates.post`

#### Scenario: Schema references plugin gate
- **WHEN** a schema's `apply.gates.post` contains `check: "codex-review"`
- **AND** a loaded plugin provides the "codex-review" gate type
- **THEN** the gate checker delegates to the plugin's gate handler

#### Scenario: Schema references unknown gate type
- **WHEN** a schema's `apply.gates.post` contains `check: "unknown-gate"`
- **AND** no loaded plugin provides "unknown-gate"
- **AND** "unknown-gate" is not a built-in gate type
- **THEN** the system reports an error identifying the unknown gate type

### Requirement: Gate handler execution follows hook handler patterns

Plugin gates SHALL use the same handler types (command, prompt, both) as lifecycle hooks.

#### Scenario: Command gate
- **WHEN** a gate has `handler.type: "command"` and `handler.run: "npm test"`
- **THEN** the gate checker executes the command
- **AND** treats exit code 0 as pass, non-zero as fail

#### Scenario: Prompt gate
- **WHEN** a gate has `handler.type: "prompt"` and `handler.file: "gates/review.md"`
- **THEN** the gate checker outputs the prompt for AI agent evaluation
- **AND** the AI agent determines pass/fail based on the prompt instructions

#### Scenario: Both gate
- **WHEN** a gate has `handler.type: "both"`
- **THEN** the gate checker runs the command first, then outputs the prompt with command results

### Requirement: Gate type name uniqueness

Gate type names SHALL be unique across all loaded plugins and built-in gate types.

#### Scenario: Two plugins register same gate type
- **WHEN** plugin "alpha" and plugin "beta" both register gate type "code-review"
- **THEN** the system reports an error identifying the conflict
- **AND** neither plugin's gate is loaded for that type
