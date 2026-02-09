## Why

OpenSpec schemas define artifact creation instructions but have no way to inject custom behavior at operation lifecycle points (archive, sync, new, apply). Users need project-specific and workflow-specific actions at these points, such as:
- Consolidating error logs on archive
- Generating ADRs
- Notifying external systems
- Updating documentation indexes

Today the only option is manual post-hoc work or hardcoding behavior into skills.

Related issues: #682 (extensible hook capability), #557 (ADR lifecycle hooks), #328 (Claude Hooks integration), #331 (auto-update project.md on archive), #369 (post-archive actions).

## What Changes

- Add a `hooks` section to `schema.yaml` for workflow-level lifecycle hooks (LLM instructions that run at operation boundaries)
- Add a `hooks` section to `config.yaml` for project-level lifecycle hooks
- Create a CLI command to resolve and return hooks for a given lifecycle point. With `--change`, resolves schema from the change's metadata. Without `--change`, resolves schema from `config.yaml`'s default `schema` field. Both modes return schema + config hooks (schema first)
- Update skills (archive, sync, new, apply) to query and execute hooks at their lifecycle points
- Hooks are LLM instructions only in this iteration — no `run` field for shell execution (deferred to future iteration)

Supported lifecycle points:
- `pre-new` / `post-new` — creating a change
- `pre-archive` / `post-archive` — archiving a change
- `pre-sync` / `post-sync` — syncing delta specs
- `pre-apply` / `post-apply` — implementing tasks

## Capabilities

### New Capabilities
- `lifecycle-hooks`: Core hook resolution system — schema/config parsing, merging, and CLI exposure of lifecycle hook instructions

### Modified Capabilities
- `artifact-graph`: Schema YAML type extended with optional `hooks` section
- `instruction-loader`: New function/command to resolve hooks for a lifecycle point
- `cli-archive`: Archive operation awareness of pre/post hooks (CLI level)
- `opsx-archive-skill`: Archive skill executes hooks at pre/post-archive points
- `specs-sync-skill`: Sync skill executes hooks at pre/post-sync points
- `cli-artifact-workflow`: New `openspec hooks` command registered alongside existing workflow commands

## Impact

- **Schema format**: `schema.yaml` gains optional `hooks` field — fully backward compatible (no hooks = no change)
- **Config format**: `config.yaml` gains optional `hooks` field — fully backward compatible
- **CLI**: New `openspec hooks` command to resolve and retrieve hooks for a lifecycle point (with optional `--change` flag)
- **Skills**: Archive, sync, new, and apply skills gain hook execution steps
- **Existing schemas**: Unaffected — `hooks` is optional
- **Tests**: New tests for hook parsing, merging, resolution, and validation
