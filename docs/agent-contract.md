# OpenSpec Agent Contract

Machine-readable surfaces of the `openspec` CLI, verified against `src/` (capstone audit, 2026-06-11). Every shape below is documented from the emitting code.

## 1. General conventions

- **One JSON document per invocation.** In `--json` mode, stdout carries exactly one JSON document (2-space pretty-printed). Human prose, spinners, and the store banner go to stderr.
- **Store banner.** In human mode, a store-selected root prints `Using OpenSpec root: <id> (<path>)` to stderr. Never printed in JSON mode.
- **Key casing is surface-dependent** (see Known inconsistencies): store/doctor/context payloads use `snake_case`; workflow payloads (`status`, `instructions`, `new change`, `validate`, `list`) use `camelCase`, except the embedded `root` object, which always uses `store_id`.
- **Optional keys are omitted, not null**, in most payloads (e.g. `root.store_id`, `member.path`). Exceptions that use explicit `null` are called out per shape (store doctor `git.*`, failure payloads).

## 2. The diagnostic envelope

One envelope shape is shared by every machine-readable diagnostic (`StoreDiagnostic`):

```json
{
  "severity": "error" | "warning" | "info",
  "code": "snake_case_string",
  "message": "human sentence",
  "target": "dotted.surface (optional)",
  "fix": "one actionable sentence/command (optional)"
}
```

Diagnostics appear in two positions: **status arrays** (`status: StoreDiagnostic[]` at top level or per entry) for health findings, and **thrown errors** converted to a single-element `status` array on command failure.

## 3. Root selection and `RootOutput`

All root-resolving commands (`list`, `show`, `validate`, `status`, `instructions`, `instructions apply`, `new change`, `archive`, `doctor`, `context`) resolve one OpenSpec root with one precedence:

1. `--store <id>` → the registered store's root (`source: "store"`).
2. Otherwise, nearest ancestor with `openspec/`: planning shape → `source: "nearest"` (a `store:` pointer is ignored with a stderr warning); config-only dir with a valid `store:` pointer → that store, `source: "declared"`.
3. No nearest root + registered stores exist → error `no_root_with_registered_stores`.
4. No root, no stores: scaffolding commands treat the cwd as `source: "implicit"`; diagnostic commands (`doctor`, `context`) fail with `no_openspec_root` instead — they inspect, never scaffold.

Successful JSON payloads embed the root:

```json
"root": { "path": "/abs/path", "source": "store" | "declared" | "nearest" | "implicit", "store_id": "id (only when store-selected)" }
```

**Root-failure contract**: in JSON mode a resolution failure prints `{ ...commandNullShape, "status": [diagnostic] }` on stdout and exits 1.

## 4. Command JSON shapes

### 4.1 `list --json`
`{ "changes": [ { "name", "completedTasks", "totalTasks", "lastModified", "status": "no-tasks"|"complete"|"in-progress" } ], "root": RootOutput }` — note the per-change `status` is a string enum here. `--specs`: `{ "specs": [ { "id", "requirementCount" } ], "root" }`.

### 4.2 `show <item> --json`
Change: `{ "id", "title", "deltaCount", "deltas": [...], "root" }`. Spec: `{ "id", "title", "overview", "requirementCount", "requirements": [...], "metadata": { "version", "format", "sourcePath"? }, "root" }`.

### 4.3 `validate --json`
`{ "items": [ { "id", "type": "change"|"spec", "valid", "issues": [ { "level", "path", "message", "line"?, "column"? } ], "durationMs" } ], "summary": { "totals": {items,passed,failed}, "byType": {...} }, "version": "1.0", "root" }`. Exit 1 when any item fails.

### 4.4 `status --json`
`{ "changeName", "schemaName", "planningHome"?: { "kind", "root", "changesDir", "defaultSchema" }, "changeRoot", "artifactPaths": { "<id>": {outputPath, resolvedOutputPath, existingOutputPaths} }, "nextSteps": ["..."], "actionContext": { "mode": "repo-local", "sourceOfTruth": "repo", "planningArtifacts", "linkedContext", "allowedEditRoots", "requiresAffectedAreaSelection", "constraints" }, "isComplete", "applyRequires", "artifacts": [ {id, outputPath, status: "done"|"ready"|"blocked", missingDeps?} ], "root" }`. No active changes: `{ "changes": [], "message", "root" }`, exit 0.

