# Implementation Tasks — Add Interactive Show Command

## Goals
- Add a top-level `show` command with intelligent selection and type detection.
- Add interactive selection to `change show` and `spec show` when no ID is provided.
- Preserve raw-first output behavior and existing JSON formats/filters.
- Respect `--no-interactive` and `OPEN_SPEC_INTERACTIVE=0` consistently.

---

## 1) CLI wiring
- [x] In `src/cli/index.ts` add a top-level command: `program.command('show [item-name]')`
  - Options:
    - `--json`
    - `--type <type>` where `<type>` is `change|spec`
    - `--no-interactive`
    - Allow passing-through type-specific flags using `.allowUnknownOption(true)` so the top-level can forward flags to the underlying type handler.
  - Action: instantiate `new ShowCommand().execute(itemName, options)`.
- [x] Update `change show` subcommand to accept `--no-interactive` and pass it to `ChangeCommand.show(...)`.
- [x] Change `spec show` subcommand to accept optional ID (`show [spec-id]`), add `--no-interactive`, and pass to spec show implementation.

Acceptance:
- `pastelsdd show` exists and prints a helpful hint in non-interactive contexts when no args.
- Unknown flags for other types do not crash parsing; they are warned/ignored appropriately.

---

## 2) New module: `src/commands/show.ts`
- [x] Create `ShowCommand` with:
  - `execute(itemName?: string, options?: { json?: boolean; type?: string; noInteractive?: boolean; [k: string]: any })`
  - Interactive path when `!itemName` and interactive is enabled:
    - Prompt: "What would you like to show?" → `change` or `spec`.
    - Load available IDs for the chosen type and prompt selection.
    - Delegate to type-specific show implementation.
  - Non-interactive path when `!itemName`:
    - Print hint with examples:
      - `pastelsdd show <item>`
      - `pastelsdd change show`
      - `pastelsdd spec show`
    - Exit with code 1.
  - Direct item path when `itemName` is provided:
    - Type override via `--type` takes precedence.
    - Otherwise detect using `getActiveChangeIds()` and `getSpecIds()`.
    - If ambiguous and no override: print error + suggestion to pass `--type` or use subcommands; exit code 1.
    - If unknown: print not-found with nearest-match suggestions; exit code 1.
    - On success: delegate to type-specific show.
- [x] Flag scoping and pass-through:
  - Common: `--json` → forwarded to both types.
  - Change-only: `--deltas-only`, `--requirements-only` (deprecated alias).
  - Spec-only: `--requirements`, `--no-scenarios`, `-r/--requirement`.
  - Warn and ignore irrelevant flags for the resolved type.

Acceptance:
- `pastelsdd show <change-id> --json --deltas-only` matches `pastelsdd change show <id> --json --deltas-only` output.
- `pastelsdd show <spec-id> --json --requirements` matches `pastelsdd spec show <id> --json --requirements` output.
- Ambiguity and not-found behaviors match the `cli-show` spec.

---

## 3) Refactor spec show into reusable API
- [x] In `src/commands/spec.ts`, extract show logic into an exported `SpecCommand` with `show(specId?: string, options?: { json?: boolean; requirements?: boolean; scenarios?: boolean; requirement?: string; noInteractive?: boolean })`.
  - Reuse current helpers (`parseSpecFromFile`, `filterSpec`, raw-first printing).
  - Keep `registerSpecCommand` but delegate to `new SpecCommand().show(...)`.
- [x] Update CLI spec show subcommand to optional arg and interactive behavior (see section 4).

Acceptance:
- Existing `spec show` tests continue to pass.
- New `SpecCommand.show` can be called from `ShowCommand`.

---

## 4) Backwards-compatible interactive in subcommands
- [x] `src/commands/change.ts` → extend `show(changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean })`:
  - When `!changeName` and interactive enabled: prompt from `getActiveChangeIds()` and show the selected change.
  - Non-interactive fallback: keep current behavior (print available IDs + `pastelsdd change list` hint, set `process.exitCode = 1`).
- [x] `src/commands/spec.ts` → `SpecCommand.show` as above:
  - When `!specId` and interactive enabled: prompt from `getSpecIds()` and show the selected spec.
  - Non-interactive fallback: print the same error as existing behavior for missing `<spec-id>` and set non-zero exit code.

Acceptance:
- `pastelsdd change show` in non-interactive prints list hint and exits non-zero.
- `pastelsdd spec show` in non-interactive prints missing-arg error and exits non-zero.

---

## 5) Shared utilities
- [x] Extract `nearestMatches` and `levenshtein` from `src/commands/validate.ts` into `src/utils/match.ts` (exported helpers).
- [x] Update `ValidateCommand` and new `ShowCommand` to import from `utils/match`.

Acceptance:
- Build succeeds with shared helpers and no duplication.

---

## 6) Hints, warnings, and messages
- [x] Top-level `show` hint (non-interactive no-arg):
  - Lines include: `pastelsdd show <item>`, `pastelsdd change show`, `pastelsdd spec show`, and "Or run in an interactive terminal.".
- [x] Ambiguity message suggests `--type change|spec` and the subcommands.
- [x] Not-found suggests nearest matches (up to 5).
- [x] Irrelevant flag warnings for the resolved type (printed to stderr, no crash).

Acceptance:
- Messages match the `cli-show` spec wording intent and style used elsewhere.

---

## 7) Tests
Add tests mirroring existing patterns (non-TTY simulation via `OPEN_SPEC_INTERACTIVE=0`).

- [x] `test/commands/show.test.ts`
  - Non-interactive, no arg → prints hint and exits non-zero.
  - Direct item detection for change and for spec.
  - Ambiguity case when both exist → error and suggestion for `--type`.
  - Not-found case → nearest-match suggestions.
  - Pass-through flags: change `--json --deltas-only`, spec `--json --requirements`.
- [x] `test/commands/change.interactive-show.test.ts` (non-interactive fallback)
  - Ensure `pastelsdd change show` without args prints available IDs + list hint and non-zero exit.
- [x] `test/commands/spec.interactive-show.test.ts` (non-interactive fallback)
  - Ensure `pastelsdd spec show` without args prints missing-arg error and non-zero exit.

Acceptance:
- All new tests pass after build; no regressions in existing tests.

---

## 8) Documentation (optional but recommended)
- [x] Update `pastelsdd/README.md` usage examples to include the new `show` command with type detection and flags.

---

## 9) Non-functional checks
- [x] Run `pnpm build` and all tests (`pnpm test`).
- [x] Ensure no linter/type errors and messages are consistent with existing style.

---

## Notes on consistency
- Follow raw-first behavior for text output: passthrough file content with no formatting, mirroring current `change show` and `spec show`.
- Reuse `isInteractive` and `item-discovery` helpers for consistent prompting behavior.
- Keep JSON output shapes identical to current `ChangeCommand.show` and `spec show` outputs.


