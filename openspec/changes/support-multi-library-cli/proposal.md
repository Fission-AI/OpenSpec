# Proposal

## Why

Recursive listing exposes work in descendant OpenSpec libraries, but the remaining CLI still treats the repository as one library. Users should be able to browse, inspect, validate, and work on that discovered change from the same directory without moving or registering their libraries.

## What Changes

- Extend local-library discovery from list to view, show, validate, change/workflow commands, context, doctor, and library-specific schema/setup commands.
- Combine dashboards and bulk validation across the selected local library and its valid descendants, with relative library labels and distinct item ownership.
- Resolve named changes/specs to their owning library. Duplicate matches produce actionable ambiguity diagnostics before any command runs against an item.
- Add an optional `--library <project-path>` selector to library-aware commands. It selects one discovered local project, using the same project-path convention as existing init/update positional paths. Default browsing and unique item lookup require no configuration or flag.
- Keep registered stores scoped to the selected store. Keep every mutation and schema/config write scoped to one library; never infer a repository-wide write from recursive discovery.
- Preserve nearest-project behavior, legacy layouts, existing item parsing/status logic, and single-library JSON. Aggregate results include owning-library metadata and partial-failure diagnostics.
- Update CLI help, user/agent guidance, completion definitions, and examples so hints remain inside the resolved library.

## Capabilities

### New Capabilities

- `cli-library-selection`: Local-library discovery, explicit selection, owning-library lookup, ambiguity handling, command scope, and cross-platform path identity.

### Modified Capabilities

- `cli-view`: Combined dashboard with aggregate totals and per-library sections.
- `cli-show`: Inspect and select items from discovered descendant libraries.
- `cli-validate`: Bulk validation across libraries and owning-library direct validation.
- `cli-artifact-workflow`: Resolve workflow operations from the owning library and explicitly target new changes.
- `cli-archive`: Archive exactly one unambiguously owned change into its own library.
- `cli-update`: Update one selected library using its configuration and integrations.

## Impact

Shared root/item discovery, CLI command adapters, JSON ownership metadata, interactive pickers, workflow action/edit-root context, schema resolution, follow-up hints, and completion flags. No external dependency or new workspace configuration is needed. This follows listing PR #2009; reuse its helper when it merges rather than introduce another scanner.

Named commands that previously chose a root-local duplicate implicitly will now require a library selection when the same item exists elsewhere within the discovered scope. This is an intentional error-path compatibility change; commands run inside a product retain their product-local scope.
