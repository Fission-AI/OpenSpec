## ADDED Requirements

### Requirement: Migration converts a project into status mode without deleting anything

`openspec migrate` SHALL convert a `lifecycle: archive` project to `lifecycle: status`. Each archived change SHALL become a change with `status: shipped`, sharded by the date its archive folder name recorded; each active change SHALL become `status: proposed`, sharded by its recorded creation date or today's date when it has none. The emptied `archive/` directory SHALL be removed, and the `lifecycle` config line SHALL be written only after every move succeeds. No change directory and no spec file SHALL be deleted.

#### Scenario: Both eras migrate
- **WHEN** a user runs `openspec migrate` in a project with archived and in-flight changes
- **THEN** archived changes become sharded and `shipped`, in-flight changes become sharded and `proposed`, `changes/archive/` is gone, and `openspec/config.yaml` declares `lifecycle: status`

#### Scenario: The gate is green immediately after migrating
- **WHEN** a user runs `openspec sync --check` directly after a successful migration
- **THEN** the command exits zero, because each migrated change's delta re-applies to the already-folded spec as a no-op

#### Scenario: Dry run writes nothing
- **WHEN** a user runs `openspec migrate --dry-run`
- **THEN** the planned moves are printed, and no directory is moved and no config file is modified

### Requirement: Migration refuses rather than creating unaddressable changes

Because commands address changes by bare id, `openspec migrate` SHALL refuse before moving anything when the resulting layout would contain two changes with the same id — the case produced by a legacy name reused across archive eras, which the archive date prefix permits. The refusal SHALL name every colliding id and its source directories. Two planned moves resolving to the same destination SHALL be refused on the same grounds.

#### Scenario: Reused legacy name is refused up front
- **WHEN** a user runs `openspec migrate` in a project containing both `changes/archive/2026-05-12-add-auth/` and an active `changes/add-auth/`
- **THEN** the command fails naming `add-auth` and both directories, and no directory has been moved

#### Scenario: Dry run reports the same refusal
- **WHEN** a user runs `openspec migrate --dry-run` on a project with a colliding id
- **THEN** the command fails with the same error, rather than printing a plan that could not be applied

### Requirement: An interrupted migration can be re-run

`openspec migrate` SHALL be resumable: a re-run after an interrupted migration SHALL skip the shard directories a partial run already created rather than treating them as changes to move, and SHALL complete the remaining work. A migration run against an already-migrated project SHALL report that there is nothing to do.

#### Scenario: Resuming after interruption
- **WHEN** a user re-runs `openspec migrate` on a project where some changes were already moved into shard directories but the config line was never written
- **THEN** the migration completes, the already-sharded changes stay where they are, and the config declares `lifecycle: status`

#### Scenario: Already migrated
- **WHEN** a user runs `openspec migrate` on a project already resolving to `lifecycle: status`
- **THEN** the command reports that the project is already on that mode and changes nothing

### Requirement: Migration is reversible

`openspec migrate --to archive` SHALL convert a status-mode project back. Shipped changes SHALL return to `changes/archive/<date>-<name>/`, proposed changes SHALL return to flat `changes/<name>/`, the `status` key SHALL be removed because location is the state under archive mode, emptied shard directories SHALL be pruned, and the `lifecycle` config line SHALL be removed. No spec text SHALL be modified in either direction.

The reverse direction SHALL refuse while any shipped change has unfolded deltas, since the archive layout asserts a fold that must already exist, and SHALL determine that using the same check `openspec sync --check` performs.

#### Scenario: Round trip restores the legacy layout
- **WHEN** a user runs `openspec migrate` and then `openspec migrate --to archive`
- **THEN** shipped changes are back under `changes/archive/` with their dates, active changes are flat, no `status` key remains, no shard directories remain, and the config no longer declares a lifecycle

#### Scenario: Reversal refuses on an unfolded shipped change
- **WHEN** a user runs `openspec migrate --to archive` in a project where a shipped change has unfolded deltas
- **THEN** the command fails telling the user to run `openspec sync` first, and nothing is moved

### Requirement: Migration preserves metadata it does not understand

When stamping a change's `.openspec.yaml`, migration SHALL preserve the file's existing keys, key order, and comments, editing only the fields it owns. Legacy metadata predates the current contract, and a migration that silently drops fields it does not recognize destroys history.

#### Scenario: Comments and ordering survive
- **WHEN** a change's `.openspec.yaml` carries a comment and keys in a particular order before migration
- **THEN** the migrated file retains that comment and ordering, with only the lifecycle fields added or removed
