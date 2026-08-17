## 1. Overlay model and merge behavior

- [x] 1.1 Add strict Zod/types for `schema.override.yaml`, text operations, and collection operations, including `patchVersion: 1` and unknown-key rejection.
- [x] 1.2 Implement pure merge helpers for scalar replacement, instruction `prepend`/`append`/`replace`, and dependency `add`/`remove`/`replace` with deterministic ordering and conflict validation.
- [x] 1.3 Compose the overlay with the packaged schema and run the existing complete-schema parser over the effective result so dependency references, cycles, and required fields remain authoritative.
- [x] 1.4 Add unit tests for every operation, combined prepend/append behavior, blank-line joining, invalid operations, unknown artifact IDs, duplicates, missing removals, and invalid final graphs.

## 2. Source resolution and compatibility

- [x] 2.1 Introduce one `ResolvedSchemaSources` API that represents project bundles, complete user bundles, package schemas, and package schemas with user overlays.
- [x] 2.2 Implement precedence `project replacement → user replacement → package + user overlay → package`, including rootless resolution without project lookup.
- [x] 2.3 Reject a user directory containing both `schema.yaml` and `schema.override.yaml`, and reject an overlay without a packaged base.
- [x] 2.4 Keep `getSchemaDir()` backward-compatible while migrating composition-aware runtime and listing call sites to the centralized descriptor.
- [x] 2.5 Add resolver/listing tests for all precedence combinations, XDG overrides, Unix/macOS fallbacks, Windows paths, symlink/path-containment cases, conflicts, and package-update passthrough.

## 3. Layered template resolution

- [x] 3.1 Resolve templates for composed schemas from the optional user template root first and the packaged root second.
- [x] 3.2 Preserve self-contained template behavior for project schemas and complete user replacements with no package fallback.
- [x] 3.3 Return the concrete template path and source so instruction loading and `openspec templates` report the same effective file.
- [x] 3.4 Apply canonical containment checks independently to every candidate root and add tests for missing templates, user shadowing, packaged fallback, nested paths, symlinks, and escape attempts.

## 4. Schema management commands and diagnostics

- [x] 4.1 Add `openspec schema override <name>` with `--force` and `--json`, creating an atomic no-op overlay only for a packaged schema.
- [x] 4.2 Refuse overlay creation when a complete user replacement conflicts or an existing overlay lacks `--force`; preserve the existing destination if staging or validation fails.
- [x] 4.3 Update `schema which`, `schema which --all`, and JSON output to report package base plus user overlay without changing the existing `source` and `path` meanings.
- [x] 4.4 Update `schema validate <name>` to validate the overlay, effective schema, and layered templates with file-specific diagnostics.
- [x] 4.5 Update `openspec schemas` and `openspec templates` to consume the centralized source descriptor and report effective schema/template sources.
- [x] 4.6 Add command tests for success, JSON contracts, conflicts, `--force` safety, root independence, effective validation, and composed source reporting.

## 5. Documentation

- [x] 5.1 Expand `docs/customization.md` with a dedicated Global Overrides section comparing complete replacement and layered customization, including exact cross-platform paths and precedence.
- [x] 5.2 Document the overlay format and explicit field operations with a `tasks.instruction.append` example and optional template override example.
- [x] 5.3 Update `docs/cli.md`, `docs/opsx.md`, troubleshooting, and command help for overlay creation, validation, inspection, conflicts, and rollback.
- [x] 5.4 Explain update behavior clearly: packaged schema and non-overridden templates continue to evolve; replaced fields/templates remain user-owned.

## 6. Verification

- [x] 6.1 Run focused artifact-graph resolver, instruction-loader, schema command, workflow templates, project-config, and task-progress tests.
- [x] 6.2 Run lint, type-check/build, and the full test suite.
- [x] 6.3 Run `openspec validate add-global-schema-overlays --strict` and confirm every modified capability has a complete, valid delta spec.
- [x] 6.4 Manually verify a packaged `spec-driven` update changes the effective schema while a global `tasks.instruction.append` and one user template override remain applied.
