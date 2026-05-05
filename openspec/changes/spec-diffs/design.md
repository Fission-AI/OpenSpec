## Context

`openspec show <change>` currently displays the raw proposal markdown (text mode) or a parsed JSON with deltas extracted from the proposal's Capabilities section. Delta spec files under `openspec/changes/<name>/specs/<cap>/spec.md` contain full requirement text including unchanged content copied from the base spec at `openspec/specs/<cap>/spec.md`.

Reviewers need to see *what changed* without manually diffing files. The `--diff` flag adds this capability to the existing show command.

The project currently has no diff dependency. chalk is already available for colorized output.

## Goals / Non-Goals

**Goals:**
- Let users see per-requirement diffs of delta specs via `openspec show <change> --diff`
- Support both text (colorized) and JSON output modes
- Keep the implementation minimal — no changes to storage format, validation, or the archive workflow

**Non-Goals:**
- Changing the delta spec format to store diffs instead of full text (future work, approach 2 from proposal)
- Diffing non-spec artifacts (proposal, design, tasks)
- Providing interactive diff navigation or side-by-side views
- Git-aware diffing (this compares files on disk)

## Decisions

### 1. Per-requirement diffing, not whole-file

**Choice:** Diff individual requirement blocks, not entire spec files.

The delta spec format already categorizes requirements by operation (`## ADDED`, `## MODIFIED`, `## REMOVED`, `## RENAMED`). Only MODIFIED requirements need a diff — the others are self-explanatory:

- **ADDED** — display the full requirement text (it's all new)
- **REMOVED** — display the removal notice (Reason/Migration already present)
- **RENAMED** — display the FROM:/TO: (already present)
- **MODIFIED** — match by requirement name (`### Requirement: <name>`) against the base spec at `openspec/specs/<cap>/spec.md`, extract both blocks, and compute a unified diff of those blocks

**Rationale:** The existing `ChangeParser` already parses delta specs into individual requirements with operations. The `MarkdownParser` already parses base specs into requirement blocks. We match by the `### Requirement:` header text (the same matching the archive step uses). This gives focused, meaningful output without noise from unchanged requirements.

**Alternative rejected:** Whole-file diff of base spec vs delta spec. This works but shows context from unchanged requirements that were copied verbatim into the delta file, which is exactly the noise the user wants to eliminate.

### 2. Diff library: `diff` (npm)

**Choice:** Use the `diff` npm package (MIT, ~40KB, zero dependencies, widely used) for the MODIFIED requirement case.

**Alternatives considered:**
- **Implement from scratch** — Unified diff is well-specified but subtle (context lines, hunk headers). A library avoids bugs and maintenance burden.
- **Shell out to `diff` command** — Not cross-platform (Windows lacks `diff` by default). Violates the project's cross-platform requirements.

The `diff` package provides `createPatch()` which generates standard unified diff output from two strings.

### 3. Requirement block extraction

**Choice:** Extract raw markdown text for a requirement block from a spec file by:
1. Finding the `### Requirement: <name>` header line
2. Collecting all lines until the next `###` header at the same or higher level (or EOF)
3. Including the header line itself in the extracted block

This reuses the section-parsing logic already in `MarkdownParser` but needs a function that returns the raw markdown text (not the parsed `Requirement` object) so the diff is human-readable.

**Matching:** Requirement names are matched case-insensitively and whitespace-insensitively, consistent with how the archive step matches requirements. When a MODIFIED requirement's name matches a RENAMED entry's TO name in the same spec, the base block is looked up using the RENAMED FROM name instead — mirroring the archive step's behavior where RENAMED is applied before MODIFIED.

### 4. Integration point: `ChangeCommand.show()`

**Choice:** Add diff logic to `ChangeCommand.show()` in `src/commands/change.ts`. When `--diff` is set:
- In text mode: iterate delta specs, group output by capability, show each requirement with its operation and (for MODIFIED) the colorized diff
- In JSON mode: add a `diff` field to each MODIFIED delta in the output object

**Alternative:** A separate `openspec diff` command. Rejected because the diff is about *viewing* a change, which is what `show` does. Adding a flag is more discoverable and consistent.

### 5. Diff output format

**Text mode:** Per capability, per requirement:
- Header: capability name and operation
- ADDED/REMOVED/RENAMED: display the requirement text as-is (prefixed with operation label)
- MODIFIED: unified diff of the requirement block, colorized with chalk (green for `+`, red for `-`, dim for headers/context)

**JSON mode:** `--json --diff` extends the existing `--json` output (same `{ id, title, deltaCount, deltas }` structure). For each MODIFIED delta, a `diff` string field is added containing the raw unified diff text. ADDED/REMOVED/RENAMED deltas are unchanged. This is backwards-compatible: consumers that don't look for `diff` see the same shape they always did.

### 6. Flag registration

Add `--diff` to:
- `openspec show` (top-level, passed through as a change-only flag)
- `openspec change show` (direct)

Add `'diff'` to the `CHANGE_FLAG_KEYS` set in `src/commands/show.ts` so it triggers a warning when used with `--type spec`.

## Risks / Trade-offs

- **\[New dependency\]** Adding `diff` increases the dependency footprint slightly. → The package is small, zero-dep, and MIT. Acceptable for the functionality gained.
- **\[Requirement name mismatch\]** If a MODIFIED requirement's `### Requirement:` header doesn't match the base spec (after whitespace normalization), the diff can't find the base block. → Fall back to showing the full MODIFIED text with a warning. Note: `openspec validate` does not currently check this — the mismatch is only caught at archive time by `buildUpdatedSpec()`. The `--diff` warning becomes a useful early signal of the problem.
- **\[Path display on Windows\]** Capability names derived from directory names are platform-safe already. Paths used in diff headers should use forward slashes for readability. → Normalize display paths using `.replace(/\\/g, '/')` for display only; use `path.join()` for all filesystem operations.
