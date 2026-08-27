# Change metadata (.openspec.yaml)

> The supported fields and validation rules for the metadata stored with each change.

## Location

Each change keeps its metadata at `openspec/changes/<change-name>/.openspec.yaml`, next to its artifacts. Creating a change writes the file with `schema` and `created` filled in.

## Fields

| Key | Type | Required | Effect |
| --- | --- | --- | --- |
| `schema` | string | Yes | The workflow schema this change follows |
| `created` | string, YYYY-MM-DD | No | Records the date the change was created |
| `goal` | string | No | Records what the change sets out to do |
| `affected_areas` | list of strings | No | Records the areas the change expects to touch |
| `initiative` | map: `store` and `id` | No | Records the initiative this change belongs to |
| `skip_specs` | boolean | No | Declares the change makes no spec deltas, so zero deltas validate |
| `retire_capabilities` | boolean | No | Authorizes archive to delete a capability this change empties |

### schema

The workflow schema this change follows. It is set when the change is created and wins over the project config, so a change keeps its schema even if `openspec/config.yaml` changes afterwards. Valid names are listed in [Schemas](../schemas/index.md).

### initiative

The initiative this change belongs to, as a store id and an initiative id, both kebab-case:

```yaml
initiative:
  store: platform-specs
  id: unify-billing
```

Keys other than `store` and `id` are rejected. No command reads the link today.

### skip_specs

Declares the change intentionally makes no spec deltas: a pure refactor, tooling, or docs change. With it set, validation accepts zero deltas, and artifacts that would generate spec files count as complete. Setting it while spec files exist under specs/ is a validation error. Its effect on deltas and archive is on [spec-driven](../schemas/spec-driven/index.md).

### retire_capabilities

Authorizes archive to retire a capability. When this change's REMOVED deltas take away the last requirement a capability has, archive deletes that capability's main spec instead of stopping. The flag exists because the deletion is only recoverable from git, so it stays the author's call. The archive behavior is on [spec-driven](../schemas/spec-driven/index.md).

## Example

A filled-in .openspec.yaml:

```yaml
schema: spec-driven
created: 2026-08-14
goal: Add magic-link login to the API
affected_areas:
  - auth
  - api
```

## Validation

The file is validated whenever a command writes or reads it. A write that fails validation throws and writes nothing. Reading an existing file fails on invalid YAML, a field that breaks its contract, or a schema name that is not available. A missing file is not an error, and the change is treated as having no metadata.

Unlike [config.yaml](config-yaml.md), bad values are never dropped with a warning. A metadata error stops the command. The one exception is unknown top-level keys, which are ignored rather than rejected.
