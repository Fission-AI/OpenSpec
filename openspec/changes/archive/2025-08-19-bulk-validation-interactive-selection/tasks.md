# Implementation Tasks

## 1. Change Command: Interactive Validation Selection
- [x] 1.1 Add `--no-interactive` flag to `change validate` in `src/cli/index.ts`
- [x] 1.2 Implement interactivity gate respecting TTY and `OPEN_SPEC_INTERACTIVE=0` in `src/commands/change.ts`
- [x] 1.3 When no `[change-name]` is provided and interactivity is allowed, prompt with a list of active changes (exclude `archive/`) and validate the selected one
- [x] 1.4 Preserve current non-interactive fallback: print available change IDs and hint, set `process.exitCode = 1`
- [x] 1.5 Tests: add coverage for interactive and non-interactive flows
  - Added `test/commands/change.interactive-validate.test.ts`

## 2. Spec Command: Interactive Validation Selection
- [x] 2.1 Make `spec validate` accept optional `[spec-id]` in `src/commands/spec.ts` registration
- [x] 2.2 Add `--no-interactive` flag to `spec validate`
- [x] 2.3 Implement interactivity gate respecting TTY and `OPEN_SPEC_INTERACTIVE=0`
- [x] 2.4 When no `[spec-id]` provided and interactivity allowed, prompt to select from `pastelsdd/specs/*/spec.md` and validate the selected spec
- [x] 2.5 Preserve current non-interactive fallback when no spec-id and no interactivity: print existing error and exit code non-zero
- [x] 2.6 Tests: add coverage for interactive and non-interactive flows
  - Added `test/commands/spec.interactive-validate.test.ts`

## 3. New Top-level `validate` Command
- [x] 3.1 Add `validate` command in `src/cli/index.ts`
  - Options: `--all`, `--changes`, `--specs`, `--type <change|spec>`, `--strict`, `--json`, `--no-interactive`
  - Usage: `pastelsdd validate [item-name]`
- [x] 3.2 Create `src/commands/validate.ts` implementing:
  - [x] 3.2.1 Interactive selector when no args (choices: All, Changes, Specs, Specific item)
  - [x] 3.2.2 Non-interactive fallback with helpful hint and exit code 1
  - [x] 3.2.3 Direct item validation with automatic type detection
  - [x] 3.2.4 Ambiguity error when name exists as both change and spec; suggest `--type` or subcommands
  - [x] 3.2.5 Unknown item handling with nearest-match suggestions
  - [x] 3.2.6 Bulk validation for `--all`, `--changes`, `--specs` (exclude `pastelsdd/changes/archive/`)
  - [x] 3.2.7 Respect `--strict` and `--json` options; JSON shape per spec
  - [x] 3.2.8 Exit with code 1 if any validation fails
  - [x] 3.2.9 Bounded concurrency (default 4–8) for bulk validation
  - [x] 3.2.10 Progress indication during bulk runs (current item, running counts)

## 4. Utilities and Shared Helpers
- [x] 4.1 Add `src/utils/interactive.ts` with `isInteractive(stdin: NodeJS.ReadStream, noInteractiveFlag?: boolean): boolean`
  - Considers: `process.stdin.isTTY`, `--no-interactive`, `OPEN_SPEC_INTERACTIVE=0`
- [x] 4.2 Add `src/utils/item-discovery.ts` with:
  - `getActiveChangeIds(root = process.cwd()): Promise<string[]>` (exclude `archive/`)
  - `getSpecIds(root = process.cwd()): Promise<string[]>` (folders with `spec.md`)
- [ ] 4.3 Optional: `src/utils/concurrency.ts` helper for bounded parallelism
- [x] 4.4 Reuse `src/core/validation/validator.ts` for item validation

## 5. JSON Output (Bulk Validation)
- [x] 5.1 Implement JSON schema:
  - `items: Array<{ id: string, type: "change"|"spec", valid: boolean, issues: Issue[], durationMs: number }>`
  - `summary: { totals: { items: number, passed: number, failed: number }, byType: { change?: { items: number, passed: number, failed: number }, spec?: { items: number, passed: number, failed: number } } }`
  - `version: "1.0"`
- [x] 5.2 Ensure process exit code is 1 if any `items[].valid === false`
- [x] 5.3 Tests for JSON shape (keys, types, counts) and exit code behavior
  - Added `test/commands/validate.test.ts`

## 6. Progress and UX
- [x] 6.1 Use `ora` or minimal console progress to show current item and running counts
- [x] 6.2 Keep output stable in `--json` mode (no extra logs to stdout; use stderr for progress if needed)
- [x] 6.3 Ensure responsiveness with concurrency limits

## 7. Tests
- [x] 7.1 Add top-level validate tests: `test/commands/validate.test.ts`
  - Includes non-interactive hint, --all JSON, --specs with concurrency, ambiguity error
- [ ] 7.2 Add unit tests for `isInteractive` and item discovery helpers
- [x] 7.3 Extend existing change/spec command tests to cover interactive `validate`
  - Added `test/commands/change.interactive-validate.test.ts`, `test/commands/spec.interactive-validate.test.ts`

## 8. CLI Help and Docs
- [x] 8.1 Update command descriptions/options in `src/cli/index.ts`
- [x] 8.2 Verify help output includes `validate` command and flags
- [x] 8.3 Ensure existing specs under `pastelsdd/changes/bulk-validation-interactive-selection/specs/*` remain satisfied

## 9. Non-functional
- [x] 9.1 Code style and types: explicit types for exported APIs; avoid `any`
- [x] 9.2 No linter errors; stable formatting; avoid unrelated refactors
- [x] 9.3 Maintain existing behavior for unaffected commands

## 10. Acceptance Criteria Mapping
- [x] AC-1: `pastelsdd change validate` interactive selection when no arg (TTY only; respects `--no-interactive`/env) — matches cli-change spec
- [x] AC-2: `pastelsdd spec validate` interactive selection when no arg (TTY only; respects `--no-interactive`/env) — matches cli-spec spec
- [x] AC-3: New `pastelsdd validate` supports interactive selection, bulk/filtered validation, JSON schema, progress, concurrency, exit codes — matches cli-validate spec


