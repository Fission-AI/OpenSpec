## Context

Today every artifact in a schema is implicitly written under `openspec/changes/<change>/`, then moved into `openspec/changes/archive/<date>-<change>/` when the change is archived. The path is computed once at `instructions.ts:174` as `path.join(changeDir, artifact.generates)` and the same `changeDir` join is used by `state.ts:14-29` for completion detection.

There is a class of artifact — Architecture Decision Records being the canonical example — that should outlive a single change: ADRs accumulate across changes, are referenced from future proposals, and are maintained in place rather than archived. Today the only places to put them are inside the change (where they get archived) or inside `openspec/specs/` (where they get treated as a synced delta source-of-truth). Neither fits.

The proposal adds an optional `folder:` field on artifact definitions that re-parents an artifact to a repo-root-relative directory and removes it from the archive lifecycle.

## Goals / Non-Goals

**Goals:**
- One new optional field — `folder:` on artifact definitions — that schema authors can use to write artifacts outside the change directory.
- Path resolution, completion detection, and instruction rendering all honor the field consistently from a single resolution helper.
- Validation forbids paths that escape the project root, are absolute, or collide with the reserved `openspec/` prefix.
- Existing schemas (including the built-in `spec-driven`) keep working unchanged.

**Non-Goals:**
- No delta format for external artifacts. They are read-and-modify-in-place files; version control is the history record.
- No auto-injection of existing file contents into the rendered instruction. The schema's `instruction:` text is responsible for telling the agent to read the folder before writing. (Tracked as a future enhancement if non-determinism becomes a problem.)
- No special UI in `openspec status` for external artifacts — completion is binary per artifact regardless of where the file lives.
- No template-substitution in `folder:` values for v1 (no `{change}` interpolation). Static paths only. Revisitable later if a real need surfaces.
- No changes to archive logic. External artifacts live outside the change directory, so the wholesale `moveDirectory(changeDir, archivePath)` at `archive.ts:284` does not touch them and does not need to.

## Decisions

### 1. Field name and shape

A new optional string field `folder:` on each artifact, sibling to `generates:` and `template:`.

```yaml
artifacts:
  - id: adr
    folder: ADR             # NEW — repo-root-relative directory
    generates: "*.md"       # unchanged — pattern relative to folder
    template: adr.md
    instruction: |
      ...read existing files in ADR/ and decide modify-vs-add...
```

**Why a separate field, not embedded in `generates:`:** Two reasons. First, `generates:` is already a glob pattern (`fast-glob`-compatible) used by `artifactOutputExists()` at `outputs.ts:40-42`; overloading it with a base-dir prefix would require new parsing rules. Second, `folder:` is orthogonal to `generates:` — one says *where*, the other says *what files match*. Keeping them separate matches how the rest of the codebase already thinks about base-dir + pattern.

**Alternative considered:** Use a structured `generates: { folder: "ADR", pattern: "*.md" }`. Rejected — it's a breaking change to existing schemas (`generates: "tasks.md"` is everywhere) and forces every YAML reader to handle two shapes. The opt-in sibling field is strictly additive.

### 2. Path resolution rules

`folder:`, when set, is resolved as `path.resolve(projectRoot, folder)`. `projectRoot` is `process.cwd()` per existing convention (`instructions.ts:52`, `status.ts:40`). The result must remain a descendant of `path.resolve(projectRoot)` after resolution — this is the path-traversal guard.

When `folder:` is unset, the existing rule applies: artifact base directory is `changeDir = path.join(projectRoot, 'openspec', 'changes', changeName)`.

A single helper centralizes this rule:

```ts
// src/core/artifact-graph/paths.ts (new)
export function resolveArtifactBaseDir(
  artifact: Artifact,
  changeDir: string,
  projectRoot: string,
): string {
  if (!artifact.folder) return changeDir;
  return path.resolve(projectRoot, artifact.folder);
}
```

Every call site that currently uses `changeDir` for artifact path math switches to this helper. There are three: `instructions.ts:174` (Write-to path), `state.ts:14-29` via `artifactOutputExists()` (completion detection), and the JSON `outputPath` field returned by `instruction-loader.ts:271`.

**Why one helper:** Keeps the resolution rule in one place. If we later add `{change}` substitution or per-schema base-dir overrides, only this function changes.

### 3. Validation rules

In the Zod schema (`types.ts`), `folder:` is `z.string().optional()` with a `.refine()` enforcing:

- Non-empty after `trim()`
- Not absolute (`!path.isAbsolute(folder)`)
- After `path.resolve(folder)` from a stub root, no segment escapes (no leading `..` after normalization)
- Does not start with `openspec/` or equal `openspec` (reserved — those paths belong to the change/archive/specs lifecycle)
- No POSIX-only or Windows-only separator surprises — normalized via `path.normalize()` before checks