### 4.5 `instructions <artifact> --json`
`{ "changeName", "artifactId", "schemaName", "changeDir", "planningHome"?, "outputPath", "resolvedOutputPath", "existingOutputPaths", "description", "instruction"?, "context"?, "rules"?, "references"?: ReferenceIndexEntry[], "template", "dependencies": [{id,done,path,description}], "unlocks", "root" }`.

`ReferenceIndexEntry`: `{ "store_id", "root"?, "specs"?: [{id,summary}], "fetch"?, "status": [] }` — resolved entries carry root/specs/fetch; unresolved carry store_id + warning status. Index capped at 50KB (`reference_index_truncated`).

### 4.6 `instructions apply --json`
`{ "changeName", "changeDir", "schemaName", "contextFiles": { "<artifactId>": ["/abs", ...] }, "progress": {total,complete,remaining}, "tasks": [{id,description,done}], "state": "blocked"|"all_done"|"ready", "missingArtifacts"?, "instruction", "references"?, "root" }`.

### 4.7 `new change <name> --json`
Success: `{ "change": { "id", "path", "metadataPath", "schema" }, "root" }`. Failure: `{ "change": null, "status": [d] }`, exit 1.

### 4.8 `archive <name> --json`
Success: `{ "archive": { "change", "archivedAs": "YYYY-MM-DD-name", "path", "specsUpdated", "totals"? }, "root" }`. Failure: `{ "archive": null, "root"?, "status": [d] }`, exit 1. JSON mode is strictly non-interactive: every prompt point becomes an `archive_*` code.

### 4.9 `doctor --json`
`{ "root": { "path", "source", "store_id"?, "healthy", "status": [] }, "store": { "id", "metadata": {present,valid,remote?}, "origin_url"?, "status": [] } | null, "references": [...], "status": [] }`. Health findings of any severity exit 0. Failure payload: `{ "root": null, "store": null, "references": [], "status": [d] }`, exit 1.

### 4.10 `context --json`
`{ "root": { "path", "source", "store_id"?, "role": "openspec_root" }, "members": [ { "role": "referenced_store", "id", "path"?, "remote"?, "fetch"?, "status": [] } ], "status": [] }`. AVAILABLE = path present AND status empty. `--code-workspace <path>` writes `{folders:[{name,path}]}` (available referenced stores only, `ref:` prefixes); in JSON mode the write runs before printing so stdout holds exactly one document even on write failure. Failure: `{ "root": null, "members": [], "status": [d] }`, exit 1.

### 4.11 `store ... --json`
setup/register: `{ "store": {id, root, metadata_path?}, "registry": {path, registered, already_registered}, "git": {is_repository, initialized, committed}, "created_files": [], "status": [] }`. unregister/remove: `{ "store", "registry": {path, removed}, "files": {deleted, deleted_path, left_on_disk}, "status": [] }`. list: `{ "stores": [{id, root}], "status": [] }`. doctor: `{ "stores": [ { id, root, metadata_path?, openspec_root: {...healthy, status}, metadata: {present, valid, id?, remote}, git: {is_repository, has_commits, has_uncommitted_changes, has_remote, origin_url}, status } ], "status": [] }` (`null` = unknown/not probed). Health findings exit 0; failures exit 1 with the matching null-shape. Prompt cancellation exits 130.

### 4.12 `schemas --json` / `templates --json`
`schemas`: bare array `[ {name, description, artifacts, source} ]`. `templates`: keyed object `{ "<artifactId>": {path, source} }`. Both cwd-based, no root/status keys.

## 5. Exit-code contract

| Situation | Exit | Stdout |
|---|---|---|
| Success, incl. health findings (doctor/context/store doctor) | 0 | the payload |
| Command failure in `--json` mode | 1 | one JSON document with `status: [d]` and the command's null-shape |
| `validate` with failing items | 1 | full report |
| Prompt cancellation (`store` group, human mode) | 130 | stderr only |

