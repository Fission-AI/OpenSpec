## Why

OpenSpec still installs most generated workflows inside each project, so users who use the same AI tools across many repositories must run `openspec update` in every repository. The current path model also mixes project-only targets, the global-only MiniMax target, and the shared `.agents/skills` target without a user-selectable installation strategy.

## What Changes

### 1. Add an opt-in global install scope with a project default

Introduce a user-level `installScope` preference with two values:

- `global` for artifacts shared across projects
- `project` for artifacts stored in the current repository

Newly created global configs and existing config files that predate the field both resolve to `project`. Global installation is enabled only by explicitly persisting `installScope: global` or by supplying a run-only `--scope global` override, so installing or upgrading OpenSpec never silently creates shared user-level artifacts.

### 2. Declare scope support per tool surface

Extend AI tool metadata with explicit scope support for each generated surface:

- `skills: InstallScope[]`
- `commands: InstallScope[]`

Scope is resolved independently per surface because skill and command layouts can differ. Project scope remains supported wherever the integration already has a project target. Global scope is declared only for a surface whose user-level installation path has been verified from an official upstream source. An unverified global convention is unsupported rather than inferred from the project layout. MiniMax Code is the explicit global-only, skill-only exception: its verified user-level target is supported and it does not gain a project or command surface. A tool without an adapter does not gain a command-file surface.

### 3. Resolve scope-aware tool paths

Refactor path resolution so `init`, `update`, detection, drift checks, generation, and cleanup use the same requested-scope context. Project and global paths use each tool's documented conventions; global path overrides are declared only when a tool's user-level layout differs from its project layout.

The initial support matrix is complete and explicit for every currently supported AI tool surface:

- Codex and `agents`: only scopes with verified `.agents/skills` conventions, with one deterministic writer per physical shared root
- MiniMax Code: global-only skills under the user's `.minimax/skills` root and no command surface
- every other existing skills surface: project support at its existing target, plus global support only where an official user-level location is recorded
- every existing adapter-backed command surface: project support at its existing adapter path, plus global support only where an official user-level command location is recorded; the adapter owns the concrete path for each supported install context
- tools without a registered adapter: no generated command-file surface; existing skills-invocable behavior remains unchanged

An uncertain upstream convention is unsupported in global scope. The resolver never invents a user-level location by placing a project-relative layout below the user's home directory. When a requested scope is unsupported but the surface has exactly one supported scope, the resolver uses that declared scope and reports the fallback; otherwise preflight reports the unsupported surface before mutation.

### 4. Add scope control to init, update, and config UX

- `openspec init` and `openspec update` accept `--scope global|project` as a run-only target override.
- Both commands accept `--allow-global-cleanup` as separate authorization for exact managed global removals; `--force` controls prompting but does not replace that authorization.
- Without an override, both commands use the persisted preference or its migration-aware default.
- `openspec config profile` can change the persisted install scope alongside the existing profile and delivery settings.
- Any config operation that changes the effective persisted scope reports the old and new values, warns that a later durable migration may clean managed artifacts from the previous scope, and does not itself remove tool artifacts.
- `openspec config list` reports the effective value and whether it is explicit, a new-config default, or a legacy default.
- Command summaries show requested and effective scope per affected tool surface, including explicit single-scope fallback paths and any other-scope copies deliberately preserved by a run-only override.

### 5. Separate persistent scope transitions from run-only targeting

Before writing, validate every path that the run may mutate and revalidate containment immediately before each write or removal. A run without `--scope` reconciles toward the persisted preference and may perform a scope transition in either direction. Cross-scope cleanup and any cleanup of shared global artifacts are separate destructive actions: interactive runs show the concrete cleanup paths and require an explicit default-No confirmation, while global cleanup additionally requires `--allow-global-cleanup`; non-interactive global removal requires both `--force` and `--allow-global-cleanup`. `--force` may bypass the prompt but does not itself authorize global removal. After authorization, the run writes and verifies replacement artifacts first, then removes only explicitly known OpenSpec-managed artifacts from authorized non-effective targets. A run-only `--scope` override writes or refreshes its effective target but preserves managed artifacts in every other scope. Invalid global configuration blocks durable migration and cross-scope cleanup until repaired; an explicit run-only scope remains available and preserves other scopes.

A global target represents one user-wide generated artifact set. In the supported first-version execution model, one OpenSpec invocation at a time mutates a physical global target, and the latest successfully completed `init` or `update` reconciles that target to its CLI version and the current user-level configuration. Projects that intentionally require a pinned CLI version or project-specific generated workflow configuration use project scope instead. This version does not add a cross-process lock, global manifest, or downgrade prohibition; simultaneous mutation of the same target remains unsupported. After an interrupted or competing mutation has stopped, an ordinary `openspec update` with the intended CLI SHALL detect an incomplete or mixed-version managed-artifact set and reconcile it without requiring `--force`.

### 6. Compose scope with the current delivery and command-surface model

Planning for `init` and `update` composes:

- install scope (`global | project`)
- delivery mode (`both | skills | commands`)
- command surface (`adapter-backed | skills-invocable | none`)

The plan classifies surfaces as desired, cleanup-only, or preserved according to the current delivery/capability behavior. Desired surfaces receive normal effective-scope resolution. Cleanup-only surfaces use deterministic exact-path planning and preflight without becoming generation compatibility requirements. Codex remains skills-invocable and does not regain generated custom prompts.

## Capabilities

### New Capabilities

- `installation-scope`: Project-default preference, opt-in global targeting, effective-scope resolution, explicit single-scope fallback reporting, and authorized safe scope transitions for generated workflow artifacts.

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
- `docs/supported-tools.md`, `docs/cli.md`, `docs/migration-guide.md` - verified-path matrix, opt-in behavior, fallback behavior, and migration guidance
- config, resolver, adapter, init, update, detection, migration, safety, and cross-platform tests
