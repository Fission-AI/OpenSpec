# schema.yaml

> Every field of a schema definition, for reading or writing one.

`schema.yaml` lists the planning files a workflow creates. It also defines their order and the handoff to implementation.

## Location

A project schema lives under `openspec/schemas/<name>/`:

```text
openspec/schemas/review-first/
├── schema.yaml
└── templates/
    ├── proposal.md
    └── tasks.md
```

OpenSpec checks three places for that directory. The first match wins.

| Copy | Directory |
|---|---|
| **1. Project** | `<project>/openspec/schemas/<name>/` |
| **2. User, macOS and Linux** | `~/.local/share/openspec/schemas/<name>/` |
| **2. User, Windows** | `%LOCALAPPDATA%\openspec\schemas\<name>\` |
| **3. Package** | The schemas installed with the CLI |

If `XDG_DATA_HOME` is set, the user directory moves to `$XDG_DATA_HOME/openspec/schemas/<name>/` on every platform.

The directory name is the lookup key used by `--schema`, `config.yaml`, and [`.openspec.yaml`](../configuration/change-metadata.md#schema). If the `name` field differs from the directory name, OpenSpec still uses the directory name for lookup.

[`openspec schema which <name>`](../cli.md#openspec-schema-which) prints the active directory and any lower-priority copies it hides.

## Top-level fields

| Field | Contract |
|---|---|
| `name` | **Required.** A non-empty string stored as the schema name. Lookup still uses the directory name. |
| `version` | **Required.** A positive integer stored as the schema revision. The value doesn't change OpenSpec's behavior. |
| `description` | An optional string printed by `openspec schemas`. With no value, the schema has no description. |
| `artifacts` | **Required.** A non-empty list of [artifact entries](#artifact-fields). |
| `apply` | Optional [apply settings](#apply-fields). With no block, OpenSpec uses the [apply defaults](#apply-defaults). |

## Artifact fields

Each entry under `artifacts` defines one planning file or set of files.

| Field | Contract |
|---|---|
| `id` | **Required.** A unique, non-empty string used in dependencies, project rules, commands, and apply settings. |
| `generates` | **Required.** A relative path or glob telling the agent where to write the artifact inside the change folder. |
| `description` | **Required.** A string that labels the artifact in instructions sent to the agent. |
| `template` | **Required.** A relative path to the artifact's format in the schema's `templates/` folder. |
| `instruction` | Optional guidance telling the agent what content to produce. |
| `requires` | A list of artifact IDs that must be complete first. Default: `[]`. |

### `generates`

The path starts from the change folder. For a change named `add-auth`:

```yaml
generates: proposal.md
```

The artifact goes here:

```text
openspec/changes/add-auth/proposal.md
```

A glob can match several files:

```yaml
generates: specs/**/*.md
```

This matches Markdown files below `openspec/changes/add-auth/specs/`. OpenSpec treats a value containing `*`, `?`, or `[` as a glob.

OpenSpec rejects absolute paths and paths containing a `..` segment.

#### Completion

OpenSpec checks whether the output exists. It doesn't read the file to decide whether the artifact is complete.

| `generates` value | Complete when |
|---|---|
| `proposal.md` | That file exists. |
| `specs/**/*.md` | The glob matches at least one file. |

### `template`

The path starts from the schema's `templates/` folder. In the `review-first` schema:

```yaml
template: proposal.md
```

OpenSpec reads this file:

```text
openspec/schemas/review-first/templates/proposal.md
```

OpenSpec gives the template's contents to the agent as the output format. It doesn't copy the template into the change folder.

OpenSpec rejects absolute paths and paths containing a `..` segment.

### `requires`

- **Dependencies**: every ID in `requires` must name another artifact in the same schema.
- **Ready state**: an artifact becomes ready after all its dependencies are complete.
- **Invalid graphs**: missing IDs, duplicate IDs, and dependency cycles fail validation.
- **Ties**: when several artifacts are ready, their order in `artifacts` decides which one OpenSpec returns first.

## Apply fields

`apply` defines what must exist before implementation starts.

| Field | Contract |
|---|---|
| `requires` | **Required.** A non-empty list of artifacts that must exist before apply instructions become ready. |
| `tracks` | An optional relative path to a Markdown task file in the change folder. Default: `null`. |
| `instruction` | Optional guidance sent to the agent when apply is ready. OpenSpec uses built-in guidance by default. |

Artifact `requires` controls planning order. `apply.requires` controls when apply instructions become ready.

### `tracks`

The path starts from the change folder. For a change named `add-auth`, `tracks: tasks.md` reads:

```text
openspec/changes/add-auth/tasks.md
```

Apply stays blocked if that file is missing or contains no checkbox with task text. OpenSpec counts these checkbox forms:

```markdown
- [ ] Pending task
- [x] Completed task
* [X] Completed task
```

Leading spaces are allowed. The [tasks.md section of the spec-driven page](spec-driven/index.md#tasksmd) defines the stricter format produced by the default schema.

The tracked file drives the apply state:

- **`blocked`**: the file is missing, or no checkbox has task text.
- **`ready`**: at least one tracked task is pending.
- **`all_done`**: every tracked task is checked.

OpenSpec rejects absolute paths and paths containing a `..` segment.

### Apply defaults

| Behavior | Default |
|---|---|
| Required artifacts | Every artifact in the schema |
| Progress tracking | No tracked file |
| Agent guidance | Built-in apply guidance |

## Complete example

```yaml
name: review-first
version: 1
description: Proposal and implementation checklist

artifacts:
  - id: proposal
    generates: proposal.md
    description: Why the change is needed and what it affects
    template: proposal.md
    instruction: |
      Explain the problem, the proposed change, and its impact.
    requires: []

  - id: tasks
    generates: tasks.md
    description: Trackable implementation checklist
    template: tasks.md
    instruction: |
      Break the approved proposal into ordered implementation tasks.
    requires:
      - proposal

apply:
  requires:
    - tasks
  tracks: tasks.md
  instruction: |
    Work through the pending tasks and mark each one complete.
```

## Validation

[`openspec schema validate <name>`](../cli.md#openspec-schema-validate) checks:

- Field types and required fields
- Relative paths
- Artifact IDs, dependencies, and cycles
- Template files

Validation doesn't catch these mistakes:

| Mistake | What happens |
|---|---|
| A field is misspelled, such as `instrution` | OpenSpec ignores it. Validation doesn't report the typo. |
| `apply.requires` names an unknown artifact ID | Validation doesn't report the unknown ID. |
| `name` differs from the schema directory | Validation passes. OpenSpec still uses the directory name for lookup. |
