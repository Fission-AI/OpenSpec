## Context

See `proposal.md` for motivation and `specs/custom-openspec-directory/spec.md` for the user contract.

The current root model has one overloaded path. `ResolvedOpenSpecRoot.path` names a repository or store root, while most consumers reconstruct its data directory with `path.join(root.path, 'openspec', ...)`. `init` and `update` use that same path for both planning files and project-local agent integrations. Stores work because their planning files retain the conventional `<store root>/openspec` layout; relocating only a normal project's planning directory exposes the missing distinction.

The implementation also contains command-local path construction and generated instructions that say `<planningHome.root>/openspec/...`. Adding an environment check at one entry point would therefore produce split-brain behavior: some commands would use the custom location while others and the coding agent would continue reading or writing the default one.

## Goals / Non-Goals

**Goals:**

- Represent the workspace and complete OpenSpec directory separately in one canonical root result.
- Give every shipped command and generated workflow the same custom-directory behavior.
- Preserve store validation, identity, precedence, diagnostics, and default project behavior.
- Make selection visible and fail closed before mutations.

**Non-Goals:**

- Configure `specs`, `changes`, `archive`, or `schemas` independently.
- Add a committed root pointer, search descendants for candidate directories, or infer a directory from agent instructions.
- Turn an in-repository custom directory into a registered store or change store metadata.
- Make `OPENSPEC_DIR` a persistent team setting. Teams remain responsible for setting the environment consistently in shells, task runners, and CI.

## Decisions

### 1. Select the complete directory with `OPENSPEC_DIR`

`OPENSPEC_DIR` names the directory that directly contains `config.yaml`, `specs/`, `changes/`, and optional `schemas/`. For example, `OPENSPEC_DIR=ai/openspec` selects `<workspace>/ai/openspec`.

The variable is the bootstrap mechanism because config inside the directory cannot locate itself. A new root-level YAML file was rejected because it replaces one unwanted root entry with another. Recursive discovery was rejected because it becomes ambiguous in monorepos and makes command behavior depend on unrelated descendants. Reusing store registration was rejected because a directory inside one code workspace is not a standalone planning repository and should not acquire store identity or machine-global registration.

### 2. Resolve a workspace-relative path by walking ancestors

`OPENSPEC_DIR` is a relative path within a workspace. Normal commands walk from the start directory toward the filesystem root and select the nearest ancestor where the relative candidate is an existing, qualifying OpenSpec directory. The matching ancestor is therefore the unambiguous workspace root, while the candidate is the OpenSpec directory. A closer ancestor with its own qualifying candidate is a nested workspace and wins for invocations inside it, matching existing nearest-root semantics. This mirrors nearest-root discovery without scanning descendants: `OPENSPEC_DIR=ai/openspec` works from both a workspace root and its subdirectories.

`init [path]` is the creation exception. It resolves the value against the explicit target workspace because the directory does not exist yet. `update [path]` resolves against the explicit target first and requires the result to exist. Unset, empty, and whitespace-only values mean no override so common shell and CI defaults preserve today's behavior. Non-empty absolute values, paths that escape the workspace lexically or after symlink canonicalization, filesystem roots, files, and directories without an OpenSpec config or planning shape fail with typed diagnostics. Existing path identity is canonicalized using the same utilities as store resolution, including symlink and Windows alias handling, before enforcing workspace containment.

Absolute and outside-workspace values are deliberately rejected: they select planning data without identifying the workspace that owns project-local agent files. A standalone planning repository already has an explicit, identity-preserving mechanism in stores. Keeping `OPENSPEC_DIR` workspace-relative makes `root.path` stable and avoids adding a second workspace variable or guessing from Git metadata.

### 3. Make selection explicit and non-ambiguous

An explicit `--store` and a non-empty `OPENSPEC_DIR` are mutually exclusive; supplying both fails before registry or filesystem mutation. Otherwise, a non-empty `OPENSPEC_DIR` is resolved before nearest-root and default-store fallback because setting it is an explicit process-level choice. An invalid non-empty value fails closed instead of silently falling back to another root.

