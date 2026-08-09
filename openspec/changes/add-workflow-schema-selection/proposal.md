# Change: Let creation workflows recommend schemas

## Why

OpenSpec already exposes each available schema's name, description, and artifacts through `openspec schemas --json`, but its creation workflows do not use that information. `new` defaults unless the user names a schema, while `propose` and `ff` create the change without a schema-selection step, so multi-schema projects need separate routing instructions.

## What Changes

- Add one shared schema-selection guidance block for the generated `new`, `propose`, and `ff` workflows.
- Apply the same guidance to both skill and slash-command delivery forms.
- When the user has not named a schema, require the Agent to inspect `openspec schemas --json`, reason from existing schema descriptions, recommend one schema, and obtain confirmation before creation.
- Treat an explicitly named schema as confirmed, and allow confirmation to be skipped only when the current request or selected schema description clearly authorizes it.
- Stop instead of using the project default when discovery fails, no schema is available, the recommendation is ambiguous, or the user rejects it.
- Create every change with an explicit `--schema <confirmed-name>` after selection.
- Leave schema files, schema resolution, JSON output, and the `openspec new change` CLI unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `command-generation`: Generated creation workflows now discover, recommend, confirm, and explicitly persist a schema before creating a change.

## Impact

- Source workflow templates for `new`, `propose`, and `ff`.
- One shared workflow-guidance constant modeled after the existing store-selection guidance.
- Three committed generated `SKILL.md` files and generated slash commands produced by `openspec init/update`.
- Focused workflow-template tests, template parity hashes, and skills.sh distribution parity.
