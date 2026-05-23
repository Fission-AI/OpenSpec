## MODIFIED Requirements

### Requirement: Initiative worktree creation
The `/opsp:apply` skill SHALL create a dedicated git worktree for the initiative branch before processing any milestones, leaving the operator's main checkout untouched.

#### Scenario: Creating an initiative worktree from scratch
- **WHEN** the agent begins executing an initiative via `/opsp:apply <initiative-name>` and neither the branch `opsp/<initiative-name>` nor a worktree for it exists
- **THEN** the agent SHALL run `git worktree add ../<repo>-opsp-<initiative-name> -b opsp/<initiative-name>` from the main checkout, where `<repo>` is the basename of the main checkout's directory
- **AND** `cd` into the new worktree directory
- **AND** verify location with `pwd` and verify branch with `git branch --show-current`
- **AND** NOT modify the branch checked out in the operator's main checkout

#### Scenario: Initiative branch exists without a worktree
- **WHEN** the branch `opsp/<initiative-name>` already exists but no worktree references it
- **THEN** the agent SHALL ask the operator: "Initiative branch opsp/<initiative-name> already exists. Resume from this branch or create a new one?"
- **AND** if resuming, run `git worktree add ../<repo>-opsp-<initiative-name> opsp/<initiative-name>` (no `-b`) to attach a worktree to the existing branch
- **AND** `cd` into the worktree and verify with `pwd` plus `git branch --show-current`

#### Scenario: Initiative worktree already exists from a prior run
- **WHEN** a worktree for branch `opsp/<initiative-name>` already exists at the conventional path
- **THEN** the agent SHALL `cd` into the existing worktree
- **AND** verify location with `pwd` and verify branch with `git branch --show-current` before continuing

#### Scenario: Worktree path collision with an unrelated directory
- **WHEN** the conventional worktree path `../<repo>-opsp-<initiative-name>` exists on disk but is not registered as a git worktree
- **THEN** the agent SHALL pause and present the conflict to the operator
- **AND** NOT overwrite or delete the existing directory

### Requirement: Change worktree creation
The `/opsp:apply` skill SHALL create a per-change worktree before implementing each opsx change within a milestone.

#### Scenario: Creating a change worktree from the initiative branch
- **WHEN** the agent is about to implement an opsx change named `<change-name>` for initiative `<initiative-name>`
- **THEN** the agent SHALL run `git worktree add ../<repo>-opsx-<initiative-name>-<change-name> -b opsx/<initiative-name>/<change-name> opsp/<initiative-name>` from any location
- **AND** `cd` into the new change worktree
- **AND** verify location with `pwd` and verify branch with `git branch --show-current`
- **AND** perform all implementation, edits, and test runs from inside the change worktree

#### Scenario: Branch name and filesystem path on all platforms
- **WHEN** creating a change worktree on any platform (including Windows)
- **THEN** the branch name SHALL use forward slashes (`opsx/<initiative-name>/<change-name>`) as git permits on all platforms
- **AND** the filesystem path SHALL flatten slashes to hyphens (`<repo>-opsx-<initiative-name>-<change-name>`) to remain compatible with Windows filesystem rules

### Requirement: Merge and prune on archive
The `/opsp:apply` skill SHALL merge the change branch back into the initiative branch when an opsx change is archived, then immediately remove the change worktree.

#### Scenario: Successful merge and prune
- **WHEN** an opsx change `<change-name>` has been archived for initiative `<initiative-name>`
- **THEN** the agent SHALL `cd` into the initiative worktree at `../<repo>-opsp-<initiative-name>`
- **AND** verify location with `pwd`
- **AND** run `git merge opsx/<initiative-name>/<change-name>`
- **AND** on successful merge (exit code 0), run `git worktree remove ../<repo>-opsx-<initiative-name>-<change-name>`
- **AND** preserve the change branch ref for history inspection (`git log`, diff)

#### Scenario: Merge conflict during change branch merge
- **WHEN** merging `opsx/<initiative-name>/<change-name>` into `opsp/<initiative-name>` results in a merge conflict
- **THEN** the agent SHALL pause and present the conflict files to the operator
- **AND** NOT remove the change worktree until the merge is resolved and committed
- **AND** NOT auto-resolve merge conflicts

#### Scenario: Corrective work after a merged change
- **WHEN** the operator requests a correction to a change whose worktree has already been pruned
- **THEN** the agent SHALL NOT recreate a worktree for the merged change branch
- **AND** SHALL produce a new opsx change with its own fresh worktree to carry the correction

### Requirement: Worktree and branch naming convention
All branches and worktrees created by opsp/opsx workflows SHALL follow a namespaced convention for discoverability.

#### Scenario: Branch name format
- **WHEN** creating any branch for an initiative or change
- **THEN** initiative branches SHALL use the format `opsp/<initiative-name>`
- **AND** change branches SHALL use the format `opsx/<initiative-name>/<change-name>`
- **AND** both `<initiative-name>` and `<change-name>` SHALL be kebab-case

#### Scenario: Worktree path format
- **WHEN** creating any worktree for an initiative or change
- **THEN** the worktree SHALL live as a sibling of the main checkout
- **AND** initiative worktrees SHALL use the path `../<repo>-opsp-<initiative-name>`
- **AND** change worktrees SHALL use the path `../<repo>-opsx-<initiative-name>-<change-name>`
- **AND** `<repo>` SHALL be the basename of the main checkout's directory

## ADDED Requirements

### Requirement: Working-directory discipline
The `/opsp:apply` skill SHALL maintain explicit awareness of the current worktree at every step, since switching worktrees requires an explicit `cd` rather than the implicit ref swap that `git checkout` provides.

#### Scenario: Verification after every cd
- **WHEN** the agent transitions between worktrees (main ↔ initiative, initiative ↔ change)
- **THEN** the agent SHALL run `pwd` after `cd`
- **AND** SHALL run `git branch --show-current` to confirm the expected branch is checked out
- **AND** SHALL NOT perform file reads/edits, test runs, or git mutating operations until the location is verified

#### Scenario: Implementation work happens only in the change worktree
- **WHEN** the agent is implementing the tasks of an opsx change
- **THEN** all Read/Edit/Write operations SHALL operate on paths inside the change worktree
- **AND** the agent SHALL NOT read or write files from the main checkout or the initiative worktree during implementation

### Requirement: Orphan worktree recovery
The `/opsp:apply` and `/opsp:archive` skills SHALL handle worktrees left behind by interrupted runs.

#### Scenario: Stale worktree references
- **WHEN** `git worktree list` reports a worktree whose directory no longer exists, or an initiative/change directory exists on disk but is not registered with git
- **THEN** the agent SHALL run `git worktree prune` to clean stale registrations
- **AND** report any unresolved orphans (directories that look like opsp/opsx worktrees but are not registered) to the operator before proceeding
