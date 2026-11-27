# lifecycle-actions Specification

## Purpose

Lets a project attach named agent instructions to workflow hooks, and lets agents and orchestrators look up which actions apply at a hook. OpenSpec resolves the actions, and the caller handles them.

## Requirements

### Requirement: Configure lifecycle actions and triggers

The system SHALL let a project declare named lifecycle actions under `lifecycle.actions` in `openspec/config.yaml`, and triggers under `lifecycle.triggers` that attach an action to a hook with a mode. An action has required `instructions` and optional `title` and `description`. A trigger has required `on`, `action`, and `mode`, where mode is `suggest` or `auto`.

#### Scenario: Project configures actions and triggers

- **WHEN** config declares actions under `lifecycle.actions` and triggers under `lifecycle.triggers`
- **THEN** each trigger's action is available at its hook with its mode
- **AND** actions at one hook keep the order of their triggers

#### Scenario: Hook names

- **WHEN** a trigger sets `on`
- **THEN** it accepts the built-in hooks `change.create.before`, `change.apply.before`, `change.apply.completed`, `change.archive.before`, and `change.archive.completed`
- **AND** it accepts custom hooks named `custom.` followed by dot-separated kebab-case segments, such as `custom.security-review.completed`

#### Scenario: Project has no lifecycle block

- **WHEN** config has no `lifecycle:` key
- **THEN** every command behaves as it did before lifecycle actions existed

#### Scenario: Action has no title

- **WHEN** an action sets no `title`
- **THEN** callers receive the action id as its title

### Requirement: Validate lifecycle config strictly

The system SHALL reject a `lifecycle:` block that it cannot apply exactly as written, and SHALL name each problem with its location in the config. Rejected problems include unknown keys at any level, `policy` on a trigger, duplicate action ids (including duplicate YAML keys), a repeated top-level `lifecycle:` key, YAML aliases that cannot be loaded, duplicate `(on, action)` trigger pairs, references to missing actions, missing or unsupported modes, empty `instructions`, non-kebab-case action ids, and invalid hook names.

#### Scenario: Trigger sets policy

- **WHEN** a trigger sets `policy: block`
- **THEN** lifecycle validation fails with an error that `policy` is not supported yet

#### Scenario: Action id appears twice

- **WHEN** `lifecycle.actions` lists the same action id twice
- **THEN** lifecycle validation fails with a duplicate action id error

#### Scenario: Lifecycle block appears twice

- **WHEN** the config has two top-level `lifecycle:` keys
- **THEN** lifecycle validation fails with an error telling the user to combine them into one `lifecycle:` block

#### Scenario: Hook name is mistyped or malformed

- **WHEN** a trigger uses `change.aply.before`, `custom.`, `custom..foo`, or `custom.Foo`
- **THEN** lifecycle validation fails with an invalid hook name error

#### Scenario: Future action field

- **WHEN** an action sets a field this version does not support, such as `command:`
- **THEN** lifecycle validation fails with an unknown key error instead of ignoring the field

#### Scenario: Unrelated commands stay unaffected

- **WHEN** the `lifecycle:` block is invalid, including duplicate keys, a repeated top-level `lifecycle:` key, or YAML aliases inside it that cannot be loaded
- **THEN** `status`, `list`, `archive`, `validate --specs`, `validate --changes`, and single-item validation behave as if the block were absent
- **AND** they still read the rest of the config, such as `context`

#### Scenario: Error names the config file on any platform

- **WHEN** lifecycle validation fails on Windows, macOS, or Linux
- **THEN** the error names the config file using the platform's native path form

### Requirement: Read lifecycle config from the resolved root

The system SHALL read lifecycle config from the resolved OpenSpec root only. When a Store is the resolved root, through `--store <id>` or a repo's `store:` pointer, the Store's config decides, with no merging of repo and Store config. A `lifecycle:` block in a pointer-only repo config SHALL fail instead of being ignored.

#### Scenario: Store selected with --store

- **WHEN** a lifecycle lookup runs with `--store <id>`
- **THEN** actions come from that Store's `openspec/config.yaml`

#### Scenario: Pointer-only repo declares lifecycle

- **WHEN** a repo config contains only `store: <id>` plus a `lifecycle:` block, and that Store is the resolved root
- **THEN** lifecycle lookup fails with an error telling the user to move `lifecycle:` into the Store's config
- **AND** it fails the same way when the `lifecycle:` block contains YAML that cannot be loaded

