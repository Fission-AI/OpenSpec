## ADDED Requirements

### Requirement: Validator SHALL detect unresolved and self-referential dependencies

Bulk validation of changes SHALL treat a `depends_on` entry naming a change that is neither an active change nor an archived change as an error, and a `depends_on` entry naming the owning change itself as an error.

#### Scenario: Dependency name never existed or is misspelled
- **WHEN** a change's `depends_on` names a change that is not found among active or archived changes
- **THEN** validation reports an error on the owning change naming the unresolved dependency

#### Scenario: Dependency on an archived change is not an error
- **WHEN** a change's `depends_on` names a change found among archived changes
- **THEN** validation does not report an error for that entry, since the dependency is already satisfied

#### Scenario: Self-dependency
- **WHEN** a change's `depends_on` includes its own name
- **THEN** validation reports an error on that change

### Requirement: Validator SHALL detect dependency cycles across active changes

Bulk validation of changes SHALL treat a cycle formed by `depends_on` edges among active changes as an error, reported on every change in the cycle.

#### Scenario: Direct cycle
- **WHEN** active change `a` has `depends_on: [b]` and active change `b` has `depends_on: [a]`
- **THEN** validation reports a cycle error on both `a` and `b`, naming the cycle path

#### Scenario: Indirect cycle
- **WHEN** active changes `a`, `b`, and `c` have `depends_on` edges `a → b → c → a`
- **THEN** validation reports a cycle error on `a`, `b`, and `c`, naming the cycle path

#### Scenario: No cycle
- **WHEN** active changes' `depends_on` edges form a directed acyclic graph
- **THEN** validation reports no cycle error

### Requirement: Validator SHALL support an opt-in capability-overlap suggestion check

`openspec validate` SHALL accept a `--check-dependencies` flag. When set, for each validated change it SHALL report an informational finding for every other active change that declares at least one of the same capability paths (a `specs/<capability-path>/spec.md` under the change directory) and has no `depends_on` relationship with it in either direction. This check SHALL NOT run unless the flag is passed, and its findings SHALL be informational only — they SHALL NOT cause strict validation to fail.

This is a suggestion surface for a human or an agent to judge, not a defect: a shared capability path does not itself mean one change depends on the other (see `design.md` for how `/opsx:explore` uses it).

#### Scenario: Flag absent
- **WHEN** `openspec validate <name>` is run without `--check-dependencies`, and another active change shares a capability path with `<name>`
- **THEN** validation reports no capability-overlap finding

#### Scenario: Shared capability, no declared relationship
- **WHEN** `openspec validate <name> --check-dependencies` is run, another active change `<other>` declares a spec delta under the same capability path as `<name>`, and neither change names the other in `depends_on`
- **THEN** validation reports an informational finding on `<name>` naming `<other>` and the shared capability path

#### Scenario: Shared capability, relationship already declared
- **WHEN** `openspec validate <name> --check-dependencies` is run and `<name>` or `<other>` already names the other in `depends_on`
- **THEN** validation reports no finding for that pair

#### Scenario: No shared capability
- **WHEN** `openspec validate <name> --check-dependencies` is run and no other active change shares a capability path with `<name>`
- **THEN** validation reports no capability-overlap finding

#### Scenario: Strict mode is unaffected by suggestions
- **WHEN** `openspec validate <name> --check-dependencies --strict` is run and the only findings are capability-overlap suggestions
- **THEN** validation succeeds
