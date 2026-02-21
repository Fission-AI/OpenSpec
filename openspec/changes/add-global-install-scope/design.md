## Context

OpenSpec today assumes project-local installation for most generated artifacts, with Codex command prompts as the main global exception. This mixed model works, but it is implicit and not user-configurable.

The requested change is to support user-selectable install scope (`global` or `project`) for tool skills/commands, defaulting to `global` for new configurations while preserving legacy project-local behavior until explicit migration.

## Goals / Non-Goals

**Goals:**

- Provide a single scope preference that users can set globally and override per run
- Default new users to `global` scope
- Make install path resolution deterministic and explicit across tools/surfaces
- Preserve current behavior for users with older config files that do not yet define `installScope`
- Avoid silent partial installs; surface effective scope decisions in output

**Non-Goals:**

- Implementing project-local config file support for global settings
- Defining global install paths for tools where upstream location conventions are unknown
- Changing workflow/profile semantics (`core`, `custom`, `delivery`) in this change

## Decisions

### 1. Scope model in global config

Add install scope preference to global config:

```ts
type InstallScope = 'global' | 'project';

interface GlobalConfig {
  // existing fields...
  installScope?: InstallScope;
}
```

Defaults:

- New configs SHOULD write `installScope: global` explicitly.
- Existing configs without this field continue to load safely through schema evolution and SHALL resolve effective default as `project` until users explicitly set `installScope`.

### 2. Explicit tool scope support metadata

Extend `AI_TOOLS` metadata with optional scope support declarations per surface:

```ts
interface ToolInstallScopeSupport {
  skills?: InstallScope[];
  commands?: InstallScope[];
}
```

Resolution rules:

1. If scope support metadata is absent for a tool surface, treat it as project-only support for conservative backward compatibility.
2. Try preferred scope.
3. If unsupported, use alternate scope when supported.
4. If neither is supported, fail with actionable error.

This enables default-global behavior while remaining safe for tools that only support project-local paths.

### 3. Scope-aware install target resolver

Introduce shared resolver utilities to compute effective target paths for:

- skills root directory
- command output files

Resolver input:

- tool id
- requested scope
- project root
- environment context (`CODEX_HOME`, etc.)

Resolver output:

- effective scope per surface
- concrete target paths
- optional fallback reasons for user-facing output

Platform behavior:

- Resolver outputs are OS-aware and normalized for the current platform.
- Windows global targets MUST use Windows path conventions (for example `%USERPROFILE%\.codex\prompts` fallback for Codex when `CODEX_HOME` is unset), not POSIX defaults.

### 4. Context-aware command adapter paths

Update command generation contract so adapters receive install context for path resolution. This avoids hardcoded absolute/relative assumptions and centralizes scope decisions.

Example direction:

```ts
getFilePath(commandId: string, context: InstallContext): string
```

### 5. CLI behavior and UX

`init`:

- Uses configured install scope by default; if absent in a legacy config, uses migration-safe effective default (`project`).
- Supports explicit override flag (`--scope global|project`).
- In interactive mode, displays chosen scope and any per-tool fallback decisions before writing files.

`update`:

- Applies current scope preference (or override); if absent in a legacy config, uses migration-safe effective default (`project`).
- Performs drift detection using effective scoped paths and last-applied scope state.
- Reports effective scope decisions in summary output.

`config`:

- `openspec config profile` interactive flow includes install scope selection.
- `openspec config list` shows `installScope` with source annotation (`explicit`, `new-default`, or `legacy-default`).

### 6. Cleanup safety during scope changes

When scope changes:

- Writes occur in the new effective targets.
- Cleanup/removal is limited to OpenSpec-managed files for the relevant tool/workflow IDs.
- Output explicitly states which scope locations were updated and which were cleaned.

### 7. Scope drift state tracking

Track last successful effective scope per tool/surface in project-managed state.

Rules:

1. Drift is detected when current resolved scope differs from last successful scope for a configured tool/surface.
2. Scope support MUST be validated for all configured tools/surfaces before any write starts.
3. Update writes to newly resolved targets first, verifies completeness, then removes managed files at previous targets.
4. If new-target writes are partial or verification fails, command SHALL abort old-target cleanup and report actionable failure with incomplete/new and preserved/old paths.
5. Cleanup failures do not rollback new writes; command returns actionable failure with leftover paths to resolve.

### 8. Coordination with command-surface capability changes

If `add-tool-command-surface-capabilities` lands, planning logic must evaluate scope resolution and delivery/capability behavior together (scope × delivery × command surface).

## Risks / Trade-offs

**Risk: Cross-project shared global state**
Global installs are shared across projects. Updating global artifacts from one project affects all projects using that tool scope.
→ Mitigation: make scope explicit in output; keep profile/delivery global and deterministic.

**Risk: Tool-specific unknown global conventions**
Not all tools document a stable global install location.
→ Mitigation: use explicit scope support metadata; fallback or fail instead of guessing.

**Risk: Adapter API churn**
Changing adapter path contracts touches many files/tests.
→ Mitigation: migrate in one pass with adapter contract tests and existing end-to-end generation tests.

## Rollout Plan

1. Add config schema + defaults for install scope.
2. Add tool scope capability metadata and resolver utilities.
3. Upgrade command adapter contract and generator path plumbing.
4. Integrate scope-aware behavior into init/update.
5. Add documentation and test coverage.
