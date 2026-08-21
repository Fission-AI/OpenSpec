## ADDED Requirements

### Requirement: Changes are discovered across both layouts

Change enumeration SHALL find changes in the flat layout (`changes/<name>/`) and in the creation-date sharded layout (`changes/YYYY/MM/DD-<name>/`) from one shared implementation. A four-digit directory SHALL be treated as a year shard and a two-digit directory beneath it as a month shard; any other directory SHALL be treated as a change. A change discovered under a shard SHALL be identified by its directory name with the `DD-` prefix removed. The `archive/` directory and hidden directories SHALL be excluded, as they are today.

#### Scenario: Mixed tree
- **WHEN** `openspec/changes/` contains `flat-change/`, `2026/03/15-old-change/`, and `archive/2026-01-01-buried/`
- **THEN** enumeration returns exactly `flat-change` and `old-change`

#### Scenario: Every surface agrees
- **WHEN** a project uses the sharded layout
- **THEN** `openspec list`, `openspec show`, `openspec validate`, `openspec status`, `openspec instructions`, shell completions, and the dashboard view all resolve its changes, and none of them reports a shard directory as a change

### Requirement: A bare change id resolves unambiguously or not at all

Resolving a change id SHALL find its directory in either layout. When two shard dates carry the same id, resolution SHALL fail with an error naming both locations rather than choosing one. An id that enumeration could never produce — one containing a path separator or null byte, a dot segment, a hidden name, the reserved `archive` name, or a bare year — SHALL resolve to nothing, so that no id can address a directory outside the change namespace.

#### Scenario: Ambiguous id is refused
- **WHEN** a user names a change id that exists under two different shard dates
- **THEN** the command fails with an error naming both directories

#### Scenario: Shard and reserved directories are not changes
- **WHEN** a user names `2026` or `archive` as a change id
- **THEN** resolution finds no change, rather than returning the shard or archive directory

#### Scenario: Traversing ids are refused
- **WHEN** a user names a change id containing `..` or a path separator
- **THEN** resolution finds no change, and no path outside `openspec/changes/` is read

### Requirement: New changes are created in the layout their mode implies

Under `lifecycle: status`, `openspec new change` SHALL create the change at `changes/YYYY/MM/DD-<name>/` using the creation date, and SHALL report the path it actually created. It SHALL NOT create the `changes/archive/` directory, which the mode does not use. Under `lifecycle: archive`, creation SHALL remain flat and unchanged.

#### Scenario: Sharded creation under status mode
- **WHEN** a user runs `openspec new change add-oauth` in a status-mode project on 2026-08-17
- **THEN** the change is created at `openspec/changes/2026/08/17-add-oauth/` and the reported path matches

#### Scenario: The abolished directory is not recreated
- **WHEN** a user runs `openspec new change add-oauth` in a status-mode project
- **THEN** no `openspec/changes/archive/` directory is created

#### Scenario: A name that could never be resolved is refused at creation
- **WHEN** a user runs `openspec new change archive` or `openspec new change 2026`
- **THEN** the command fails naming the id as reserved, because creation and resolution share one notion of which ids can address a change