### Requirement: Look up lifecycle actions

The system SHALL provide `openspec lifecycle actions [--at <hook>] [--store <id>] [--json]` as a read-only lookup that runs nothing and launches no agent. Without `--at`, it lists every configured hook with its actions. With `--at <hook>`, it validates the hook name and returns `{ hook, root, actions }` in trigger order. Each action has `id`, `mode`, `title`, optional `description`, and `instructions`. Failures exit non-zero and never include `actions`.

#### Scenario: Lookup for a configured hook

- **WHEN** a user runs `openspec lifecycle actions --at change.apply.before --json` and two triggers target that hook
- **THEN** the output lists both actions in trigger order with their instructions inline
- **AND** `root` uses OpenSpec's standard root shape

#### Scenario: Hook with no triggers

- **WHEN** the hook name is valid but no trigger targets it
- **THEN** the output returns `actions: []` and exits zero

#### Scenario: Invalid hook or config

- **WHEN** the hook name is invalid, or the lifecycle config is invalid
- **THEN** the JSON output is `{ hook, status }` with no `actions` key
- **AND** the command exits non-zero

#### Scenario: Human summary

- **WHEN** a user runs `openspec lifecycle actions` without flags
- **THEN** the output lists each configured hook and its actions with their modes
- **AND** a project with no triggers gets a message that no lifecycle actions are configured

### Requirement: Deliver lifecycle actions on operation reads

The system SHALL attach an optional `lifecycle` field to `openspec instructions create|apply|archive --json`, grouping matching actions into `before` and `completed` checkpoints with a short `handling` instruction. An invalid `lifecycle:` block yields `lifecycleError` instead, and the rest of the payload is unchanged. `openspec instructions create` returns `root` and the project `context`. With `--change` or `--schema`, `openspec instructions create` SHALL read the schema artifact named `create` instead, so custom schemas that define one keep working. `openspec list` and `openspec status` SHALL stay free of lifecycle actions.

#### Scenario: Checkpoints map to hooks

- **WHEN** an operation read resolves lifecycle actions
- **THEN** `create` returns `change.create.before` actions as `before`
- **AND** `apply` and `archive` return `change.<operation>.before` actions as `before` and `change.<operation>.completed` actions as `completed`
- **AND** checkpoints with no actions are omitted
- **AND** `handling` explains `suggest` and `auto` and keeps the listed order
- **AND** for `suggest`, `handling` tells the agent to stop and wait for the user's answer before doing anything else, including later actions and file changes

#### Scenario: No matching triggers

- **WHEN** no trigger targets the operation's hooks
- **THEN** the instruction payload has no `lifecycle` or `lifecycleError` field

#### Scenario: Apply with before and completed actions

- **WHEN** triggers target `change.apply.before` and `change.apply.completed`
- **THEN** `openspec instructions apply --json` includes `lifecycle.before`, `lifecycle.completed`, and `lifecycle.handling`

#### Scenario: Invalid lifecycle config

- **WHEN** the `lifecycle:` block is invalid
- **THEN** `openspec instructions apply --json` exits zero with its normal fields plus `lifecycleError`
- **AND** it has no `lifecycle` field

#### Scenario: Custom schema artifact named create

- **WHEN** a change uses a custom schema with an artifact named `create`, and a user runs `openspec instructions create --change <id> --json`
- **THEN** the output is that artifact's instructions, not the create operation read

#### Scenario: Status and list

- **WHEN** a user runs `openspec status` or `openspec list` with lifecycle config, valid or not
- **THEN** the output has no lifecycle actions or lifecycle errors

### Requirement: Check lifecycle config in full-project validation

The system SHALL check the `lifecycle:` block during `openspec validate --all` and report it as a `config` item named `lifecycle`. Other validation scopes SHALL leave it unchecked, so a lifecycle typo never blocks spec or change validation.

#### Scenario: Invalid lifecycle config with --all

- **WHEN** `openspec validate --all` runs and the `lifecycle:` block is invalid
- **THEN** the results include a failing `config/lifecycle` item listing each problem
- **AND** the command exits non-zero

#### Scenario: Specs-only validation

- **WHEN** `openspec validate --specs` runs and the `lifecycle:` block is invalid
- **THEN** the results do not mention lifecycle config
