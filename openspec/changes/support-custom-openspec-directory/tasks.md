## 1. Establish the directory-aware root contract

- [ ] 1.1 Add focused root-selection tests for default projects, stores, unset/empty compatibility, ancestor-resolved and nested-workspace relative `OPENSPEC_DIR` values, rejected absolute, lexical-escape, and symlink-escape values, other invalid values, `--store` conflicts, spaces, and canonical in-workspace alias identity; verify the new cases fail for the missing directory contract.
- [ ] 1.2 Extend the canonical resolved-root and planning-home types with authoritative OpenSpec-directory fields, derive all planning subdirectories once, and verify existing default/store tests remain green.
- [ ] 1.3 Implement environment selection, typed diagnostics, fail-closed precedence, human provenance, and additive JSON root output; verify focused human and JSON tests pass without changing existing field meanings.
- [ ] 1.4 Update `docs/agent-contract.md` and root-selection CLI documentation in the same change, then verify their documented payloads and precedence against the focused tests.

## 2. Move runtime consumers onto the authoritative directory

- [ ] 2.1 Inventory every runtime construction of config, schemas, specs, changes, and archive paths; migrate normal and deprecated-but-shipped commands to the resolved directories and verify command-parity tests cover list, show, validate, status, instructions, new change, archive, doctor, context, schemas, templates, config, view, and noun-form compatibility paths.
- [ ] 2.2 Add directory-aware project-config and schema-resolution APIs with compatibility wrappers for existing callers; verify config loading, rules/context injection, schema listing, schema loading, and custom-schema change creation against a custom directory.
- [ ] 2.3 Update reference, health, discovery, archive, and spec-application consumers to accept authoritative directories; verify a complete create-to-archive lifecycle in a path containing spaces.
- [ ] 2.4 Add a static regression guard for forbidden command-local `<root>/openspec` reconstruction and verify it permits only constants, default-layout descriptions, and store bootstrap code explicitly reviewed by name.

## 3. Separate init/update workspace and planning paths

- [ ] 3.1 Add failing init tests proving `OPENSPEC_DIR` creates the complete planning structure at the selected destination while project-local tool files, detection, cleanup, and managed root stubs stay at the explicit workspace path.
- [ ] 3.2 Implement separate workspace and OpenSpec-directory inputs through init, including extend mode, pointer guards, config creation, anchors, Copilot cloud state, and rollback; verify focused init and cleanup suites pass.
- [ ] 3.3 Add failing update tests for relocated planning instructions, workspace-local tool refresh, missing/invalid custom directories, and absence of default-directory writes.
- [ ] 3.4 Implement the same separation through update and verify focused update, migration, shared-skill, and Copilot cloud suites pass.
- [ ] 3.5 Update `cli-init`, `cli-update`, customization, and troubleshooting documentation with cross-platform examples and consistent-environment guidance; run every documented command in temporary fixtures.

## 4. Make generated workflows directory-aware

- [ ] 4.1 Add generated-content tests proving workflow instructions consume `root.openspec_dir` or `planningHome.openspecDir` for config, specs, changes, schemas, and archive operations under a custom directory.
- [ ] 4.2 Replace operational hardcoded `openspec/` paths in shared workflow templates and GitHub Copilot agent content with authoritative-directory guidance while preserving default-layout examples; regenerate committed skills and parity hashes and verify generated-content equivalence.
- [ ] 4.3 Extend cold-start and capstone agent journeys with a relocated directory and verify the agent creates, reads, validates, syncs, and archives only in the selected location.

## 5. Complete compatibility and release verification

- [ ] 5.1 Add a minor changeset and a migration note; verify unset-environment human output, filesystem effects, and existing JSON keys remain compatible for default projects and stores.
- [ ] 5.2 Run `pnpm run build`, `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm test`, strict OpenSpec validation, generated-content parity checks, and `git diff --check`.
- [ ] 5.3 Verify Windows CI covers native separators, rejected drive-qualified absolute paths, spaces, and alias canonicalization before marking the implementation ready to merge.
