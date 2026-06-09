## Context

ClearSpec is a fork of OpenSpec. While the CLI binary, package name, and most user-facing copy have already been rebranded to "ClearSpec", three layers of the original "openspec" identity remain:

1. **Generated artifacts** — `clearspec init` creates a change-management folder literally named `openspec/`, generated command titles use the `OPSX:` prefix, and generated skills declare `author: openspec`.
2. **Ancillary identifiers** — global config/data directories (`~/.config/openspec`), the `OPENSPEC_NO_COMPLETIONS` env var, managed-block markers (`<!-- OPENSPEC:START -->`), the checked-in metadata filename (`.openspec.yaml`), and workspace/context-store metadata directories (`.openspec-workspace`, `.openspec-store`).
3. **Internal source** — the `OPENSPEC_DIR_NAME` / `OPENSPEC_MARKERS` constants, `getOpsx*` template functions, ~25 files with hardcoded `'openspec'` path literals, schema instruction text, docs, and test fixtures.

The decisive constraint is **coexistence**: ClearSpec and OpenSpec serve different purposes and must run side by side in the same project. A real OpenSpec installation owns the `openspec/` directory, may write `<!-- OPENSPEC:START -->` marker blocks into shared config files (e.g. `CLAUDE.md`), and may create `.claude/commands/openspec/`. Any ClearSpec code that reads, deletes, or rewrites an openspec-named path is therefore not just a branding issue — it is a correctness bug that can corrupt a working OpenSpec installation.

The research surfaced exactly such bugs in `src/core/legacy-cleanup.ts`, which today deletes `openspec/AGENTS.md` and strips `<!-- OPENSPEC:START/END -->` blocks.

## Goals / Non-Goals

**Goals:**
- `clearspec init` generates and operates exclusively on a `clearspec/` home; commands are titled `CLSX:`; skills are authored by `clearpoint`.
- ClearSpec's ancillary identifiers (global dirs, env var, markers, dotfiles, metadata dirs) are all ClearSpec-specific so they never collide with OpenSpec.
- ClearSpec never reads, writes, renames, deletes, or migrates any `openspec`-named path. A pre-existing `openspec/` is left untouched.
- The string "openspec" (case-insensitive) no longer appears anywhere in the repository **except** the MIT `LICENSE` file.
- Cross-platform correctness preserved (macOS/Linux/Windows), verified on CI.

**Non-Goals:**
- No automatic migration of an existing `openspec/` folder into `clearspec/`. The two coexist; users who want to move content do so manually.
- No change to the `LICENSE` attribution.
- No change to end-user projects' `openspec/` folders created by the real OpenSpec tool — they are out of ClearSpec's scope entirely.
- No behavioral change to the spec-driven workflow itself beyond the names involved.

## Decisions

### Decision 1: Single source of truth for the home folder name (CLI code only)
Replace the constant `OPENSPEC_DIR_NAME = 'openspec'` (in `src/core/config.ts`) with `CLEARSPEC_DIR_NAME = 'clearspec'`, and refactor the ~25 files that currently hardcode the `'openspec'` string literal in `path.join(..., 'openspec', ...)` to import and use the constant instead.

