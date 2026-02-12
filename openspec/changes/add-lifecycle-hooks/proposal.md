## Why

OpenSpec schemas define artifact creation instructions but have no way to inject custom behavior at operation lifecycle points (archive, sync, new, apply, verify). Users need project-specific and workflow-specific actions at these points, such as:
- Consolidating error logs on archive
- Generating ADRs
- Running test suites before verification
- Notifying external systems
- Updating documentation indexes

Today the only option is manual post-hoc work or hardcoding behavior into skills.

Related issues: #682 (extensible hook capability), #557 (ADR lifecycle hooks), #328 (Claude Hooks integration), #331 (auto-update project.md on archive), #369 (post-archive actions).

## What Changes

- Add a `hooks` section to `schema.yaml` for workflow-level lifecycle hooks (LLM instructions that run at operation boundaries)
- Add a `hooks` section to `config.yaml` for project-level lifecycle hooks
- Create hook resolution function (schema + config merge, schema first)
- Expose hooks via a `--hook <lifecycle-point>` flag on `openspec instructions`. Supports optional `--change <name>` to resolve hooks from the change's schema; without `--change`, resolves from config.yaml's default schema. The `--hook` flag is mutually exclusive with the `[artifact]` positional argument — using both produces an error. Hook resolution logic lives in `hooks.ts` as an internal module
- Update all skills (explore, new, continue, ff, apply, verify, sync, archive, bulk-archive, onboard) to query and execute hooks at their lifecycle points
- Document the `instructions` command covering all modes (artifact, apply, `--hook`)
- Hooks are LLM instructions only in this iteration — no `run` field for shell execution (deferred to future iteration)

Supported lifecycle points (20 total):
- `pre-explore` / `post-explore` — entering/exiting explore mode
- `pre-new` / `post-new` — creating a change
- `pre-continue` / `post-continue` — creating an artifact (also fires inside ff)
- `pre-ff` / `post-ff` — fast-forward artifact generation
- `pre-apply` / `post-apply` — implementing tasks
- `pre-verify` / `post-verify` — verifying implementation
- `pre-sync` / `post-sync` — syncing delta specs
- `pre-archive` / `post-archive` — archiving a change (also fires per change inside bulk-archive)
- `pre-bulk-archive` / `post-bulk-archive` — batch archiving
- `pre-onboard` / `post-onboard` — onboarding session

### Example: schema.yaml
```yaml
name: feature-change
hooks:
  post-archive:
    instruction: |
      Review the archived change and update the project changelog with key decisions
  pre-verify:
    instruction: |
      Run the full test suite before verification begins
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
- `instruction-loader`: Hook resolution function + `--hook` flag integration in instructions command
- `cli-artifact-workflow`: `openspec instructions` gains `--hook` flag
- `cli-archive`: Archive operation awareness of pre/post hooks
- `opsx-archive-skill`: Archive skill executes hooks at pre/post-archive points
- `specs-sync-skill`: Sync skill executes hooks at pre/post-sync points
- `opsx-verify-skill`: Verify skill executes hooks at pre/post-verify points

## Impact

- **Schema format**: `schema.yaml` gains optional `hooks` field — fully backward-compatible
- **Config format**: `config.yaml` gains optional `hooks` field — fully backward-compatible
- **CLI**: `openspec instructions --hook <lifecycle-point>` exposes hooks. `--hook` is mutually exclusive with `[artifact]` positional — error if both provided
- **Skills**: All skills (explore, new, continue, ff, apply, verify, sync, archive, bulk-archive, onboard) use `openspec instructions --hook`
- **Lifecycle points**: 20 total — `pre/post` for explore, new, continue, ff, apply, verify, sync, archive, bulk-archive, onboard. The ff skill fires `pre-ff`/`post-ff` around the entire operation and `pre-continue`/`post-continue` for each artifact iteration. The bulk-archive skill fires `pre-bulk-archive`/`post-bulk-archive` around the batch and `pre-archive`/`post-archive` for each individual change
- **Existing schemas**: Unaffected — `hooks` is optional
- **Tests**: Hook tests via `instructions --hook`, verify hook tests
- **Validation**: Hook keys validated against `VALID_LIFECYCLE_POINTS`; unknown keys emit warnings
- **Documentation**: `instructions` command documented with all three modes
- **Error handling**: Malformed hooks (empty instruction, non-object values) are skipped with warnings — resilient field-by-field parsing
- **Security**: Hooks are LLM instructions only (no shell execution in this iteration)
