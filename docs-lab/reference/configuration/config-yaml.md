# Project configuration (config.yaml)

> Every field of openspec/config.yaml: the schema, context, and rules this project plans with.

## Location

Each OpenSpec project keeps its config file at `openspec/config.yaml`, in the project root.

## Fields

| Key | Type | Required | Effect |
| --- | --- | --- | --- |
| `schema` | string | Yes | The workflow schema this project's changes follow |
| `context` | string | No | Injected into every artifact, apply, and archive |
| `rules` | map: artifact ID → list of strings | No | Extra rules added to one artifact's built-in guidance |
| `operations` | map: operation → guidance list | No | Advisory guidance for apply and archive work |
| `store` | string | No | Fallback OpenSpec root when this openspec/ is config-only |
| `references` | list | No | Stores whose specs are indexed into instructions |
| `skillsScope` | string: `project` | No | The team keeps OpenSpec's skills in this repo |
| `lifecycle` | map: `actions`, `triggers` | No | Agent actions attached to workflow hooks |

Invalid fields never fail a command. Each field is validated on its own, and a bad value is dropped with a warning. A file that cannot be read or is not valid YAML is ignored with a warning, except by `openspec validate`, which exits 1 so CI catches it.

`lifecycle` is validated strictly instead. See [Validation](#validation).

What to write in these fields is covered in [Project configuration](../../customize/project-config.md).

### schema

The workflow schema every change in this project follows. Valid values are `spec-driven` or a schema name the project defines. Run [`openspec schemas`](../cli.md#openspec-schemas) to list the available schema names.

### context

Free text injected into every artifact's instructions and supplied to apply and archive. The limit is 50KB, and a larger value is ignored with a warning.

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

### skillsScope

`skillsScope: project` records that your team keeps OpenSpec's skills in this repo. `openspec update` writes it when you choose **Keep in this project**, and it stops asking once the file is committed and pulled. To move the repo to the [global skills](../../start/setup.md#move-an-existing-project-to-the-global-skills) later, run `openspec init --scope global`, which also removes this line. Removing the line by hand moves nothing: update asks the question again.

### lifecycle

Named agent actions (`actions`) and the hooks they attach to (`triggers`). OpenSpec returns the matching actions to the skills and commands that ask for a hook, and runs nothing itself. What these actions are for is covered in [Lifecycle actions](../../customize/lifecycle-actions.md).

```yaml
lifecycle:
  actions:
    requirements-review:
      title: Review requirements against the plan
      description: Reread linked requirements and compare them with this change.
      instructions: |
        Read the sources linked from this change's planning artifacts.
        Report conflicts and anything you could not read.
  triggers:
    - on: change.apply.before
      action: requirements-review
      mode: suggest
```

`lifecycle` accepts only the keys `actions` and `triggers`. Both are optional.

#### actions

A map from action id to action. An action id is kebab-case (`requirements-review`).

| Key | Contract |
| --- | --- |
| `instructions` | Required. A non-empty string the agent follows. |
| `title` | Optional. A non-empty string the agent shows when it offers the action. Default: the action id. |
| `description` | Optional. A non-empty string shown with the title. |

#### triggers

A list. Each trigger attaches one action to one hook.

| Key | Contract |
| --- | --- |
| `on` | Required. A hook name: a built-in hook, or a custom hook. |
| `action` | Required. An action id from `lifecycle.actions`. |
| `mode` | Required. `suggest` (offer and wait for the user's answer, then follow only if they accept) or `auto` (follow without asking). |

The built-in hooks are `change.create.before`, `change.apply.before`, `change.apply.completed`, `change.archive.before`, and `change.archive.completed`. A custom hook is `custom.` followed by dot-separated kebab-case segments, such as `custom.security-review.completed`.

Actions at one hook keep the order of their triggers. One action can have triggers on several hooks.

#### Validation

Any of these makes the whole `lifecycle:` block invalid:

- `lifecycle:` written more than once at the top level of the file
- A YAML alias inside `lifecycle:` that can't be loaded, such as `*missing`
- An unknown key at any level, including future fields such as `command:`
- `policy` on a trigger, which is not supported yet
- A duplicate action id, including a duplicate YAML key
- Two triggers with the same `on` and `action`
- A trigger missing `on`, `action`, or `mode`
- A trigger whose `action` names no action in `lifecycle.actions`
- A `mode` other than `suggest` or `auto`
- Missing or empty `instructions`, or an empty `title` or `description`
- An action id that isn't kebab-case
- A hook name that isn't built in and doesn't start with `custom.`, or a malformed custom hook (`custom.`, `custom..foo`, `custom.Foo`)

An invalid block loads no actions:

- `openspec lifecycle actions` exits 1 and lists each problem.
- `openspec validate --all` reports the problems on a failing `config/lifecycle` item and exits 1.
- `openspec instructions create|apply|archive --json` returns `lifecycleError` in place of `lifecycle`. The rest of the output is unchanged.

Every other command ignores the `lifecycle:` block, valid or not.

#### Stores

For a project whose root is a [store](../../multi-repo/stores.md), `lifecycle:` is read from the store's `openspec/config.yaml` only. Repo and store configs are never merged.

A repo `config.yaml` that selects the store with `store:` can't carry `lifecycle:`. A block there is reported as invalid, with a message to move it into the store's config.

## Example

A filled-in config.yaml:

```yaml
schema: spec-driven

context: |
  Designs and tasks must cover Windows, macOS, and Linux
  Write all artifacts in Spanish

rules:
  proposal:
    - Keep proposals under 500 words
    - Always state what is out of scope
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
