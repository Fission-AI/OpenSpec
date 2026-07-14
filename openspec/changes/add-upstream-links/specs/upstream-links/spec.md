# Upstream Links

## ADDED Requirements

### Requirement: Changes declare the work they serve

A change's metadata MAY carry `serves: <change>` (same root) or
`serves: <store-id>/<change>` (a registered store). `openspec new change
--serves <ref>` SHALL validate the ref before creating anything, write the
metadata line, record the repo as a linked root, and add the store to the
repo's `references:` when it can do so safely.

#### Scenario: Linking wires context automatically
- **GIVEN** a repo with no reference to store `product-hub`
- **WHEN** the user runs `openspec new change add-tour --serves product-hub/onboarding-revamp`
- **THEN** the change is created with `serves: product-hub/onboarding-revamp`, the repo is recorded machine-locally for rollups, and `references: [product-hub]` is added to `openspec/config.yaml`

#### Scenario: A malformed ref creates nothing
- **GIVEN** any repo
- **WHEN** the user passes `--serves a/b/c`
- **THEN** the command fails with a validation message and no change directory is left behind

### Requirement: The downstream rollup is discovered, not maintained

`openspec list --downstream` SHALL show each of the root's changes with
every change on this machine that serves it, with task progress, scanning
the root, other registered stores, and linked roots. Refs whose target is
missing SHALL render visibly; archived targets SHALL be marked as archived.

#### Scenario: Cross-repo rollup from one metadata line
- **GIVEN** changes in two repos whose metadata serves `product-hub/onboarding-revamp`
- **WHEN** the user runs `openspec list --downstream --store product-hub`
- **THEN** both serving changes appear under `onboarding-revamp` with their repo names and task counts

#### Scenario: Archived upstream stays traceable
- **GIVEN** the upstream change has been archived
- **WHEN** the rollup or a serving change's instructions render
- **THEN** the link resolves to the archived copy and states that its requirements now live in specs

### Requirement: Rollups work without per-machine state

`openspec list --downstream --scan <dir>` SHALL also scan the directory
and its immediate subdirectories for serving changes, so a machine with no
linked-root records (CI) can produce the team rollup from clones alone.

#### Scenario: A CI machine rolls up from fresh clones
- **GIVEN** a machine with no OpenSpec state, a cloned store registered by path, and code repos cloned under `./checkouts`
- **WHEN** `openspec list --downstream --store <id> --scan ./checkouts` runs
- **THEN** serving changes from the scanned clones appear in the rollup

### Requirement: Complete means the whole change

A serving change SHALL count as complete only when its tasks are checked
off AND (when its schema is resolvable) all of its schema's artifacts
exist; half-done work SHALL render both counts.

#### Scenario: Checked tasks with missing artifacts is not done
- **GIVEN** a serving change with all tasks checked but only one of four schema artifacts present
- **WHEN** the rollup renders
- **THEN** the change shows as in-progress with both task and artifact counts

### Requirement: Instructions carry upstream context

Instruction surfaces for a serving change SHALL open with an `<upstream>`
block naming the upstream change, its on-disk path (or that it is missing),
and the rollup command.

#### Scenario: Intent travels without pasting
- **GIVEN** a change with `serves: product-hub/onboarding-revamp` and the store registered locally
- **WHEN** the user runs `openspec instructions <artifact> --change <name>`
- **THEN** the output contains the upstream change's absolute path and directs the agent to read its artifacts before working