- **Why**: The project rules state "If we generate it, we track it by name in a constant" and "Use existing constants and lists — don't invent detection mechanisms." Centralizing prevents a future drift where some paths say `clearspec` and others say `openspec`, and makes the rename auditable.
- **Alternative considered**: Mechanical find-and-replace of the literal `'openspec'` → `'clearspec'` everywhere. Rejected: it leaves dozens of duplicated literals (fragile), and risks rewriting legitimate references to OpenSpec-as-a-product or the LICENSE.
- **Scope of the constant — important**: The constant is the source of truth only for **TypeScript code** (the CLI's `path.join` calls). It does *not* and *cannot* propagate to the dispersed text artifacts by reference. The folder name reaches the other surfaces in three tiers:
  1. **CLI code** — imports `CLEARSPEC_DIR_NAME` directly. This is where path correctness matters.
  2. **Generated skills/commands** — these are emitted text. The bulk of them never name the folder; they invoke the `clearspec` CLI (`clearspec status`, `clearspec list`, `clearspec instructions ...`) and let the CLI resolve the path via the constant, so they stay folder-agnostic. The few template strings that do spell a literal path (`openspec/specs/...`, `.openspec.yaml` in `archive-change.ts`, `bulk-archive-change.ts`, `propose.ts`, `sync-specs.ts`) are produced by TS template functions and SHALL interpolate `CLEARSPEC_DIR_NAME` / the metadata-filename constant when building the string — single source of truth preserved at generation time. The emitted artifact is then a static snapshot.
  3. **Static schema/doc files** (`schemas/spec-driven/*`, `docs/**`) — plain YAML/markdown that cannot import a constant; these carry the literal `clearspec` string, kept consistent by the scoped check in the verification step.

### Decision 2: Rename every ancillary identifier, do not merely repoint
Rename, with their own constants where they exist:
- `OPENSPEC_MARKERS` → `CLEARSPEC_MARKERS` (`<!-- CLEARSPEC:START -->` / `<!-- CLEARSPEC:END -->`).
- `GLOBAL_CONFIG_DIR_NAME` / `GLOBAL_DATA_DIR_NAME` → `'clearspec'`.
- `OPENSPEC_NO_COMPLETIONS` env var → `CLEARSPEC_NO_COMPLETIONS` (source + `scripts/test-postinstall.sh`).
- `METADATA_FILENAME` `.openspec.yaml` → `.clearspec.yaml`.
- `WORKSPACE_METADATA_DIR_NAME` `.openspec-workspace` → `.clearspec-workspace`; `CONTEXT_STORE_METADATA_DIR_NAME` `.openspec-store` → `.clearspec-store`.

- **Why coexistence demands renaming, not aliasing**: If ClearSpec kept writing/reading `<!-- OPENSPEC:START -->` markers or `~/.config/openspec`, it would read and mutate state owned by a co-installed OpenSpec. Distinct names are what make side-by-side operation safe.

### Decision 3: Make legacy-cleanup coexistence-safe
`legacy-cleanup` stops treating any `openspec`-named artifact as a legacy target:
- Remove detection/deletion of `openspec/AGENTS.md` and the `openspec/project.md` migration hint.
- Remove deletion of legacy `openspec`-named slash-command directories (e.g. `.claude/commands/openspec/`).
- Cleanup of shared config files removes **only** `<!-- CLEARSPEC:START/END -->` blocks, never `OPENSPEC` blocks.

- **Why**: ClearSpec cannot distinguish "an openspec folder left by an old ClearSpec" from "an openspec folder owned by a live OpenSpec install." The user's directive is explicit — they coexist — so the safe behavior is to never touch openspec-named paths. This trades automatic upgrade tidiness for safety (see Risks).
- **Alternative considered**: Attribution heuristics (e.g. only delete `.claude/commands/openspec/` if it contains ClearSpec markers). Rejected as over-engineering and still risky; project rules prefer "explicit lookups over pattern matching."

### Decision 4: Rename internal template identifiers
Rename `getOpsx*CommandTemplate` / `getOpsxProposeSkillTemplate` → `getClsx*` across `src/core/templates/workflows/*.ts`, `skill-templates.ts`, and `skill-generation.ts`, and change the 12 hardcoded `author: 'openspec'` literals to `author: 'clearpoint'`. Align the fallback default in `skill-generation.ts` (currently `'clearspec'`) — leave as `'clearspec'` since it is the product-level default for templates that omit an author; the explicit ClearSpec-generated templates set `clearpoint`.

- **Why**: Satisfies "no mention of openspec in the repo" for code identifiers and honors the user's explicit `clearpoint` author value. `OPSX`/`opsx` is OpenSpec's experimental-workflow shorthand; `CLSX` is the ClearSpec equivalent.

### Decision 5: Clean break, no auto-migration
ClearSpec generates only `clearspec/` going forward. There is no detection-and-rename of an existing `openspec/`.

- **Why**: Per the user, an existing `openspec/` belongs to OpenSpec and must sit untouched beside `clearspec/`. Auto-migration would violate coexistence and risk data loss.

### Decision 6: Sweep docs, schemas, and tests
Update `schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/proposal.md`, all `docs/**`, `README.md`, and all test fixtures that construct `path.join(..., 'openspec', ...)` to use `clearspec`. Tests must use `path.join()` for expected paths, not hardcoded separators.

### Decision 7: Do NOT touch the repository's own OpenSpec dev instance
This repository is developed using the separately-installed **OpenSpec** tool, which reads this repo's `openspec/` planning folder and uses the `.claude/` skills. These are dev tooling, not ClearSpec product source. Therefore:
- The repo's `openspec/` folder (including branded capability names like `openspec-conventions`, `opsx-archive-skill`) is **never renamed**.
- The repo's `.claude/` skills are **never renamed or modified**.
- This is safe precisely because of Decision 1: after the rename, the product `clearspec` binary resolves a `clearspec/` home, while the separate `openspec` binary continues to resolve this repo's `openspec/` home. The two operate independently in the same repo.

- **Why**: The maintainers need their existing spec-driven workflow intact while building ClearSpec. Renaming their planning folder would break the `openspec` tool they use day-to-day.

## Risks / Trade-offs

- **Existing ClearSpec users lose auto-cleanup of their old openspec-named artifacts** → Mitigation: document manual cleanup in the changelog/migration notes; the leftover artifacts are inert clutter, not breakage. This is the deliberate cost of coexistence safety.
- **Existing projects' `<!-- OPENSPEC:START -->` blocks (written by current ClearSpec) become orphaned** after the marker rename, since cleanup now only touches `CLEARSPEC` blocks → Mitigation: acceptable; orphaned blocks are harmless, and touching them risks deleting a real OpenSpec block. Note in migration docs.
- **A missed hardcoded literal leaves a split-brain path** (some code reads `clearspec/`, some `openspec/`) → Mitigation: centralize on the constant (Decision 1) and add a **scoped** guard check asserting no `openspec` literal remains in ClearSpec's product source/templates/schemas/shipped docs. The check MUST exclude the repo's own `openspec/` planning folder, the `.claude/` dev skills, `LICENSE`, `node_modules`, and `dist`.
- **The scoped guard cannot be a naive repo-wide grep**, because the repo legitimately retains `openspec/` and `.claude/` dev tooling → Mitigation: the check enumerates the directories it scans (e.g. `src/`, `schemas/`, `docs/`, `README.md`) rather than scanning the whole tree.
- **Windows path/case sensitivity regressions** from the folder rename → Mitigation: use `path.join` with the constant segment everywhere; run the existing suites on Windows CI.
- **Constant rename changes where the `clearspec` binary looks for its home** (`clearspec/` instead of `openspec/`) → Mitigation: this is intended and safe — the repo is developed with the separate `openspec` tool (Decision 7), so the `clearspec` binary pointing at `clearspec/` does not disturb the maintainers' workflow.

## Migration Plan

1. Land the constant rename and literal refactor (Decisions 1–2, 4) with tests passing on all platforms.
2. Land the coexistence-safety changes to `legacy-cleanup` (Decision 3) with regression tests proving an `openspec/` dir and `OPENSPEC` marker blocks are left intact.
3. Sweep schemas, docs, README, and test fixtures (Decision 6) — **excluding** the repo's own `openspec/` planning folder and `.claude/` dev skills (Decision 7).
4. Add the **scoped** guard check over ClearSpec's product source/schemas/docs (Decision 1 mitigation), explicitly excluding the dev-tooling directories.

**Rollback**: The change is self-contained renames with no data format change; reverting the commit restores prior behavior. No persisted user data is transformed (clean break), so there is no irreversible migration step. The repo's `openspec/` dev folder and `.claude/` skills are untouched throughout, so the maintainers' workflow is unaffected by either landing or rolling back.

## Open Questions

- **Fallback author default**: Should the `skill-generation.ts` fallback default also become `clearpoint`, or stay `clearspec`? Current plan keeps it `clearspec` (product name) and sets explicit templates to `clearpoint`. Confirm at apply time if a single value is preferred.
> Answered: keep the fallback as `clearspec`
- **Template path-string interpolation vs. literal**: Decision 1 proposes interpolating `CLEARSPEC_DIR_NAME` into the handful of template strings that spell out a path. If the team would rather keep those template strings as plain readable literals (`clearspec/specs/...`), that is acceptable since the folder name is unlikely to change again — confirm preference at apply time.
> Use the pattern that is already established. We're simply rebranding here, not improving.
