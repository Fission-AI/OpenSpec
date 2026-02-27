## Context

The `openspec list` command lives in `src/core/list.ts` and is invoked from `src/cli/index.ts`. It currently supports two modes: `changes` (default) and `specs`. The CLI passes a single `mode` and `options` (sort, json). For changes, the implementation scans `openspec/changes/`, excludes the `archive` subdirectory, collects task progress and last-modified times, and either prints a table or JSON `{ changes: [...] }`. For specs, it scans `openspec/specs/`, parses each `spec.md` for requirement count, and always prints a human-readable table—the `json` option is never checked in the specs branch. Archived changes live under `openspec/changes/archive/` as dated directories (e.g. `2025-01-13-add-list-command`); there is no CLI surface to list them. All path operations use `path.join` / Node `path` for cross-platform behavior.

## Goals / Non-Goals

**Goals:**

- In specs mode, when `--json` is set, output a single JSON object with key `specs` and an array of `{ id, requirementCount }` (empty array when no specs).
- Add a third mode, archive, so that `--archive` lists directories under `openspec/changes/archive/`, with the same `--sort` and `--json` behavior as active changes.
- Keep JSON shape for archive consistent with active changes where applicable (e.g. `name`, `lastModified`, task counts, `status`) under a root key `archivedChanges`.
- Enforce a single effective mode per run (changes vs specs vs archive); define precedence or reject conflicting flags.

**Non-Goals:**

- Changing the layout of `openspec/changes/archive/` or adding new directories.
- Integrating archive list into the `view` dashboard or other commands.
- Adding new list output formats (e.g. CSV or custom columns).

## Decisions

1. **Mode type and precedence**  
   Extend the list mode from `'changes' | 'specs'` to `'changes' | 'specs' | 'archive'`. When the user passes multiple of `--changes`, `--specs`, `--archive`, use a fixed precedence so one mode wins (e.g. `--archive` > `--specs` > default changes). This avoids a breaking “error on conflict” and keeps the CLI simple. **Alternative considered**: Reject multiple flags with an error; we prefer precedence for consistency with other tools and fewer user-facing errors.

2. **Specs JSON shape**  
   Output `{ "specs": [ { "id": "<dir>", "requirementCount": number } ] }`. Reuse the existing in-memory `SpecInfo`-like structure; only add a branch that, when `options.json` is true, serializes that array under the key `specs` and returns (no table). Empty list: `{ "specs": [] }`. No new fields (e.g. no lastModified for specs in this change). **Alternative**: Add optional fields (e.g. spec title from frontmatter); deferred to keep scope minimal.

3. **Archive data source and JSON shape**  
   Scan only `path.join(targetPath, 'openspec', 'changes', 'archive')` for direct child directories. Reuse `getTaskProgressForChange` and `getLastModified` so each archived change has the same fields as active changes: `name`, `completedTasks`, `totalTasks`, `lastModified` (ISO string in JSON), and derived `status`. Root key: `archivedChanges`. This allows scripts to handle active and archived lists with the same schema. **Alternative**: Minimal archive (name only); we chose parity with changes for consistency and future scripting.

4. **Empty and error behavior for archive**  
   If `openspec/changes/` or `openspec/changes/archive/` is missing, treat as “no archived changes” and output empty list / “No archived changes found.” (no exit code 1). Only fail hard when the project is not an OpenSpec root (e.g. no `openspec/changes/` at all), matching current list behavior for changes. **Alternative**: Fail if archive directory is missing; we prefer not to require archive to exist.

5. **Path handling**  
   All new and touched paths use `path.join()` (or equivalent) and the Node `path` module; no hardcoded slashes. Tests that assert paths use `path.join` for expected values to stay cross-platform.

## Risks / Trade-offs

- **[Risk]** Multiple list-mode flags (e.g. `--specs --archive`) might surprise users. **[Mitigation]** Document precedence in help and in `openspec/specs/cli-list/spec.md`; keep precedence simple and stable (e.g. archive > specs > changes).
- **[Trade-off]** Archive mode reuses task counting and lastModified; archived changes with broken or missing `tasks.md` will show as “no tasks” or similar, which is acceptable and consistent with active changes.
