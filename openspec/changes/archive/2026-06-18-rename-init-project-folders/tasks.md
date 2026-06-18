## 1. Rename the project folder set

- [x] 1.1 In `src/core/config.ts`, update the `CLEARSPEC_PROJECT_FOLDERS` constant values to `requirements`, `context`, `code`, `spec-packs`
- [x] 1.2 Confirm `src/core/init.ts` `createDirectoryStructure()` still derives both the fresh-mode and extend-mode directory arrays from `CLEARSPEC_PROJECT_FOLDERS` via `path.join` (no further change expected)

## 2. Update tests

- [x] 2.1 In `test/core/init.test.ts`, replace the hardcoded `path.join(clearspecPath, 'project-requirements')` reference with the new name (or derive it from `CLEARSPEC_PROJECT_FOLDERS`)
- [x] 2.2 Verify the loops that iterate over `CLEARSPEC_PROJECT_FOLDERS` (fresh mode, extend mode, `--tools none`) still assert each folder using `path.join()` and now cover the four new names
- [x] 2.3 Run `pnpm test` and confirm all init tests pass

## 3. Verify nothing references the old names

- [x] 3.1 Grep `src`, `test`, and `openspec/specs` for `project-requirements`, `code-repositories`, `additional-context`, `project-specifications` and confirm no stale references remain (excluding the archived change)
- [x] 3.2 Confirm the change relies only on `path.join`/`path.resolve` (no hardcoded slashes) in source and tests, and validate cross-platform path handling via Windows CI / local Windows run

## 4. Spec sync

- [x] 4.1 After implementation, ensure the `cli-init` Directory Creation requirement reflects the renamed folders (handled at archive time via the delta spec)
