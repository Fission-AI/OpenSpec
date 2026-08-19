## ADDED Requirements

### Requirement: Projects select a lifecycle mode in config

`openspec/config.yaml` SHALL accept a `lifecycle` field with the values `archive` or `status`. When the field is absent, unreadable, or carries an unrecognized value, the project SHALL resolve to `archive`, which is the existing behavior. No project acquires status-mode behavior without declaring it.

#### Scenario: No lifecycle field declared
- **WHEN** a project's `openspec/config.yaml` has no `lifecycle` field
- **THEN** the project resolves to `lifecycle: archive` and every command behaves exactly as before

#### Scenario: Status mode declared
- **WHEN** a project's `openspec/config.yaml` contains `lifecycle: status`
- **THEN** the project resolves to `lifecycle: status`

#### Scenario: Unrecognized value falls back rather than failing
- **WHEN** a project's `openspec/config.yaml` contains `lifecycle: bogus`
- **THEN** the project resolves to `lifecycle: archive` rather than raising a fatal error

### Requirement: A change records its lifecycle state as metadata

A change's `.openspec.yaml` SHALL accept an optional `status` field with the values `proposed` or `shipped`. Under `lifecycle: status`, a newly created change SHALL be written with `status: proposed` so that no change in that mode has an ambiguous state. Under `lifecycle: archive`, change creation SHALL NOT write a status field.

#### Scenario: New change under status mode is born proposed
- **WHEN** a user runs `openspec new change add-auth` in a project resolving to `lifecycle: status`
- **THEN** the created `.openspec.yaml` contains `status: proposed`

#### Scenario: New change under archive mode carries no status
- **WHEN** a user runs `openspec new change add-auth` in a project resolving to `lifecycle: archive`
- **THEN** the created `.openspec.yaml` contains no `status` field

### Requirement: Sync folds shipped changes into the main specs

`openspec sync` SHALL fold the spec deltas of every change declaring `status: shipped` into `openspec/specs/`, and SHALL leave the deltas of changes in any other state out of `openspec/specs/`. A change SHALL be considered folded when re-applying its delta to the current spec produces byte-identical output, so that a repeated run writes nothing.

#### Scenario: Shipped change is folded
- **WHEN** a user runs `openspec sync` in a status-mode project containing a change with `status: shipped` whose delta is not yet in the main spec
- **THEN** the delta is applied to the main spec

#### Scenario: Proposed change is not folded
- **WHEN** a user runs `openspec sync` in a status-mode project whose only change declares `status: proposed`
- **THEN** the main spec is not created or modified

#### Scenario: Repeated sync is a no-op
- **WHEN** a user runs `openspec sync` twice in succession
- **THEN** the second run leaves every main spec byte-identical to the first run's output

#### Scenario: Naming a change that is not shipped
- **WHEN** a user runs `openspec sync <change>` naming a change whose status is not `shipped`
- **THEN** the command fails with a message stating that only shipped changes fold into `specs/`

### Requirement: Sync check gates the shipped-implies-folded predicate

`openspec sync --check` SHALL report whether every `shipped` change's deltas are folded, without writing to `openspec/specs/`, and SHALL cause a non-zero exit when any shipped change has unfolded deltas. A change whose metadata cannot be read SHALL be reported as a conflict rather than skipped, so that the gate fails closed. The check SHALL use the same fold implementation the write path uses.

#### Scenario: Shipped but unfolded fails the gate
- **WHEN** a user runs `openspec sync --check` in a status-mode project containing a shipped change whose delta is not folded
- **THEN** the command names the change and the affected capability, does not modify any spec, and exits non-zero

#### Scenario: Fully folded tree passes the gate
- **WHEN** a user runs `openspec sync --check` in a status-mode project where every shipped change is folded
- **THEN** the command exits zero

#### Scenario: Unreadable metadata fails closed
- **WHEN** a user runs `openspec sync --check` in a status-mode project containing a change whose `.openspec.yaml` cannot be parsed
- **THEN** that change is reported as a conflict and the command exits non-zero

### Requirement: Ship declares and folds in one diff

`openspec ship <change>` SHALL set the named change's status to `shipped` and then fold its deltas, so that the working-tree diff which declares a change shipped is the same diff that satisfies the shipped-implies-folded predicate. Shipping an already-shipped change SHALL be a no-op.

#### Scenario: Ship flips status and folds
- **WHEN** a user runs `openspec ship add-auth` in a status-mode project where `add-auth` is proposed
- **THEN** the change's `.openspec.yaml` records `status: shipped` and its delta is applied to the main spec

#### Scenario: Re-shipping changes nothing
- **WHEN** a user runs `openspec ship add-auth` on a change that is already shipped and folded
- **THEN** no spec file is modified

### Requirement: List surfaces and filters lifecycle state

`openspec list` SHALL display the lifecycle state of each change that declares one, and SHALL accept `--status <state>` to show only changes in that state. An unrecognized `--status` value SHALL be rejected with a message naming the valid states, rather than silently matching nothing.

#### Scenario: Filtering by state
- **WHEN** a user runs `openspec list --status shipped` in a project containing both shipped and proposed changes
- **THEN** only the shipped changes are listed

#### Scenario: Unknown state is rejected
- **WHEN** a user runs `openspec list --status bogus`
- **THEN** the command fails with a message naming the valid lifecycle states

### Requirement: Archive and status modes stay disjoint

Neither mode's commands SHALL act on a project that has selected the other. `openspec archive` SHALL refuse to run in a project resolving to `lifecycle: status`, and `openspec ship` SHALL refuse to run in a project resolving to `lifecycle: archive`; both messages SHALL name the resolved mode and point at the other mode's workflow. `openspec sync` SHALL instead report that there is nothing to gate under `lifecycle: archive` and exit zero, so that a repository-wide gate invocation is harmless in a project that has not opted in.

#### Scenario: Archive refuses under status mode
- **WHEN** a user runs `openspec archive add-auth` in a status-mode project
- **THEN** the command fails with a message naming `lifecycle: status` and pointing at the status workflow, and no files are moved or modified

#### Scenario: Ship refuses under archive mode
- **WHEN** a user runs `openspec ship add-auth` in a project resolving to `lifecycle: archive`
- **THEN** the command fails with a message naming `lifecycle: archive` and pointing at `openspec archive`, and no status field is written

#### Scenario: Sync is a harmless no-op under archive mode
- **WHEN** a user runs `openspec sync --check` in a project resolving to `lifecycle: archive`
- **THEN** the command reports that the project uses archive mode, modifies nothing, and exits zero

### Requirement: The gate fails closed when it cannot read the tree

`openspec sync` SHALL treat an absent `openspec/changes/` directory as "no changes" and exit zero, but SHALL propagate any other error encountered while enumerating changes rather than reporting an empty result. A tree the gate cannot read SHALL NOT be reported as a passing tree.

#### Scenario: Missing changes directory is not an error
- **WHEN** a user runs `openspec sync --check` in a status-mode project that has no `openspec/changes/` directory
- **THEN** the command reports no shipped changes to sync and exits zero

#### Scenario: Unreadable changes directory fails rather than passing
- **WHEN** a user runs `openspec sync --check` in a status-mode project whose `openspec/changes/` path cannot be enumerated
- **THEN** the command fails rather than reporting a clean tree