The selected custom directory prints a root banner in human mode. JSON root output adds `openspec_dir` and the source value `environment`; `openspec_dir` is emitted for every resolved source so agents never reconstruct it. Existing `root.path` remains the workspace/store root for compatibility. Generated workflow instruction payloads likewise add `planningHome.openspecDir` while retaining existing fields.

The always-visible provenance addresses the main environment-variable risk: a long-lived shell can otherwise direct writes somewhere unexpected. This follows stores' established banner and machine-readable-root pattern rather than creating an invisible override.

### 4. Separate workspace paths from planning paths

The canonical result will carry at least:

- `path`: the existing workspace or store root contract.
- `openspecDir`: the authoritative complete OpenSpec directory.
- `changesDir`, `specsDir`, and `archiveDir`: derived once from `openspecDir`.
- `source` and optional `storeId`: selection provenance.

For a default project, `openspecDir` is `<workspace>/openspec`. For a store, it is `<store root>/openspec`. For an environment-selected project, `path` is the ancestor that resolved the relative value (or the explicit init/update workspace), while `openspecDir` is the selected directory. Because the environment value must be relative and remain inside that workspace, both paths are defined for every successful resolution.

`init` and `update` continue using the workspace path for `.claude/`, `.codex/`, other project-local tool files, root stubs, detection, and cleanup. Config, OpenSpec-owned instructions, schemas, specs, changes, and archives use `openspecDir`. This distinction is passed explicitly; no consumer derives one path from the other.

### 5. Migrate consumers onto directories, not another helper that hides joins

The root resolver and planning-home adapter derive all OpenSpec subdirectories. Root-scoped command APIs receive the resolved root or the exact directory they need. Project-config and schema APIs gain directory-aware entry points while compatibility wrappers retain default behavior for external callers.

Every shipped command path is included, including `init`, `update`, `config`, `schema`, `templates`, `view`, `doctor`, and deprecated noun-form commands that remain executable. Leaving a cwd-based path in a deprecated command would still let the same invocation read one root and write another.

Generated workflow text must read `root.openspec_dir` or `planningHome.openspecDir`. Literal `openspec/` examples may remain only when they describe the default layout, never when they direct a file operation. Generated snapshots and parity hashes are refreshed from the shared templates.

### 6. Keep store structure and registration unchanged

Registered stores continue requiring their conventional `openspec/` child and identity metadata. `OPENSPEC_DIR` does not customize a store's internal layout, participate in the registry, or weaken health checks. Stores benefit only from the shared explicit `openspecDir` field and from consumers no longer reconstructing their paths.

This keeps #697 independent from project-scoped store discovery and configurable individual artifact paths. It also preserves the stores simplification principle: one root-selection path and one observable root contract.

## Risks / Trade-offs

- **A partially migrated consumer could read or write the default directory.** → Inventory every hardcoded runtime and generated `openspec/` path, add command-parity tests, and make directory derivation a shared dependency-direction invariant.
- **A stale environment variable could redirect writes.** → Emit provenance for every custom-root command, reject invalid values and `--store` conflicts, and document consistent environment use across a workflow.
- **Relative resolution could differ by invocation directory.** → Use nearest-ancestor candidate resolution and cover workspace-root, nested-directory, spaces, Windows separators, and symlink aliases.
- **Separating workspace and planning paths expands the init/update surface.** → Test that planning files move while every project-local tool file remains byte-for-byte at the workspace root.
- **Adding JSON fields can affect strict consumers.** → Keep all existing keys and meanings, document the additive fields, and add agent-contract fixtures. This is a minor feature change, not a key rename.

## Migration Plan

1. Introduce the directory-aware root types and default/store adapters with compatibility tests while behavior is unchanged.
2. Add environment resolution, diagnostics, provenance, and root-selection tests.
3. Move runtime consumers, init/update, and generated workflows onto `openspecDir`, with parity coverage after each group.
4. Document `OPENSPEC_DIR`, add a minor changeset, and run the complete macOS/Linux suite plus Windows CI.
5. Rollback removes environment selection and the additive fields; default projects and stores retain their existing on-disk layouts throughout.