## 6. Diagnostic code catalog

### Resolution
`no_openspec_root`, `no_root_with_registered_stores`, `no_registered_stores`, `unknown_store`, `store_identity_mismatch`, `unhealthy_store_root`, `store_path_not_supported`, `invalid_store_pointer`, `initiative_option_removed`, `areas_option_removed`; pass-through: `invalid_store_id`, `invalid_store_registry`, `invalid_store_metadata`.

### OpenSpec-root health (error, no fix)
`openspec_store_root_missing`, `openspec_root_missing`, `openspec_config_missing`, `openspec_specs_missing`, `openspec_changes_missing`, `openspec_archive_missing`, plus `_not_directory` variants of each.

### Store registry/identity/state
`invalid_store_id`, `invalid_store_registry`, `invalid_store_metadata`, `store_registry_busy`, `store_not_found`, `no_store_registry`, `store_registry_changed`, `store_metadata_missing`, `store_metadata_id_mismatch`, `store_metadata_invalid`, `store_id_conflict`, `store_path_conflict`, `store_already_registered` (info).

### Store setup/register/remove
`store_setup_id_required`, `store_setup_path_required`, `store_setup_path_not_directory`, `store_setup_inside_git_repo`, `store_setup_non_empty_directory`, `store_setup_cancelled`, `store_path_required`, `store_path_missing`, `store_path_not_directory`, `store_register_root_unhealthy`, `store_register_identity_confirmation_required`, `store_register_cancelled`, `store_remote_empty`, `store_remote_requires_hand_edit`, `store_remove_confirmation_required`, `store_remove_cancelled`, `store_remove_path_not_directory`, `store_remove_metadata_missing`, `store_root_missing` (warning in remove, error in doctor), `store_root_not_directory`.

### Store git
`store_git_init_failed`, `store_git_identity_missing`, `store_git_commit_failed`, `store_git_no_commits` (warning), `store_clone_fragile_directories` (warning), `store_remote_divergence` (info, doctor).

### References (warning)
`reference_invalid_id`, `reference_registry_unreadable`, `reference_unresolved`, `reference_root_unhealthy`, `reference_index_truncated`.

### Relationships (warning; doctor; context keeps only the registry one)
`relationship_registry_unreadable`, `root_pointer_ignored`, `root_pointer_invalid`, `pointer_declarations_inert`.

### Archive (JSON mode)
`archive_change_name_required`, `archive_change_not_found`, `archive_validation_failed`, `archive_confirmation_required`, `archive_tasks_incomplete`, `archive_spec_update_failed`, `archive_spec_validation_failed`, `archive_target_exists`, `archive_error`.

### Context writes
`context_file_exists`, `context_output_dir_missing`.

### Fallbacks
`doctor_failed`, `context_failed`, `store_error`, `change_error`, `archive_error`.

## Known inconsistencies

Recorded by the capstone audit; published-key renames are product decisions deferred past this release:

1. ~~In `--json` mode, several failure paths printed stderr only with no JSON document.~~ Fixed in the capstone gauntlet round: `show`/`validate` unknown and ambiguous items emit `{status:[{code: unknown_item | ambiguous_item, ...}]}`; thrown errors in `status`/`instructions`/`list`/`show`/`validate` route through the JSON-aware failure helper (the command's null-shape + `status`); `store <unknown subcommand> --json` emits `{status:[{code: unknown_store_subcommand}]}`; `list` carries its `{changes|specs: [], root: null}` null-shape on resolution failures.
2. `store_root_missing` is emitted with two severities (warning in remove, error in store doctor) — context-dependent, documented above.
3. snake_case (store family) vs camelCase (workflow family) key casing; `root.store_id` is snake_case everywhere.
4. Four parallel envelope type declarations exist in src; archive diagnostics never carry `target`.
5. `list --json` reuses the `status` key as a string enum per change.
6. Only `validate` output carries a `version` field.
7. `schemas`/`templates` ignore root selection (cwd-based, no `--store`).
8. Deprecated noun forms (`change`/`spec` subcommands) emit unenveloped payloads without `root`/`status`.
