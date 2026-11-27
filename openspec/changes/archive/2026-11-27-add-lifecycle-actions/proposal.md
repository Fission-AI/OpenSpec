## Why

Teams want their agents to do a discrete job at set points in a change's lifecycle, such as rereading linked requirements before Apply edits code, or drafting upstream feedback once tasks are complete. Today the only way is to retell the agent every time. Projects need a place to declare these jobs once, and agents and orchestrators need one way to ask which jobs apply at a given point.

## What Changes

- New `lifecycle:` block in `openspec/config.yaml`: named `actions` (agent instructions) and `triggers` that attach an action to a hook with a `suggest` or `auto` mode.
- Five built-in hooks (`change.create.before`, `change.apply.before`, `change.apply.completed`, `change.archive.before`, `change.archive.completed`) plus project-defined `custom.*` hooks.
- Strict validation of the `lifecycle:` block. Unknown keys, `policy`, duplicate action ids, duplicate triggers, missing references, invalid modes, and invalid hook names fail. A `lifecycle:` block in a config that only points at a Store fails instead of being ignored. Other commands keep reading the config as before.
- New read-only command `openspec lifecycle actions [--at <hook>] [--store <id>] [--json]`.
- New `openspec instructions create`, and an optional `lifecycle` (or `lifecycleError`) field on `openspec instructions create|apply|archive --json`.
- `openspec validate --all` reports lifecycle config problems. Other validation scopes are unchanged.

Out of scope: policy enforcement, native command execution, plugins, profiles, result schemas, persistent action state, `sources:` or `references:` schemas, drift detection, and skill template checkpoints (later PRs).

## Capabilities

### New Capabilities

- `lifecycle-actions`: configure lifecycle actions and triggers, validate them, look them up by hook, and receive them on built-in operation reads.

### Modified Capabilities

None.

## Impact

- Config: new optional `lifecycle:` key in `openspec/config.yaml`. Projects without it behave as today.
- CLI: new `openspec lifecycle actions` and `openspec instructions create`; new optional JSON fields on `instructions apply` and `instructions archive`; a `config` item in `validate --all` output when `lifecycle:` is set.
- Skills: the shared store-selection guidance names `lifecycle actions` among the commands that take `--store`.
