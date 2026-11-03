## Context

See `proposal.md` for motivation and `specs/schema-resolution/spec.md` for the behavioral contract.

The pre-fix CLI has two already-compatible pieces that are not connected:

- `schemasCommand()` passes `process.cwd()` directly to `listSchemasWithInfo()`.
- `listSchemasWithInfo(projectRoot)` already lists the correct project-local, user, and package schemas when given an authoritative project root.
- Normal root-scoped commands already call `resolveRootForCommand()`, which implements explicit store, nearest root, local `store:` pointer, global `defaultStore`, rootless fallback, canonicalization, and shared diagnostics.

The mismatch was reproduced against the built CLI with distinct `local-only` and `store-only` schemas. From the local project, `schemas --json` returned `local-only` and omitted `store-only`, while `context --json --store team-context` resolved the operation root to the store. The relevant pre-fix test baseline passes (110 tests), so the reproduction is not caused by an existing failing suite.

## Goals / Non-Goals

**Goals:**

- Make schema discovery and schema consumption resolve the same root.
- Carry explicit store selection through a supported CLI flag.
- Reuse the canonical root-selection implementation and its diagnostics.
- Preserve successful schema-list output compatibility and cross-platform path handling.

**Non-Goals:**

- Change schema resolution precedence within a resolved root.
- Change schema descriptions, semantic selection policy, or workflow-specific behavior beyond correcting stale `schemas --store` guidance.
- Add a raw filesystem-root flag or expose a resolved path in successful JSON output.
- Modify `context`, `templates`, change creation, or the root resolver itself.
- Refactor the existing `propose` compatibility sequence; only its stale flag-support claim changes.

## Decisions

### 1. Resolve the root at the CLI command boundary

`schemasCommand()` will accept the standard store selector fields and call `resolveRootForCommand()` before invoking `listSchemasWithInfo(root.path)`. This is the same boundary used by `status` and other root-scoped workflow commands.

Resolving inside `listSchemasWithInfo()` was rejected because that function is also a programmatic API with intentional backward-compatible behavior when `projectRoot` is omitted. Root selection is a CLI/session concern; schema enumeration should remain a pure operation over the root it receives.

### 2. Add the standard store option and rejection path

The Commander registration for `schemas` will add `--store <id>` using `COMMON_FLAGS.store` and the shared hidden `--store-path` option. `SchemasOptions` will carry `store` and `storePath`, and command-completion metadata will add the same common store flag. Because the repository enforces that every command exposing `--store` is named by the shared store-selection guidance, that shared command list, committed generated skill snapshots, and generated-content parity hashes will be updated to include `schemas`. Formal CLI/JSON agent-contract references will be synchronized, and the existing `propose` compatibility flow will only lose its now-false assertion that `schemas` cannot accept the flag; its root-resolution sequence remains unchanged.

A raw `--root` or `--cwd` flag was rejected because it would bypass registry validation, store identity checks, canonicalization, and existing diagnostics. Asking an Agent to run `cd <root.path> && openspec schemas` was rejected because generated tool permissions and working-directory support differ across Agents.

### 3. Preserve canonical root precedence without a schemas-specific fallback

The command will use `resolveRootForCommand()` unchanged:

1. Explicit `--store`.
2. Nearest OpenSpec root, including resolution of a config-only `store:` pointer.
3. Global `defaultStore` when no nearer root exists.
4. An implicit current-directory root only when no root or registered-store selection is available.

Invalid pointers, stale defaults, unknown stores, and the presence of unselected registered stores remain fail-closed. Adding a schemas-only catch-and-fallback path was rejected because it would recreate the mismatch this change removes.

### 4. Preserve success output; use the existing JSON failure contract

Successful human output remains the current listing, and successful JSON remains the top-level schema array. No root metadata is added, avoiding a breaking output-shape change.

When root resolution fails under `--json`, the existing command adapter will emit one machine-readable failure document with an empty schema list, null root, and the shared status diagnostic. Human mode keeps the standard root banner and error/fix presentation used by other commands.

### 5. Test the user-visible command, not an implementation mock

A focused CLI suite will construct real temporary roots and registered stores with distinct valid project-local schemas. It will exercise explicit store selection, local pointers, global defaults, nearest-root precedence, rootless compatibility, fail-closed errors, paths with spaces, and the hidden removed option. Completion metadata gets a focused registry assertion.

The tests will use Node path utilities and canonical fixture helpers, following `test/AGENTS.md`; no path identity assertion will compare non-canonical spellings.

## Risks / Trade-offs

- **Users with registered stores but no selected root can no longer use `schemas` as an unscoped built-in-only listing.** → Return the same actionable selection diagnostic as other root-scoped commands; selecting a store or entering a root makes the result authoritative.
- **Adding root resolution introduces new JSON failure paths.** → Assert one-document failure output and non-zero exit behavior explicitly.
- **Store roots containing spaces or platform-specific separators could expose path assumptions.** → Resolve paths internally and add a real CLI fixture with a spaced store path; never compose a shell command.
- **The feature PR still needs to integrate its schema-selection flow with explicit store choice.** → This fix synchronizes shared guidance and the existing `propose` compatibility wording, but leaves feature-specific selection/confirmation behavior to that branch after this independent CLI fix merges.

## Migration Plan

1. Ship the root-aware `schemas` command and `--store` option.
2. Update dependent feature-specific schema-selection guidance in its own branch; the shared store-capable command list and existing `propose` compatibility wording already support `schemas --store` after this fix.
3. Existing successful unscoped output remains compatible; scripts targeting a registered store should add `--store <id>`.
4. Rollback removes the option and returns `schemasCommand()` to `process.cwd()` without changing schema files or registered-store state.
