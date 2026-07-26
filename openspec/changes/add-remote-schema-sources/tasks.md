## 1. Configuration and Lock Contracts

- [x] 1.1 Add failing project-config tests for valid `schemaSources`, invalid names/members, prototype keys, and credential-bearing HTTPS URLs while preserving unrelated fields
- [x] 1.2 Implement normalized Git schema source types and resilient `schemaSources` parsing until the focused config tests pass
- [x] 1.3 Add failing lockfile tests for strict versioned parsing, malformed commits/digests, source mismatch, deterministic ordering, and atomic write preservation
- [x] 1.4 Implement lockfile constants, parser, serializer, and atomic sibling-file replacement until the lockfile tests pass

## 2. Portable Bundle Validation and Integrity

- [x] 2.1 Add failing tests for repository-relative bundle paths across POSIX and Windows forms, including traversal, drive, UNC, backslash, reserved-name, and case-fold collision cases
- [x] 2.2 Implement portable Git tree path and entry validation until all cross-platform path cases pass
- [x] 2.3 Add failing tests for canonical digest changes on added/removed/modified files, deterministic ordering, 1,000-file and 10 MiB limits, symlinks, submodules, and non-blob entries
- [x] 2.4 Implement bounded Git-tree extraction, canonical SHA-256 digesting, and content-addressed cache verification until the bundle tests pass
- [x] 2.5 Add failing tests proving missing `schema.yaml`, missing `templates`, escaped template paths, missing template files, and schema-name mismatch are rejected
- [x] 2.6 Extract a reusable core schema-directory validator from the schema CLI and apply stricter remote-bundle validation until existing and new validation tests pass

## 3. Git Synchronization

- [x] 3.1 Add failing Git-adapter integration tests using temporary local repositories for branch, lightweight tag, annotated tag, exact commit fetch, bounded failure, and credential-safe errors
- [x] 3.2 Implement the system-Git adapter with argument arrays, tracked-object enumeration, output/time bounds, and sanitized error mapping until adapter tests pass
- [x] 3.3 Add failing synchronization tests for single/all update mode, `--locked` restoration, byte-identical locked operation, and config/lock drift
- [x] 3.4 Implement update and locked synchronization orchestration with temporary extraction, cache rename, and one final atomic lock write
- [x] 3.5 Add failing rollback tests proving invalid upgrades, partial multi-source failures, cache installation failures, and lock replacement failures preserve the previous active state
- [x] 3.6 Complete failure-atomic cleanup and rollback behavior until all synchronization tests pass

## 4. Resolver Integration

- [x] 4.1 Add failing resolver tests for project → remote → user → package priority, projectRoot-free compatibility, and one-entry discovery/source reporting
- [x] 4.2 Add failing resolver tests for missing/stale lock, absent cache, digest mismatch, schema-name mismatch, and same-named lower-tier fail-closed behavior
- [x] 4.3 Integrate verified locked remote resolution and `remote` schema metadata into resolver/listing APIs until focused resolver tests pass
- [x] 4.4 Add an offline test that makes Git unavailable after synchronization and proves ordinary resolution still succeeds without spawning any process

## 5. CLI Behavior

- [x] 5.1 Add failing CLI tests for `schema sync [name]`, all-source sync, `--locked`, unknown names, no declarations, exit codes, human output, and one-document `--json` output
- [x] 5.2 Register and implement `openspec schema sync` rendering with no spinner or non-JSON stdout under `--json`
- [x] 5.3 Add failing `schema which` and `schemas` tests for active remote metadata, project shadowing, unsynchronized diagnostics, and no-network inspection
- [x] 5.4 Extend schema inspection/listing output and shadow metadata until existing and new schema command tests pass

## 6. End-to-End Git Journeys and Security

- [x] 6.1 Add a local-Git end-to-end journey covering initial branch sync, offline use, remote branch advancement with old-lock use, explicit upgrade, and locked cache restoration
- [x] 6.2 Add local-Git rejection journeys for `..`, absolute/drive/UNC paths, tracked symlinks, submodules, incomplete bundles, oversized bundles, and name conflicts
- [x] 6.3 Add a private-auth failure fixture proving human and JSON output do not expose injected credentials or untrusted Git stderr
- [x] 6.4 Run all new path and Git integration tests on Windows-compatible code paths and confirm the repository Windows CI matrix exercises them

## 7. Documentation and Release Tracking

- [x] 7.1 Update `docs/customization.md` to distinguish project-local, remote, user-level, and package schemas and document precedence, offline behavior, upgrades, security boundaries, and cache/lock commit policy
- [x] 7.2 Update `docs/cli.md` with sync/update/locked syntax, human/JSON examples, public HTTPS and private SSH examples, CI cache restoration, and failure guidance
- [x] 7.3 Add a minor changeset describing Git-backed schema sources, explicit synchronization, deterministic locks, and network-free normal resolution

## 8. Verification and Consistency Review

- [x] 8.1 Run focused config, lock, bundle, Git, resolver, schema CLI, and end-to-end tests and record zero failures
- [x] 8.2 Run `pnpm run build`, `pnpm exec tsc --noEmit`, and `pnpm lint` with zero errors
- [x] 8.3 Run the complete `pnpm test` suite and confirm the Linux/macOS/Windows-sensitive path cases remain covered
- [x] 8.4 Validate `add-remote-schema-sources` strictly and compare proposal, design, specs, tasks, docs, and implementation for unresolved contradictions or scope drift
