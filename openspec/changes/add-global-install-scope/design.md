## Context

OpenSpec today assumes project-local installation for most generated artifacts, with Codex command prompts as the main global exception. This mixed model works, but it is implicit and not user-configurable.

The requested change is to support user-selectable install scope (`global` or `project`) for tool skills/commands, defaulting to `global`.

## Goals / Non-Goals

**Goals:**

- Provide a single scope preference that users can set globally and override per run
- Default new users to `global` scope
- Make install path resolution deterministic and explicit across tools/surfaces
- Keep existing behavior backward compatible for users with older config files
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

- `installScope` defaults to `global` when absent.
- Existing config files without this field continue to load safely through schema evolution.

### 2. Explicit tool scope support metadata

Extend `AI_TOOLS` metadata with optional scope support declarations per surface:

```ts
interface ToolInstallScopeSupport {
  skills?: InstallScope[];
  commands?: InstallScope[];
}
```

Resolution rules:

1. Try preferred scope.
2. If unsupported, use alternate scope when supported.
3. If neither is supported, fail with actionable error.

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

### 4. Context-aware command adapter paths

Update command generation contract so adapters receive install context for path resolution. This avoids hardcoded absolute/relative assumptions and centralizes scope decisions.

Example direction:

```ts
getFilePath(commandId: string, context: InstallContext): string
```

### 5. CLI behavior and UX

`init`:

- Uses configured install scope by default.
- Supports explicit override flag (`--scope global|project`).
- In interactive mode, displays chosen scope and any per-tool fallback decisions before writing files.

`update`:

- Applies current scope preference (or override).
- Performs drift detection using effective scoped paths.
- Reports effective scope decisions in summary output.

`config`:

- `openspec config profile` interactive flow includes install scope selection.
- `openspec config list` shows `installScope` with explicit/default annotation.

### 6. Cleanup safety during scope changes

When scope changes:

- Writes occur in the new effective targets.
- Cleanup/removal is limited to OpenSpec-managed files for the relevant tool/workflow IDs.
- Output explicitly states which scope locations were updated and which were cleaned.

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
