## Why

Departments already use registered OpenSpec Stores to share planning repositories, but teams that only want to share workflow schemas must also share the Store's specs and changes or copy schemas into every consumer repository. Reusing the existing Store registry as a schema-only source lets teams share schemas through normal Git workflows without adding a second Git synchronization, lockfile, or cache subsystem to OpenSpec.

## What Changes

- Add a consumer-owned `schemaStore` project configuration that selects one registered Store as the source of project schemas without changing where specs, changes, or archives live.
- Support scalar shorthand (`schemaStore: department-schemas`) and an object form with an exact schema visibility allowlist.
- Make all Store schemas visible by default; support `schemas: ["*"]` for the explicit all-visible form and exact schema names for restricted visibility.
- Resolve visible Store schemas ahead of user and package schemas, report their source as `store`, and preserve existing behavior when `schemaStore` is absent.
- Keep Store synchronization user-managed through normal Git clone, pull, commit, and push operations.
- Provide actionable diagnostics for malformed configuration, unknown or unhealthy Store registrations, invalid visibility declarations, and configured schema names that are not visible.

## Capabilities

### New Capabilities
- `schema-store-sources`: Select a registered Store as a schema-only source, independently from the planning Store, with consumer-controlled schema visibility.

### Modified Capabilities
- `config-loading`: Parse scalar and object `schemaStore` declarations resiliently.
- `schema-resolution`: Resolve and list visible Store schemas with defined precedence while leaving planning data rooted independently.
- `schema-which-command`: Report Store-backed schema paths, source, and shadowing information.

## Impact

- Affects project configuration parsing, Store lookup and health validation, schema discovery/resolution, schema reporting commands, and every workflow path that resolves a schema while operating on a potentially separate planning root.
- Adds no network client, lockfile, content cache, or dependency; Store checkout synchronization remains outside OpenSpec.
- Requires documentation and cross-platform tests for local planning, planning-Store, schema-Store, visibility, missing registration, and backward compatibility scenarios.
