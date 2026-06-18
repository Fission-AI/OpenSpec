## Context

`clearspec init` scaffolds the base structure via `InitCommand.createDirectoryStructure()` in `src/core/init.ts`. The directory list is currently hardcoded as an inline array in **two** places within that method — once for extend mode (existing `clearspec/`) and once for fresh initialization — each containing `clearspecPath`, `specs/`, `changes/`, and `changes/archive/`. The base directory name comes from the `CLEARSPEC_DIR_NAME` constant in `src/core/config.ts`.

This change adds four new top-level folders under `clearspec/`: `project-requirements/`, `code-repositories/`, `additional-context/`, and `project-specifications/`. Existing test coverage lives in `test/core/init.test.ts`.

## Goals / Non-Goals

**Goals:**
- Create the four new folders in both fresh and extend modes, matching existing `specs/`/`changes/` behavior.
- Create them regardless of AI tool selection (including `--tools none`).
- Keep the folder set defined in one authoritative place to avoid the existing duplication drifting further.
- Cross-platform path construction via `path.join()`.

**Non-Goals:**
- Seeding the new folders with placeholder/README files (folders are created empty).
- Changing config generation, skill/command generation, or success-output copy.
- Any behavior for how these folders are later consumed by other ClearSpec commands.

## Decisions

**Define the project folder names in a single named constant.** Per project rules ("if we generate it, we track it by name in a constant"), introduce a constant such as `CLEARSPEC_PROJECT_FOLDERS = ['project-requirements', 'code-repositories', 'additional-context', 'project-specifications']` (in `src/core/config.ts` alongside `CLEARSPEC_DIR_NAME`). Both the extend-mode and fresh-mode directory arrays in `createDirectoryStructure()` reference this constant via `path.join(clearspecPath, name)`.
- *Alternative considered:* Inline the four literal strings directly in both arrays. Rejected — it perpetuates the existing duplication and risks the two code paths diverging.

**Append, don't restructure.** Add the new folders to the existing arrays rather than refactoring `createDirectoryStructure()` into a shared helper. Keeps the diff minimal and low-risk; the two arrays already mirror each other and now both pull folder names from the shared constant.

**Empty folders, created idempotently.** Use the existing `FileSystemUtils.createDirectory()` which is a no-op when a folder already exists, so extend mode preserves any existing content.

## Risks / Trade-offs

- [Two arrays still duplicated for `specs/`/`changes/`] → Acceptable; out of scope to fully refactor. The new folders are sourced from one constant, reducing the most error-prone part of future edits.
- [New folders ship empty with no explanation of purpose] → Acceptable for this change; documenting/seeding folder purpose can be a follow-up. Names are self-describing.
- [Tests assert an exact structure] → Update `test/core/init.test.ts` to assert the four new folders using `path.join()` so coverage tracks the new contract across platforms.
