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
- Create a CLI command to resolve and return hooks for a given lifecycle point. With `--change`, resolves schema from the change's metadata. Without `--change`, resolves schema from the `schema` field in `config.yaml`. Both modes return schema + config hooks (schema first)
- Update skills (archive, sync, new, apply) to query and execute hooks at their lifecycle points
- Hooks are LLM instructions only in this iteration — no `run` field for shell execution (deferred to future iteration)

Supported lifecycle points:
- `pre-new` / `post-new` — creating a change
- `pre-archive` / `post-archive` — archiving a change
- `pre-sync` / `post-sync` — syncing delta specs
- `pre-apply` / `post-apply` — implementing tasks

### Example: schema.yaml
```yaml
name: feature-change
hooks:
  post-archive:
    instruction: |
      Review the archived change and update the project changelog with key decisions
  pre-apply:
    instruction: |
      Verify all prerequisite tasks are complete before implementation
```

### Example: config.yaml
```yaml
schema: spec-driven
hooks:
  post-new:
    instruction: |
      Notify the team in Slack about the new change
  pre-sync:
    instruction: |
      Ensure local working directory is clean
```

### Schema vs. Config hooks

- **Schema hooks**: Workflow-specific instructions that travel with the schema (e.g., "generate ADR on archive")
- **Config hooks**: Project-specific instructions that apply across all schemas in that project (e.g., "notify team on sync")
- **Merge strategy**: Schema hooks run first, then config hooks, allowing projects to add context-specific behavior on top of workflow defaults

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

- **Schema format**: `schema.yaml` gains optional `hooks` field — fully backward-compatible (no hooks = no change)
- **Config format**: `config.yaml` gains optional `hooks` field — fully backward-compatible
- **CLI**: New `openspec hooks` command to resolve and retrieve hooks for a lifecycle point (with optional `--change` flag)
- **Skills**: Archive, sync, new, and apply skills gain hook execution steps
- **Existing schemas**: Unaffected — `hooks` is optional
- **Tests**: New tests for hook parsing, merging, resolution, and validation
- **Validation**: Hook keys are validated against `VALID_LIFECYCLE_POINTS` at parse time; unknown keys emit warnings
- **Error handling**: Malformed hooks (empty instruction, non-object values) are skipped with warnings — resilient field-by-field parsing
- **Security**: Hooks are LLM instructions only (no shell execution in this iteration), limiting the security surface