`schema.ts:138-224`'s `validateSchema()` runs the existing Zod parse plus template-existence checks; the new rules ride along inside the Zod refinement, so `openspec schema validate` reports them automatically without new branching there.

**Why Zod refinement, not a separate validate-time check:** `parseSchema()` is the single load path used by every consumer (graph builder, validate command, instructions command). Putting the rule in Zod means no consumer can load an invalid `folder:` value into memory. A separate validate-time check would let `openspec instructions` happily render against a malformed `folder:` if validate hadn't been run.

### 4. Status / completion detection

`artifactOutputExists(changeDir, generates)` at `outputs.ts:40-42` is the existing globbing helper. Rather than change its signature, callers (`detectCompleted()` at `state.ts:14-29` and any future ones) compute the right base dir via `resolveArtifactBaseDir()` and pass it as the first argument. The helper's contract — "does this glob match anything under this base dir?" — is unchanged.

Counting stays as it is: every artifact contributes 1 to the denominator regardless of `folder:`. A `done` external artifact and a `done` change-internal artifact are indistinguishable in the status output.

### 5. Archive: no change

Archive logic at `archive.ts:284` does `moveDirectory(changeDir, archivePath)` — it moves the directory contents wholesale, not per-artifact. Files written to `folder:` paths live outside `changeDir`, so they are physically inaccessible to this operation and require no skip logic.

The archive command does, however, gain a sanity assertion: before moving, walk the schema's artifact list and confirm any artifact with `folder:` has at least one matching file at its resolved location (or zero files, both acceptable). This catches the case where an agent forgot to write the external file before archiving. **This is a preflight warning, not a hard block.**

### 6. Re-run behavior for existing files

When `openspec instructions <id> --change <name>` renders for an external artifact whose target file already exists, the tool emits the instruction normally. The instruction text (which the schema author writes) is the only thing telling the agent "read the existing file before deciding what to write." The tool does not:

- Pre-read the file and inject its contents
- Refuse to render
- Modify the rendered template

The agent (Claude or otherwise) is expected to use its `Read` tool against the target before writing. This is **explicitly Option B** from the discussion: the lighter-weight starting point. We can add automatic content injection in a follow-up change if instruction-only proves unreliable.

## Risks / Trade-offs

- **Path traversal via `..` or symlinks** → Validation rejects `..` segments after normalization; `path.resolve()` is used everywhere so symlink-traversal is bounded by OS-level permissions, not string parsing. Adding an `fs.realpath()` check is overkill for v1.
- **Cross-platform path separators** → `path.join()`/`path.resolve()`/`path.normalize()` exclusively. No string concatenation. Already a project rule and existing helpers comply.
- **Concurrent changes touching the same external folder** → Two changes whose schemas both target `ADR/` could race on file writes. Out of scope; users coordinate via VCS as they do today for any shared file. Worth a one-line caveat in the schema authoring guide.
- **Agent drift on re-run** → Option B trusts the LLM to read existing files. If it doesn't, content gets clobbered. Mitigation: the schema's `instruction:` text is where this is enforced; the docs example for `folder:` will include strong wording. If clobbering becomes a real problem, the follow-up is auto-injection (Option C from the discussion).
- **Status counts external artifacts as "done" via glob match** → If the agent writes to the wrong filename within `folder:` but matches the glob anyway, status reports `done` falsely. This is the same risk that already exists for in-change artifacts; no new failure mode.
- **Discoverability** → A new schema author may not know `folder:` exists. Mitigation: schema authoring guide entry and the validation error messages reference it ("did you mean to set `folder:`?").

## Migration Plan

No data migration. The field is opt-in and additive.

Rollout steps:
1. Land schema type, validation, resolution helper, and call-site updates together — they are tightly coupled.
2. Update `openspec schemas` and the schema authoring guide with the new field.
3. Built-in `spec-driven` schema is unchanged (no `folder:` declarations).
4. Existing changes in flight need no action — their schemas don't declare `folder:`.

Rollback: revert the commit. The field is opt-in, so any schema using it falls back to "unknown field" Zod errors on the prior version; that's acceptable for a feature-gate revert and indicates the schema needs to be updated.

## Open Questions

- **Schema authoring guide location** — there isn't currently a dedicated authoring guide separate from the schema validation docs. Do we add a new doc page or expand `openspec/specs/schema-resolution/spec.md`-adjacent docs? Defer to the docs pass during implementation.
- **`generates:` glob behavior when `folder:` is set** — if `generates: "*.md"` and `folder: ADR`, completion detection matches any markdown in `ADR/`. If the schema author wants a stricter pattern (e.g., `[0-9]*-*.md`), do we encourage that in the authoring guide? Recommend yes; not a code change.
- **Preflight warning vs block on archive** — design says warn. If users complain about silent skips, we revisit.
