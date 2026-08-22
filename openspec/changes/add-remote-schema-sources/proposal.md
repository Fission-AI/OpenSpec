## Why

Teams that share custom OpenSpec workflows across multiple repositories currently have to copy schema bundles or maintain external automation. Those copies drift, and ordinary commands cannot prove which immutable schema revision they used in CI or offline environments.

## What Changes

- Allow projects to declare named Git-backed schema sources alongside the existing `schema: <name>` setting.
- Add explicit schema synchronization that resolves a requested Git ref to a commit, validates the selected bundle, installs it in a local cache, and writes a commit-friendly lockfile.
- Keep ordinary OpenSpec commands network-free by resolving remote schemas only from the project lockfile and verified local cache.
- Add deterministic locked-cache restoration for CI without advancing the requested ref.
- Resolve remote schema configuration and locks from the consumer repository root even when commands run from nested directories or the repository selects a planning store.
- Keep generated schema configuration at the consumer root while planning artifacts remain in a selected store.
- Extend schema discovery, template reporting, and diagnostics to distinguish project-local, remote, user-level, and package schemas without one unavailable remote aborting an all-schema inspection.
- Treat a declared remote source as the authority for its schema name and report a same-named project-local bundle as a configuration conflict.
- Serialize synchronization per consumer project so concurrent named syncs cannot lose lockfile updates, and recover safely from abandoned or malformed coordination files.
- Reject unsafe or incomplete bundles, credential-bearing declarations, path escapes, symlinks, oversized content, and lock/cache integrity mismatches.
- Preserve existing local-schema validation behavior while applying portable fail-closed checks only to remote bundles.
- Force Git and SSH transport to fail non-interactively while preserving existing SSH command configuration and any explicit host-key policy.

## Capabilities

### New Capabilities

- `remote-schema-sources`: Declaring, synchronizing, locking, caching, validating, and safely restoring Git-backed schema bundles.

### Modified Capabilities

- `config-loading`: Parse and validate remote schema source declarations without invalid fields breaking unrelated project configuration.
- `schema-resolution`: Resolve locked remote schemas between project-local and user-level schemas, with deterministic offline errors and source reporting.
- `schema-which-command`: Report remote schema resolution and shadowing details without accessing the network.

## Impact

- Project contract: `openspec/config.yaml` gains provisional Git schema source declarations and projects may commit `openspec/schemas.lock.yaml`.
- CLI: `openspec schema sync [name]` gains human and JSON output plus a locked restoration mode.
- Runtime: schema resolution reads a content-addressed cache under OpenSpec's global data directory.
- Security: system Git handles transport and credentials; OpenSpec stores no tokens and validates bundle boundaries before activation.
- Documentation and release tracking: customization/CLI guides and a minor changeset are updated.
