## Why

OpenSpec still installs most generated workflows inside each project, so users who use the same AI tools across many repositories must run `openspec update` in every repository. The current path model also mixes project-only targets, the global-only MiniMax target, and the shared `.agents/skills` target without a user-selectable installation strategy.

## What Changes

### 1. Add an install scope preference with legacy-safe defaults

Introduce a user-level `installScope` preference with two values:

- `global` for artifacts shared across projects
- `project` for artifacts stored in the current repository

Newly created global configs persist `global`. Existing config files that predate the field continue to resolve to `project` until the user opts in, so upgrading does not silently relocate existing project artifacts.

### 2. Declare scope support per tool surface

Extend AI tool metadata with explicit scope support for each generated surface:

- `skills: InstallScope[]`
- `commands: InstallScope[]`

Missing metadata remains project-only for backward compatibility. Scope is resolved independently per surface because upstream tools do not always expose the same scopes for skills and commands. For example, GitHub Copilot supports personal skills but OpenSpec's generated Copilot prompt-file surface remains project-scoped.

### 3. Resolve scope-aware tool paths

Refactor path resolution so `init`, `update`, detection, drift checks, generation, and cleanup use the same requested-scope context. Project and global paths use each tool's documented conventions; global path overrides are declared only when a tool's user-level layout differs from its project layout.

The initial support matrix is intentionally closed:

- Codex and `agents`: project or global skills under the corresponding `.agents/skills` root, with one shared writer
- MiniMax Code: global-only skills under the user's `.minimax/skills` root
- GitHub Copilot: project or global skills, with project-scoped generated prompt files
- every other existing skills surface: project-only
- every existing adapter-backed commands surface: project-only

Future global declarations require a separate documented matrix update rather than an implementation-time path guess.

### 4. Add scope control to init, update, and config UX

- `openspec init` and `openspec update` accept `--scope global|project` as a run-only target override.
- Without an override, both commands use the persisted preference or its migration-aware default.
- `openspec config profile` can change the persisted install scope alongside the existing profile and delivery settings.
- Any config operation that changes the effective persisted scope reports the old and new values, warns that a later durable migration may clean managed artifacts from the previous scope, and does not itself remove tool artifacts.
- `openspec config list` reports the effective value and whether it is explicit, a new-config default, or a legacy default.
- Command summaries show requested and effective scope per affected tool surface, including fallback paths and any other-scope copies deliberately preserved by a run-only override.

### 5. Separate persistent scope transitions from run-only targeting

Before writing, validate every path that the run may mutate. A run without `--scope` reconciles toward the persisted or migration-aware default and may perform a scope transition in either direction. When that transition would clean managed artifacts from the previous scope, interactive runs first show the project/global direction and concrete source and destination paths, warn when shared global artifacts will be removed, and require confirmation; `--force` supplies the same authorization for non-interactive runs, which otherwise fail before mutation. After authorization, the run writes and verifies replacement artifacts first, then removes only explicitly known OpenSpec-managed artifacts from non-effective targets. A run-only `--scope` override writes or refreshes its effective target but preserves managed artifacts in every other scope, so a temporary invocation cannot delete an installation shared by other projects. Persisting the preference and running init/update without an override is the supported way to migrate and clean old scopes.

### 6. Compose scope with the current delivery and command-surface model

Planning for `init` and `update` composes:

- install scope (`global | project`)
- delivery mode (`both | skills | commands`)
- command surface (`adapter-backed | skills-invocable | none`)

The plan classifies surfaces as desired, cleanup-only, or preserved according to the current delivery/capability behavior. Desired surfaces receive normal effective-scope resolution. Cleanup-only surfaces use deterministic exact-path planning and preflight without becoming generation compatibility requirements. Codex remains skills-invocable and does not regain generated custom prompts.

## Capabilities

### New Capabilities

- `installation-scope`: User preference, effective-scope resolution, fallback reporting, and safe scope transitions for generated workflow artifacts.

### Modified Capabilities

- `global-config`: Persist install scope and distinguish new-config defaults from legacy schema evolution.
- `cli-config`: Configure and inspect install scope through the existing config UX.
- `ai-tool-paths`: Declare scope support and resolve documented project/global skill targets.
- `command-generation`: Resolve adapter paths using install context without changing tool-specific formatting or invocation spelling.
- `cli-init`: Plan, generate, report, and reconcile artifacts using effective scopes.
- `cli-update`: Detect, refresh, migrate, and clean artifacts using effective scopes.

## Impact

- `src/core/global-config.ts`, `src/core/config-schema.ts`, `src/telemetry/config.ts` - default/source-aware config creation and validation
- `src/commands/config.ts` - action-first install-scope configuration and reporting
- `src/core/config.ts`, `src/core/shared/skill-paths.ts` - scope metadata and skill target resolution
- `src/core/shared-skill-target.ts`, `src/core/available-tools.ts`, `src/core/shared/tool-detection.ts` - scope-aware ownership and detection
- `src/core/command-generation/*` - install-context-aware adapter paths and invocation derivation
- `src/core/command-surface.ts`, `src/core/profile-sync-drift.ts` - composition with delivery/capability planning and drift detection
- `src/core/init.ts`, `src/core/update.ts`, `src/cli/index.ts`, command completions - CLI options, preflight, generation, cleanup, and upgrade reruns
- `docs/supported-tools.md`, `docs/cli.md`, `docs/migration-guide.md` - path matrix, fallback behavior, and migration guidance
- config, resolver, adapter, init, update, detection, migration, safety, and cross-platform tests
