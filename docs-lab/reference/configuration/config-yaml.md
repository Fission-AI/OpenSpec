# Project configuration (config.yaml)

> Every field of openspec/config.yaml: the schema, context, and rules this project plans with.

## Location

Each OpenSpec project keeps its config file at `openspec/config.yaml`, in the project root.

## Fields

| Key | Type | Required | Effect |
| --- | --- | --- | --- |
| `schema` | string | Yes | The workflow schema this project's changes follow |
| `context` | string | No | Injected into every artifact's instructions |
| `rules` | map: artifact ID → list of strings | No | Extra rules added to one artifact's built-in guidance |
| `operations` | map: operation → guidance list | No | Advisory guidance for apply and archive work |
| `store` | string | No | Fallback OpenSpec root when this openspec/ is config-only |
| `references` | list | No | Stores whose specs are indexed into instructions |

Invalid fields never fail a command. Each field is validated on its own, and a bad value is dropped with a warning.

What to write in these fields is covered in [Project configuration](../../customize/project-config.md).

### schema

The workflow schema every change in this project follows. Valid values are `spec-driven` or a schema name the project defines. The names are listed in [Schemas](../schemas/index.md).

### context

Free text injected into every artifact's instructions. The limit is 50KB, and a larger value is ignored with a warning.

### rules

Extra rules for one artifact, added to the schema's built-in guidance:

```yaml
rules:
  proposal:
    - Keep proposals under 500 words
```

Artifact IDs are not restricted to the built-in names, so artifacts from custom schemas work as keys.

### operations

Advisory guidance for how apply and archive work is conducted, separate from artifact rules:

```yaml
operations:
  apply:
    guidance:
      - Keep test summaries concise
```

Only `apply` and `archive` are read.

### store

A store id used as the OpenSpec root, consulted only when this openspec/ directory is config-only (no specs/ or changes/). It is a fallback, never an override. The full ladder is [Root resolution](../../multi-repo/stores.md#where-artifacts-get-created-when-using-stores).

### references

Store ids whose specs this project's work draws on. An index of each store's specs (id, summary, fetch command) is added to instructions output. Spec content is never inlined, and root resolution is never affected. An entry is a store id or a map with `id` and an optional `remote` clone source:

```yaml
references:
  - platform-specs
  - id: billing-specs
    remote: git@github.com:acme/billing-specs.git
```

## Example

A filled-in config.yaml:

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  We use conventional commits
  Domain: e-commerce platform

rules:
  proposal:
    - Keep proposals under 500 words
    - Always include a "Non-goals" section
  tasks:
    - Break tasks into chunks of max 2 hours

operations:
  apply:
    guidance:
      - Keep test summaries concise
  archive:
    guidance:
      - Summarize the archive outcome before finishing
```

## Legacy names

`openspec/config.yml` is read as an alias when `config.yaml` does not exist. When both files exist, `config.yaml` wins and `config.yml` is ignored. `openspec init` creates `config.yaml`.
