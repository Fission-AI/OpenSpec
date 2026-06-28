## 1. Core Discovery & Resolution

- [ ] 1.1 Create `specIdToPath(specId: string, baseDir: string): string` and `pathToSpecId(filePath: string, specsDir: string): string` utility functions in `src/utils/` with `/`-normalization on all platforms
- [ ] 1.2 Refactor `getSpecIds()` in `src/utils/item-discovery.ts` to recursively discover specs using `fast-glob` pattern `**/spec.md` under `openspec/specs/`, deriving IDs from relative paths
- [ ] 1.3 Update all direct path construction (`path.join(SPECS_DIR, specId, 'spec.md')`) across the codebase to use `specIdToPath()`
- [ ] 1.4 Add unit tests for `specIdToPath` and `pathToSpecId` including Windows path separator normalization
- [ ] 1.5 Add unit tests for recursive `getSpecIds()` with flat, nested, mixed, and hidden directory fixtures

## 2. CLI Commands — Spec Subcommands

- [ ] 2.1 Update `src/commands/spec.ts` `show` subcommand to accept and resolve hierarchical spec IDs (e.g., `cli/show`)
- [ ] 2.2 Update `src/commands/spec.ts` `list` subcommand to display full hierarchical IDs and accept an optional subtree prefix argument
- [ ] 2.3 Update `src/commands/spec.ts` `validate` subcommand to accept and resolve hierarchical spec IDs
- [ ] 2.4 Update interactive selection prompts in `spec show` and `spec validate` to display hierarchical IDs

## 3. CLI Commands — Top-Level Show, Validate, List

- [ ] 3.1 Update `src/commands/show.ts` type detection to resolve hierarchical spec IDs and include them in fuzzy-match suggestions
- [ ] 3.2 Update `src/commands/validate.ts` type detection and bulk validation (`--all`, `--specs`) to use recursive spec discovery
- [ ] 3.3 Update `src/core/list.ts` to use recursive spec discovery and support subtree filtering argument for `--specs`
- [ ] 3.4 Update `src/core/view.ts` dashboard to display hierarchical spec IDs in the specifications section

## 4. Fuzzy Matching

- [ ] 4.1 Extend `src/utils/match.ts` to support leaf-segment matching — when no exact match, search for specs whose last path segment matches the query
- [ ] 4.2 Add tests for fuzzy matching with hierarchical IDs (full path typo, leaf match, multiple leaf matches)

## 5. Archive & Delta Spec Handling

- [ ] 5.1 Update delta spec discovery in `src/core/archive.ts` / `src/core/specs-apply.ts` to recursively walk `changes/<name>/specs/` for delta specs at any depth
- [ ] 5.2 Update archive confirmation display to show full hierarchical paths for new and updated specs
- [ ] 5.3 Ensure archive creates intermediate directories when applying delta specs to new hierarchical paths
- [ ] 5.4 Add tests for archiving changes with hierarchical delta specs

## 6. Validation & Edge Cases

- [ ] 6.1 Update `src/commands/validate.ts` error messages and file path references to include full hierarchical spec paths
- [ ] 6.2 Update `src/core/validation/validator.ts` to handle hierarchical spec IDs in structured location paths
- [ ] 6.3 Add integration tests: mixed flat + hierarchical specs coexisting, subtree listing, and cross-platform path handling

## 7. Documentation & Cleanup

- [ ] 7.1 Update `openspec/AGENTS.md` with examples of hierarchical spec paths in templates and references
- [ ] 7.2 Update CLI help text for `spec list` to document subtree filtering syntax
