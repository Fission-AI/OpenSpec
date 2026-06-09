## Why

ClearSpec is a fork of OpenSpec, but the artifacts it generates and much of its own source still carry the original OpenSpec branding: `clearspec init` creates a folder named `openspec/`, the generated commands are titled `OPSX: …`, and the generated skills declare `author: openspec`. Because ClearSpec and OpenSpec serve different purposes (OpenSpec for spec-driven development, ClearSpec for generating specification packs/slices for large-scale initiatives) and must be able to live **side by side in the same project**, ClearSpec needs its own distinct identity. Any shared folder, dotfile, config marker, global directory, or environment variable would collide with a co-installed OpenSpec, and any cleanup logic that touches `openspec/` paths risks corrupting a real OpenSpec installation.

## What Changes

- **Generated change-management folder renamed**: `clearspec init` generates and operates on a `clearspec/` folder instead of `openspec/`. All skills, commands, and CLI logic resolve the `clearspec/` home. **BREAKING** for the generated artifact layout.
- **Command titles rebranded**: Generated command titles change from `OPSX: …` to `CLSX: …` (Apply, Archive, Propose, Explore, Continue, New, Fast Forward, Sync, Verify, Bulk Archive, Onboard, Feedback).
- **Skill author rebranded**: Generated skill frontmatter declares `author: clearpoint` instead of `author: openspec`.
- **Coexistence guarantee**: ClearSpec never reads, writes, deletes, or migrates any `openspec/`-owned path. A pre-existing `openspec/` folder is left completely untouched and continues to work alongside `clearspec/`. **BREAKING**: legacy-cleanup logic that previously detected and deleted files inside `openspec/` is removed/retargeted.
- **Distinct ancillary identifiers** (so the two tools never collide):
  - Global config/data directories: `openspec` → `clearspec` (e.g. `~/.config/clearspec`, `%APPDATA%\clearspec`).
  - Environment variable: `OPENSPEC_NO_COMPLETIONS` → `CLEARSPEC_NO_COMPLETIONS`.
  - Managed-block markers: `<!-- OPENSPEC:START/END -->` → `<!-- CLEARSPEC:START/END -->`.
  - Checked-in change metadata file: `.openspec.yaml` → `.clearspec.yaml`.
  - Workspace/context-store metadata dirs: `.openspec-workspace` → `.clearspec-workspace`, `.openspec-store` → `.clearspec-store`.
- **Internal identifiers, docs, schemas, and tests rebranded**: Source constants (`OPENSPEC_DIR_NAME`, `OPENSPEC_MARKERS`), `getOpsx*` template functions, schema instruction text, documentation, and test fixtures are updated so the term "openspec" no longer appears in **ClearSpec's product source, shipped schemas, shipped docs, or generated artifacts**. Three areas are explicitly preserved (see Impact): the MIT `LICENSE`, this repository's own `openspec/` planning folder, and the `.claude/` skills — the latter two are the OpenSpec dev instance used to build ClearSpec.

## Capabilities

### New Capabilities
- `brand-naming`: The canonical ClearSpec branding contract — the generated change-management home is `clearspec/`, generated commands are titled `CLSX: …`, generated skills are authored by `clearpoint`, ClearSpec's ancillary identifiers (global dirs, env var, markers, dotfiles) are distinct from OpenSpec's, and ClearSpec never touches OpenSpec-owned paths so the two coexist.

### Modified Capabilities
- `cli-init`: The initialized change-management folder is `clearspec/` (with `clearspec/config.yaml`); init never creates inside or overwrites an existing `openspec/`.
- `legacy-cleanup`: ClearSpec no longer detects, deletes, or migrates any `openspec`-named file or directory, and removes only `CLEARSPEC` (never `OPENSPEC`) marker blocks — preserving any coexisting OpenSpec installation.
- `global-config`: Global configuration and data directories use the `clearspec` name instead of `openspec`.
- `cli-completion`: Dynamic completions discover changes and specs from the `clearspec/` home.

(The `CLSX:` command-title and `clearpoint`-author contracts, the `CLEARSPEC_NO_COMPLETIONS` env var, and the marker/dotfile renames are captured by the new `brand-naming` capability, since the affected specs have no existing requirement that states the old names.)

## Impact

- **Source**: `src/core/config.ts` (folder-name and marker constants), `src/core/global-config.ts`, all 12 `src/core/templates/workflows/*.ts` (titles + author), `src/core/shared/skill-generation.ts` and `skill-templates.ts` (`getOpsx*` → `getClsx*`), and ~25 files with hardcoded `'openspec'` path literals (`init.ts`, `archive.ts`, `list.ts`, `view.ts`, `project-config.ts`, `planning-home.ts`, `specs-apply.ts`, `legacy-cleanup.ts`, `change.ts`, `validate.ts`, `schema.ts`, `artifact-graph/*`, `workspace/*`, `context-store/*`, `completions/*`, `change-utils.ts`, `change-metadata.ts`, etc.).
- **Schemas**: `schemas/spec-driven/schema.yaml` and `schemas/spec-driven/templates/proposal.md` instruction text referencing `openspec/specs/`.
- **Docs**: All files under `docs/` plus `README.md` referencing `openspec/` paths.
- **Tests**: Test suites that construct `path.join(..., 'openspec', ...)` fixtures (`archive.test.ts`, `artifact-workflow.test.ts`, `change-metadata.test.ts`, `change-utils.test.ts`, etc.) and the postinstall env-var script.
- **Coexistence/behavioral**: Removal of `openspec/`-targeted cleanup is a behavior change that protects co-installed OpenSpec; this is the highest-risk area and requires explicit test coverage.
- **Cross-platform**: Folder/path changes must use `path.join()` and be verified on Windows CI.
- **Explicitly NOT in scope (preserved as-is)**:
  - The MIT `LICENSE` file retains its original attribution.
  - **This repository's own `openspec/` planning folder** (its `config.yaml`, `specs/`, `changes/`, including the branded capability names `openspec-conventions`, `opsx-archive-skill`, etc.) is **never renamed** — it is the OpenSpec dev instance used to develop ClearSpec. The folder-name constant rename affects what the `clearspec` CLI generates/resolves, not the separately-installed `openspec` tool that reads this folder.
  - **The repository's `.claude/` skills are never renamed or modified** — they are the OpenSpec dev instance's skills.
  - End-user projects' pre-existing `openspec/` folders (created by the real OpenSpec tool) are out of scope and never modified.
