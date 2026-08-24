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

**Choice:** Use the `diff` npm package (BSD-3-Clause, zero runtime dependencies, about 1 MB unpacked) for the MODIFIED requirement case.

**Alternatives considered:**
- **Implement from scratch** — Unified diff is well-specified but subtle (context lines, hunk headers). A library avoids bugs and maintenance burden.
- **Shell out to `diff` command** — Not cross-platform (Windows lacks `diff` by default). Violates the project's cross-platform requirements.

The `diff` package provides `structuredPatch()`, which generates structured unified-diff hunks from two strings. OpenSpec renders those hunks without synthetic file headers.

### 3. Requirement block extraction

**Choice:** Extract raw markdown text for a requirement block from a spec file by:
1. Finding the `### Requirement: <name>` header line
2. Collecting all lines until the next `###` header at the same or higher level (or EOF)
3. Including the header line itself in the extracted block

This reuses `MarkdownParser.extractRequirementsSection()` to limit matching to the requirements section, then scans raw markdown so the diff remains human-readable.

**Matching:** Requirement names are matched exactly after trimming. A case- or interior-whitespace-folded match is used only to produce a useful preview together with a warning, because archive matching is exact. When a MODIFIED requirement follows one or more RENAMED entries, the rename lineage resolves back to the original main-spec name.

### 4. Integration point: `ChangeCommand.show()`

**Choice:** Add diff logic to `ChangeCommand.show()` in `src/commands/change.ts`. When `--diff` is set:
- Discover delta files with the shared `discoverSpecFiles()` helper and parse each one with `parseDeltaSpec()`
- In text mode: group output by capability and show each requirement with its operation and, for MODIFIED, the colorized diff
- In JSON mode: enrich each MODIFIED delta with its available `diff` and `warning` fields
- Propagate discovery and read failures so an unreadable spec cannot appear as an empty or partial diff

**Alternative:** A separate `openspec diff` command. Rejected because the diff is about *viewing* a change, which is what `show` does. Adding a flag is more discoverable and consistent.

### 5. Diff output format

**Text mode:** Per capability, per requirement:
- Header: capability name and operation
- ADDED/REMOVED/RENAMED: display the requirement text as-is (prefixed with operation label)
- MODIFIED: unified diff of the requirement block, colorized with chalk (green for `+`, red for `-`, dim for headers/context). A textually identical block prints `(no textual changes)`.

**JSON mode:** `--json --diff` extends the existing `--json` output (same `{ id, title, deltaCount, deltas }` structure). A MODIFIED delta receives each diagnostic that applies: `diff`, `warning`, or both. ADDED/REMOVED/RENAMED deltas are unchanged. This is backwards-compatible: consumers that do not request `--diff` receive the existing shape.

### 6. Flag registration

Add `--diff` to:
- `openspec show` (top-level, passed through as a change-only flag)
- `openspec change show` (direct)

Add `'diff'` to the `CHANGE_FLAG_KEYS` set in `src/commands/show.ts` so it triggers a warning when used with `--type spec`.

## Risks / Trade-offs

- **\[New dependency\]** Adding `diff` increases the installed package set by about 1 MB unpacked. → It has no runtime dependencies and uses the BSD-3-Clause license. The lockfile and Nix dependency hash pin the package.
- **\[Requirement name mismatch\]** If a MODIFIED requirement's `### Requirement:` header does not match the base spec exactly, archive will reject it. → Show a folded near-match diff when possible, but retain a warning in both text and JSON output. Otherwise show the full MODIFIED text with a warning.
- **\[Unreadable input\]** Suppressing a discovery or read error could produce a misleading partial diff. → Propagate all discovery and delta-read errors, and suppress only `ENOENT` when probing for an absent main spec.
- **\[Path display on Windows\]** Capability names derived from directory names are platform-safe already. Paths used in diff headers should use forward slashes for readability. → Normalize display paths using `.replace(/\\/g, '/')` for display only; use `path.join()` for all filesystem operations.
