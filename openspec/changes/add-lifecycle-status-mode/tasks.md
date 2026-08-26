## 1. Configuration

- [x] 1.1 Add the `lifecycle` field to the project config schema with `archive | status` values and `archive` as the default
- [x] 1.2 Add `resolveLifecycle(projectRoot)` and make an unreadable or invalid value fall back to the default rather than throw

## 2. Metadata

- [x] 2.1 Add the optional `status: proposed | shipped` field to the change metadata schema
- [x] 2.2 Create new changes with `status: proposed` under `lifecycle: status`, and unchanged under `lifecycle: archive`

## 3. Sync

- [x] 3.1 Implement `SyncCommand`: discover `shipped` changes, rebuild each affected spec, write only where the rebuild differs
- [x] 3.2 Decide "folded" by byte-identical regeneration so `--check` and the fold share one code path
- [x] 3.3 Implement `--check`: report without writing, and return a report whose `clean` flag drives the exit code at the CLI edge
- [x] 3.4 Report unreadable metadata as a conflict rather than skipping it, so the gate fails closed
- [x] 3.5 Report nothing to gate and exit 0 under `lifecycle: archive`

## 4. Ship

- [x] 4.1 Implement `ShipCommand`: set `status: shipped`, then delegate to `SyncCommand` so both halves land in one diff
- [x] 4.2 Make a re-ship a no-op
- [x] 4.3 Refuse under `lifecycle: archive` and point at `openspec archive`

## 5. Surfaces

- [x] 5.1 Show the lifecycle state in `openspec list` and add `--status <state>` filtering
- [x] 5.2 Reject an unknown `--status` value instead of printing an empty list
- [x] 5.3 Refuse `openspec archive` under `lifecycle: status` and point at the status workflow
- [x] 5.4 Register `sync`, `ship` and `list --status` in the completion command registry
- [x] 5.5 Reword the generated spec skeleton's Purpose line, which claimed the spec was created by archiving

## 6. Layout

- [x] 6.1 Enumerate changes across both the flat and creation-date sharded layouts from one shared discovery
- [x] 6.2 Resolve a bare change id in either layout, refusing ids discovery could never produce (separators, dot segments, shard and archive directory names)
- [x] 6.3 Refuse an ambiguous id carried by two shard dates rather than guessing
- [x] 6.4 Create sharded changes under `lifecycle: status`, and skip the `changes/archive/` scaffold the mode abolishes
- [x] 6.5 Route every enumerating and resolving surface — `show`, `validate`, `status`, `instructions`, completions, view — through the shared discovery
- [x] 6.6 Derive a change's name from a sharded path without mistaking the year shard for the change

## 7. Migration

- [x] 7.1 Convert archived changes to `status: shipped` and in-flight changes to `status: proposed`, sharded by date, deleting nothing
- [x] 7.2 Write the config line last so an interrupted run is resumable, and skip shard directories left by a partial run
- [x] 7.3 Refuse up front when legacy name reuse would produce an ambiguous bare id, naming the collisions
- [x] 7.4 Implement `--to archive`: shipped to `archive/<date>-<name>/`, proposed to flat, `status` stripped, empty shards pruned
- [x] 7.5 Refuse the reverse direction while a shipped change has unfolded deltas, reusing the gate's verdict rather than reimplementing it
- [x] 7.6 Support `--dry-run` for both directions
- [x] 7.7 Preserve comments and key order when stamping metadata

## 8. Tests

- [x] 8.1 Gate is green under `lifecycle: archive` regardless of any status field
- [x] 8.2 Gate fails on a shipped change whose delta is not folded, naming the capability
- [x] 8.3 Proposed changes are not gated and their deltas stay out of `specs/`
- [x] 8.4 Fold then re-check is green, and a second fold is a byte-identical no-op
- [x] 8.5 A named non-shipped change refuses to fold
- [x] 8.6 `ship` flips and folds in one step; re-ship is a no-op; refuses under archive mode
- [x] 8.7 Unreadable metadata produces the same conflict entry whether swept or named
- [x] 8.8 `archive` refuses under `lifecycle: status`, in text and JSON modes
- [x] 8.9 `list` rejects an unknown `--status` value
- [x] 8.10 Discovery finds flat, sharded and mixed trees, strips the day prefix, and skips `archive/`
- [x] 8.11 Ambiguous and hostile ids resolve to a refusal or null rather than a wrong directory
- [x] 8.12 Migration stamps both eras, flips the config, and leaves the gate green
- [x] 8.13 Migration refuses ambiguous legacy name reuse, and resumes after interruption
- [x] 8.14 Round trip restores the legacy layout, with no `status` key surviving

## 9. Release

- [x] 9.1 Add a changeset describing the new experimental mode
