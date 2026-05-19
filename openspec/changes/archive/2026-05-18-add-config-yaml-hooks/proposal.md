## Why

Teams using OpenSpec need project-level lifecycle automation — running shell scripts to notify Slack, enforce pre-conditions, or generate summaries — but today there is no hook mechanism in `config.yaml` to attach behavior before or after the propose/explore/apply/archive workflows. Adding hooks closes this gap without requiring custom skill forks.

## What Changes

- **New `hooks` top-level field in `openspec/config.yaml`** supporting `pre-<workflow>` and `post-<workflow>` entries for the four core workflows: `propose`, `explore`, `apply`, `archive`.
- **Each hook** optionally specifies an `instruction` (text injected into the AI skill's context) and/or a `run` command (shell command executed before/after the workflow).
- **Pre-hook `run` commands act as gates**: a non-zero exit code blocks the workflow from proceeding and surfaces the failure to the user.
- **Post-hook `run` commands** execute after the workflow completes; failures are surfaced as warnings but do not retroactively fail the workflow.
- **`instruction` fields** are injected into the relevant skill prompt so the AI agent respects them during execution.
- **`project-config.ts`** is extended to parse, validate, and expose the `hooks` field with resilient field-by-field parsing consistent with the existing config system.
- **Skill files** (`openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-archive-change`, and their `opsx:*` aliases) are updated to read hook config via the CLI and honor both `run` gates and `instruction` injections.

## Capabilities

### New Capabilities
- `config-yaml-hooks`: Declaration, parsing, and validation of the `hooks` field in `openspec/config.yaml`, including the hook schema (`instruction`, `run`) for pre/post lifecycle events on the four core workflows.
- `skill-hook-execution`: Skill-level enforcement of hooks — running pre-hook shell commands as gates, injecting `instruction` text into the AI context, and running post-hook shell commands with appropriate failure handling.

### Modified Capabilities
- `config-loading`: The `openspec/config.yaml` parsing module gains support for the new `hooks` field with the same resilient parsing pattern used for `schema`, `context`, and `rules`.

## Impact

- `src/core/project-config.ts` — add `HookConfig`, `WorkflowHooks`, and `HooksConfig` types; extend `ProjectConfigSchema` and `readProjectConfig`.
- Skill SKILL.md files (`openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-archive-change`, `opsx:*` aliases) — add hook-read and hook-enforcement steps.
- New CLI subcommand or helper (e.g., `openspec hooks run <event>`) to surface hook config to skills in a structured way.
- `openspec/specs/config-loading/spec.md` — extended with `hooks` field requirements.
- No breaking changes to existing config files (hooks field is fully optional).
