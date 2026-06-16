## 1. Define the project folder set

- [x] 1.1 Add a `CLEARSPEC_PROJECT_FOLDERS` constant in `src/core/config.ts` listing `project-requirements`, `code-repositories`, `additional-context`, and `project-specifications`
- [x] 1.2 Export the constant so `init.ts` can import it

## 2. Create folders in init

- [x] 2.1 In `src/core/init.ts` `createDirectoryStructure()`, append the project folders (via `path.join(clearspecPath, name)` over `CLEARSPEC_PROJECT_FOLDERS`) to the extend-mode directory array
- [x] 2.2 Append the same folders to the fresh-initialization directory array
- [x] 2.3 Confirm folders are created via existing `FileSystemUtils.createDirectory()` (idempotent; preserves existing content) and use `path.join` only — no hardcoded separators

## 3. Tests

- [x] 3.1 Extend the "should create ClearSpec directory structure" test in `test/core/init.test.ts` to assert each of the four new folders exists, using `path.join()` for expected paths
- [x] 3.2 Add/extend coverage asserting the four folders are created in extend mode (existing `clearspec/`)
- [x] 3.3 Add/extend coverage asserting the four folders are created with `--tools none`
- [x] 3.4 Run `pnpm test` and confirm all init tests pass

## 4. Cross-platform verification

- [x] 4.1 Verify the change relies only on `path.join`/`path.resolve` (no hardcoded slashes) in both source and tests
- [x] 4.2 Confirm Windows CI passes (or run the init tests on Windows) to validate cross-platform path handling

## 5. Spec sync

- [x] 5.1 After implementation, ensure the `cli-init` Directory Creation requirement reflects the new structure (handled at archive time via the delta spec)
