## 1. Configuration Contract

- [x] 1.1 Add failing project-config tests for scalar `schemaStore`, object form, omitted visibility, explicit `["*"]`, exact-name allowlists, duplicate normalization, and preservation of unrelated valid fields
- [x] 1.2 Add failing strict-declaration tests for empty lists, wildcard/name mixing, invalid Store IDs, invalid schema names, unsupported fields, and malformed YAML
- [x] 1.3 Implement normalized `SchemaStoreDeclaration` parsing plus a strict authority reader while preserving resilient generic config loading
- [x] 1.4 Run `pnpm vitest run test/core/project-config.test.ts` and confirm the configuration contract is green

## 2. Resolved Schema Context

- [x] 2.1 Add failing root-selection tests for local planning plus schema Store, separate planning/schema Stores, the same Store in both roles, explicit `--store`, config-only pointers, and absent `schemaStore`
- [x] 2.2 Add failing diagnostics tests for unregistered Store IDs, missing or mismatched Store identity, and canonical paths on platform-native temporary directories
- [x] 2.3 Implement consumer-root preservation and asynchronous schema Store registry resolution at the command/root boundary without making schema parsing asynchronous
- [x] 2.4 Represent the resolved planning root, consumer config root, schema root, Store provenance, and normalized visibility in one command context
- [x] 2.5 Run the root-selection and Store registry focused suites and confirm existing Store precedence remains unchanged

## 3. Schema Discovery and Resolution

- [x] 3.1 Add failing resolver tests for Store-over-user/package precedence, exact visibility, wildcard visibility, hidden Store schemas, empty Store schema directories, and no-declaration compatibility
- [x] 3.2 Add failing tests proving a configured schema Store replaces consumer-local project schemas and never implicitly searches the planning Store
- [x] 3.3 Extend schema discovery/resolution with the resolved schema context and `store` provenance, including Store ID and canonical path
- [x] 3.4 Ensure suggestions, validation, template loading, and shadow reporting consume the same filtered candidate set
- [x] 3.5 Run artifact-graph schema, resolver, directory-validation, and configuration tests

## 4. Workflow Lifecycle Integration

- [x] 4.1 Add failing integration tests for new change, status, instructions, apply, validation, list, task progress, and archive with local planning plus a schema Store
- [x] 4.2 Add failing integration tests for the same lifecycle with separate planning and schema Stores, asserting all planning writes stay in the planning Store
- [x] 4.3 Route the resolved schema context through change metadata, change creation, instruction loading, validation, listing, task progress, and archive boundaries
- [x] 4.4 Add backward-compatibility assertions showing projects without `schemaStore` retain existing paths, output, and schema precedence
- [x] 4.5 Run all affected workflow, Store root-selection, archive, validation, and change utility suites
- [x] 4.6 Preserve Planning Store configuration when `schemaStore` is absent, and layer explicit schema-consumer configuration without dropping inherited references

## 5. Schema CLI and Reporting

- [x] 5.1 Add failing command tests for `openspec schemas`, `schema which`, `schema which --all`, schema validation, schema fork, and template reporting with visible and hidden Store schemas
- [x] 5.2 Extend human output with Store source labels and Store IDs while preserving existing project/user/package wording
- [x] 5.3 Extend JSON output with `source: "store"` and `storeId` while preserving existing fields and unavailable/error shapes
- [x] 5.4 Verify every schema-oriented command resolves Store registration once at its asynchronous boundary and performs no Git network operation
- [x] 5.5 Run the complete schema command and artifact-workflow focused suites

## 6. Documentation and Release Contract

- [x] 6.1 Document `schemaStore` scalar/object syntax, default `*`, exact allowlists, source precedence, and diagnostics in the CLI and customization guides
- [x] 6.2 Document department setup: create or clone a schema Store, register it per machine, update it with normal Git, and combine it with local or Store-backed planning
- [x] 6.3 State explicitly that OpenSpec does not synchronize or pin schema Store checkouts and that one registered checkout serves all local consumers
- [x] 6.4 Add a Changesets entry describing schema-only Store sourcing as an additive experimental feature

## 7. Cross-Platform and Final Verification

- [x] 7.1 Add Windows-safe path assertions using `path.join` and canonical temporary directories; rely on the existing Windows CI job for platform execution
- [x] 7.2 Run `pnpm exec openspec validate add-schema-store-sources --strict`
- [x] 7.3 Run `pnpm run build`, `pnpm exec tsc --noEmit`, and `pnpm lint`
- [x] 7.4 Run `pnpm test` and confirm the complete suite passes
- [x] 7.5 Run `git diff --check` and review the final diff for unrelated Remote Schema fetch, lockfile, cache, or synchronization machinery
