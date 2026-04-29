## Why

Schemas currently force every artifact into the change directory (`openspec/changes/<change>/`), where files are either archived or sit dormant after the change ships. Some artifacts — Architecture Decision Records being the canonical example — are most useful *after* the change is done and across future changes, but they don't belong in the merged source-of-truth specs either. Authors of custom schemas have no way to declare "this artifact lives outside `openspec/`, persists past the change lifecycle, and is maintained in place going forward."

## What Changes

- Add an optional `folder:` field to artifact definitions in schema YAML.
- When `folder:` is omitted (default), behavior is unchanged: the artifact is written under `openspec/changes/<change>/` and follows normal lifecycle (instructions, status, archival).
- When `folder:` is set, it is interpreted as a **repo-root-relative** path (e.g., `folder: ADR`) and the artifact is written there. The change name is *not* injected into the path — schema authors control the full layout.
- Artifacts with a `folder:` set are **never archived**. They live outside the change directory, so the wholesale `moveDirectory(changeDir, …)` archive operation physically cannot touch them — no skip logic, no preflight warning, no flag is needed. Version control is the source of history (no delta format, no archival sweep). Documentation will note this contract for schema authors.
- Re-running the artifact (e.g., on `/opsx:continue`) does not overwrite existing files at the target path. The schema's `instruction:` text is responsible for telling the agent to read existing files in the folder, decide whether to modify them in place or add new ones, and avoid clobbering prior content. The tool itself does not auto-inject existing file contents into the prompt — that can be added later if non-deterministic behavior proves to be a problem.
- `openspec status` counts external artifacts identically to in-change artifacts (e.g., `Progress: 4/4 complete`). No separate category, no special UI — completion is binary per artifact regardless of where the file lives.
- Schema validation rejects `folder:` values that are absolute, escape the repo root after resolution, or collide with the reserved `openspec/` prefix. Validation reuses Node's stdlib `path` module — no new cross-platform code; existing `FileSystemUtils` helpers cover the rest.
- **BREAKING**: none. The field is opt-in; existing schemas continue to work.

## Capabilities

### New Capabilities

_None._ This is a refinement of existing artifact/workflow/archive behavior, not a new capability.

### Modified Capabilities

- `artifact-graph`: extend the artifact schema to accept an optional `folder:` field; surface it on the loaded `ArtifactGraph` model and have `resolveArtifactOutputs()` honor it as the single point of path resolution. Downstream consumers (status detection, instruction rendering) inherit the new behavior transitively without code changes of their own.
- `cli-artifact-workflow`: the `instructions` command's `Write to:` path resolves through `folder:` when set; `status` continues to count external artifacts identically to in-change artifacts; re-running an external artifact does not scaffold from the template if files already exist — it leaves the agent to inspect and modify them per the schema's instruction text.
- `schema-validate-command`: validate `folder:` values (relative path, stays under repo root after `path.resolve`, not under `openspec/`).

## Impact

- **Schema YAML**: new optional field on artifacts; built-in `spec-driven` schema is unaffected.
- **Code**: schema Zod type + refinement, a new `resolveArtifactBaseDir` helper, and a single touch-up inside `resolveArtifactOutputs()`. `state.ts`, `instruction-loader.ts`, `archive.ts`, and `schema.ts` are untouched — they reach the new behavior transitively.
- **Docs**: schema authoring guide gains a section on external folders and the "no archive, no delta" contract — see [`docs/customization.md` → External Folder Artifacts](../../../docs/customization.md#external-folder-artifacts).
- **No data migration** — existing changes have no `folder:` declarations, so behavior is identical for them.
