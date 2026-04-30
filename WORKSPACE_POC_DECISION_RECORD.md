# Workspace POC Decision Record

- Status: Proposed working direction
- Date: 2026-04-17
- Scope: Captures the workspace / multi-repo planning discussion, the decisions reached so far, the rationale behind them, and the open questions that remain before implementation.
- Audience: OpenSpec maintainers and future implementers of the workspace feature

## Decision Summary

This document records the current working direction for a workspace POC:

- A workspace should be a persistent coordination home, not a feature-scoped temporary directory.
- A workspace contains many feature-scoped changes.
- The primary user-facing primitive remains `change`; a separate top-level `initiative` primitive is not required for the POC.
- Planning should be centralized in the workspace.
- Canonical specs must remain in the owning repo.
- Per-target tasks and per-target delta specs may be authored centrally in the workspace and then materialized into target repos for execution.
- Methodology and topology are separate concerns:
  - Methodology: `spec-driven`, future `test-driven`, etc.
  - Topology: single-repo vs workspace / multi-repo
- We should avoid creating a schema-family split like `spec-driven-single` vs `spec-driven-multi`.
- No separate workspace schema should be required for the POC; workspace behavior should reuse the existing methodology schema plus workspace/change metadata and workspace-aware CLI behavior.
- The current `spec-driven` implementation is too local-root-shaped, but the long-term direction is to evolve the existing methodology schema to understand workspace topology rather than introduce a new methodology family for coordination.
- Materialized repo-local changes should reuse the workspace change ID by default.
- Workspace completion should be two-step:
  - soft-done when all known coordination and target tasks are complete
  - hard-done only when the user manually archives the workspace change
- Repo targets and module namespaces should remain separate for now.
- Machine-specific repo paths should not be stored in committed config. Keep committed workspace metadata and the gitignored local overlay side by side under `.openspec/`.
- Because a workspace is itself a dedicated OpenSpec home, it should not add an extra inner `openspec/` directory just to mirror project-repo layout.
- Change-scoped repo attachment is the correct default. A workspace with many repos should not attach all of them to an agent session by default.
- For the POC, Claude Code is the cleanest demo path. Copilot should be treated as partial/manual support, not the headline path.
- `workspace create` should reuse the existing init/setup path rather than inventing a second setup system.
- For v0, the workspace should live in a managed location by default; arbitrary user-chosen workspace paths are deferred.

## Priority Completeness Checklist

These are the highest-priority items to keep visible before implementation starts.

### Locked Working Decisions

- Keep a single methodology schema per methodology. The workspace POC reuses `spec-driven`; it does not introduce a separate workspace schema or a second schema copy to maintain.
- Materialized repo-local changes should reuse the same change ID as the workspace change unless a concrete collision problem forces a later exception.
- Authority transfers per target at successful materialization. Before `apply`, the workspace target slice is the planning truth; after `apply --change <id> --repo <alias>`, the repo-local change is the execution truth for that repo.
- Workspace completion is manual at the top level:
  - soft-done when all known workspace coordination tasks and tracked target tasks are complete
  - hard-done only when the user explicitly archives the workspace change
- Workspace metadata should live under a single `.openspec/` directory at the workspace root. Dedicated workspaces should not wrap everything in an extra `openspec/` directory.

### Remaining Decisions To Confirm

- Define materialization behavior precisely:
  - create-only by default or explicit refresh support
  - overwrite rules
  - conflict handling
- Define the minimum supported `workspace open --change` behavior and which agents are officially supported in v0.

### Highest Risks

- Agent multi-root support may be too weak for the workflow to be real.
- Workspace drafts and repo-local execution may diverge immediately after materialization.
- Shared contract ownership can remain vague unless promotion into an owner repo is explicit.
- Local absolute paths must never leak into shareable state.

### Open Questions To Keep Front-Of-Mind

- How workspace status should reflect repo-local progress.
- Whether repo-local changes need reverse links back to the workspace change.
- How shared-contract drafts are promoted into canonical owner repos.
- What the migration seam is from local alias/path overlays to stable team-shared project IDs.

## Discussion Evolution

The discussion changed shape several times. That evolution is important because it explains why the current direction is what it is.

1. The initial workspace exploration materials leaned toward a feature-scoped coordination workspace and, in some places, toward an explicit initiative-like planning object.
2. The discussion then challenged whether a new `initiative` primitive was necessary at all for a POC and moved toward reusing `change` as the main planning object.
3. The model then shifted from:
   - workspace as a feature-specific coordination folder
   to:
   - workspace as a persistent coordination home with feature-scoped changes inside it.
4. The artifact model then shifted from:
   - repo-local tasks / changes / delta specs as the primary authoring surface
   to:
   - central planning in the workspace, with repo-local artifacts created later for execution.
5. The schema discussion also shifted:
   - initially toward a special `coordination` schema,
   - then toward the first-principles view that methodology and topology should not be coupled.

The final position in this record reflects the end of that sequence, not the starting point.

## Problem Statement

OpenSpec today is strongly single-root oriented:

- commands mostly resolve from `process.cwd()`
- change workflows assume a local `openspec/changes/<name>/`
- specs and delta specs are treated as local to the current root
- `apply` and `archive` semantics are repo-local

This creates real friction for multi-repo work:

- users want one planning surface
- teams want one place to see the whole change
- shared behaviors can cross repo boundaries
- repos still need to own code, review, shipping, and canonical specs

The core product tension is:

```text
centralized planning convenience
vs
distributed ownership and canonical truth
```

Users usually want planning in one place:

- one proposal
- one design
- one rollout plan
- one place to see affected repos
- one place to reason about cross-repo behavior

But durable ownership still belongs to repos:

- code changes happen in repos
- canonical specs live in owner repos
- archive happens against repo-local canonical specs
- different repos can move at different speeds

The workspace POC exists to resolve that tension without forcing OpenSpec to become a fully generic multi-root CLI immediately.

## Goals

The workspace POC should:

1. Provide a quick, working, honest coordination experience for cross-repo work.
2. Give users a persistent coordination home, more like a project board than a one-off feature folder.
3. Centralize planning for multi-repo work.
4. Preserve canonical spec ownership in repos.
5. Minimize disruption to existing repo-local OpenSpec workflows.
6. Provide a clean path to future managed / shared / remote workspace storage.
7. Avoid prematurely coupling this work to module-namespace or stable remote project ID work.

## Non-Goals

The POC should not try to solve all future workspace problems.

Out of scope:

- a fully multi-root-aware CLI across every command
- stable `github.com/org/repo` identifiers
- team-shared committed workspace semantics
- automatic escalation from single-repo to workspace
- shared-contract ownership prompting and governance
- unifying repo targets with module namespaces
- final answers for every agent’s cross-root write model
- a full mirror/sync store for keeping all repos inside one workspace tree

## First-Principles Model

### Two Separate Axes

The most important first-principles outcome from the discussion is that two concerns must remain separate.

Axis 1: Methodology

- `spec-driven`
- future `test-driven`
- possibly other methodologies later

Axis 2: Topology

- single-repo
- workspace / multi-repo
- centralized planning with local materialization

These axes should not be collapsed into one dimension.

Bad direction:

- `spec-driven-single`
- `spec-driven-multi`
- `test-driven-single`
- `test-driven-multi`

That creates a methodology x topology matrix and couples concerns that should remain independent.

### Consequence

The long-term architectural direction should be:

- one methodology schema family per methodology
- topology handled separately through change/workspace metadata, artifact resolution, and apply semantics

This means:

- the current `spec-driven` implementation may need to evolve
- but the product should avoid inventing a separate coordination methodology family unless forced later by implementation reality

### Centralize The View, Not Necessarily The Truth

Another key principle from the discussion:

```text
centralize the view
not necessarily the truth
```

In practice:

- workspace centralizes the working set
- repos remain the location of canonical execution and canonical specs

## Terminology

### Workspace

A persistent coordination root used for cross-repo planning.

It is not a canonical spec store.

### Workspace Change

A feature-scoped change that lives inside a workspace.

This is the central planning object for a cross-repo effort.

### Repo-Local Change

A change that lives in a concrete target repo and is used for repo-local execution and archive.

### Target Repo

A registered repo alias that a workspace change affects.

Examples:

- `web-client`
- `billing-service`
- `contracts`

### Canonical Spec

The source-of-truth spec that lives in the owning repo.

### Planning Artifact

An artifact used to reason about or coordinate work before or across execution.

Examples:

- centralized proposal
- centralized design
- coordination tasks
- workspace draft of shared behavior
- central per-target tasks / deltas before materialization

### Execution Artifact

An artifact used to implement, review, and archive work inside a concrete repo.

Examples:

- repo-local tasks
- repo-local delta specs
- repo-local change metadata

### Materialization

The act of pulling centrally-authored per-target artifacts out of the workspace and into a repo-local change so that repo-local execution can begin.

### Module

A namespace / spec resolution concept from `module-namespace`.

Modules and repo targets are intentionally distinct in this POC.

## Chosen Model

### Workspace Shape

The workspace is persistent and team-scoped or area-scoped.

Examples:

- `client-dev-workspace`
- `platform-workspace`
- `payments-workspace`

It is not feature-scoped.

The feature-scoped thing is the change inside the workspace.

### Change Shape

The user-facing primitive remains `change`.

The current working model is:

- one workspace
- many feature-scoped changes inside it
- each change may target one or more registered repos

This means a cross-repo feature like `add-3ds` lives as one central change inside the workspace.

### Planning vs Execution Split

This was the central design outcome.

Planning should be centralized.

Execution should still happen in repos.

The selected model is:

1. Centralized planning in workspace
2. Central authoring of per-target tasks / delta specs is allowed
3. Repo-local execution begins only after materialization
4. After materialization, the repo-local change becomes the execution truth

This deliberately separates:

- authoring location
- execution location
- canonical ownership location

These do not need to be the same place.

### Canonical Ownership

Canonical specs always live in owner repos.

If a behavior spans repos:

- if there is a known canonical owner, the canonical spec belongs there
- if there is not yet an owner, the workspace may hold a draft shared-behavior note until ownership is assigned

The workspace may summarize or draft a shared contract.

The workspace should not become a second canonical spec store.

### Repo Targets

The workspace knows which repos are reachable.

A workspace change knows which registered repos it targets.

The current intended rule is:

- workspace registers repos by alias
- change declares `targets`
- unknown target should hard-fail at creation time

For the POC:

- targets are user-authored
- the agent may suggest targets
- the agent should not mutate targets automatically

### Change-Scoped Open

A workspace with many repos should not attach all repos by default.

The intended model is:

- `workspace open --change <id>` attaches only the repos targeted by that change
- `workspace open` without a change is planning-only mode

This keeps the UX manageable for large workspaces.

### Repo Targets vs Modules

Repo targets are not the same as modules.

For this POC:

- repo target = execution target / attached root
- module = namespace / resolution unit for specs

Possible future unification is explicitly deferred.

## Data Model and File Layout

The working POC layout is now explicit enough to plan around. The biggest shift from earlier drafts is that a dedicated workspace should not wrap its own artifacts in an inner `openspec/` directory.

### Workspace Root

```text
<managed-workspace-root>/client-dev-workspace/
  .openspec/
    workspace.yaml
    local.yaml
  changes/
    add-3ds/
      .openspec.yaml
      proposal.md
      design.md
      tasks/
        coordination.md
      targets/
        contracts/
          tasks.md
          specs/
            payments/
              3ds-contract/
                spec.md
        billing-service/
          tasks.md
          specs/
            payments/
              authorization/
                spec.md
        web-client/
          tasks.md
          specs/
            checkout/
              card-payment/
                spec.md
      notes/
        3ds-draft-notes.md
```

Unlike a product repo, the workspace root is already dedicated to OpenSpec coordination, so an inner `openspec/` directory adds ceremony without buying isolation.

### Unified Workspace Metadata Directory

This was an important decision.

Machine-specific absolute paths should not be stored in committed config.

Committed workspace metadata should contain stable workspace metadata and repo aliases.

Gitignored local overlay should contain alias -> absolute path mapping.

Illustrative shape:

`.openspec/workspace.yaml`

```yaml
schema: spec-driven
workspace:
  name: client-dev-workspace
repos:
  web-client: {}
  billing-service: {}
  contracts: {}
```

`.openspec/local.yaml`

```yaml
repos:
  web-client:
    path: /Users/alex/work/web-client
  billing-service:
    path: /Users/alex/work/billing-service
  contracts:
    path: /Users/alex/work/contracts
```

If the workspace is ever put under version control, `.openspec/local.yaml` must remain ignored or otherwise excluded from shared state.

### Workspace Change Metadata

Illustrative shape:

`.openspec.yaml`

```yaml
schema: spec-driven
topology: workspace
targets:
  - web-client
  - billing-service
  - contracts
```

Important note:

- `schema` should stay the normal methodology schema name, such as `spec-driven`
- `topology` is illustrative
- the exact field names are not final
- the discussion outcome is about the model, not the exact parser contract

### Materialized Repo-Local Layout

After materialization, a target repo might contain:

```text
web-client/
  openspec/
    changes/
      add-3ds/
        .openspec.yaml
        tasks.md
        specs/
          checkout/
            card-payment/
              spec.md
```

The materialized repo-local change should reuse the workspace change ID (`add-3ds`) rather than derive a target-specific variant.

And the canonical shared contract would still live in the owner repo:

```text
contracts/
  openspec/
    specs/
      payments/
        3ds-contract/
          spec.md
```

## Command Surface For The POC

The discussion converged on a small, explicit command surface.

### Required POC Commands

- `openspec workspace create <name>`
- `openspec workspace add-repo <alias> <path>`
- `openspec workspace doctor`
- `openspec new change <id> --targets <a,b,c>`
- `openspec workspace open --change <id> [--agent <tool>]`
- `openspec apply --change <id> --repo <alias>`

### Command Intent

#### `openspec workspace create <name>`

- creates a persistent workspace in a managed location
- should delegate to existing init/setup logic, not invent a parallel setup path
- should create a dedicated workspace root with `.openspec/` metadata and top-level `changes/`

#### `openspec workspace add-repo <alias> <path>`

- validates that the target path exists
- validates that the target path has `openspec/`
- writes the alias -> absolute path mapping to the local overlay

#### `openspec workspace doctor`

- validates that every registered repo still resolves
- intended to run before or during workspace open

#### `openspec new change <id> --targets <a,b,c>`

- creates a workspace change
- records explicit targets
- hard-fails if a target alias is unknown

#### `openspec workspace open --change <id> [--agent <tool>]`

- opens a planning / execution session from the workspace
- in change-scoped mode, attaches only the repos targeted by the change
- without `--change`, operates in planning-only mode

#### `openspec apply --change <id> --repo <alias>`

- materializes centrally-authored target artifacts into the selected repo
- is the most robust default for the POC because it does not rely on every agent having the same multi-root write model

### Explicitly Deferred Commands / Behaviors

The POC should not promise:

- fully generic multi-root `show`
- fully generic multi-root `validate`
- fully generic multi-root `archive`
- fully generic multi-root `view`
- automatic escalation prompts
- full sync/mirror store behavior

## Lifecycle Flows

### 1. Create Workspace

1. User creates a persistent workspace.
2. OpenSpec initializes the workspace root with `.openspec/workspace.yaml`, `.openspec/local.yaml`, and `changes/`.
3. The workspace becomes the central coordination home for future changes.

### 2. Register Repos

1. User registers target repos by alias.
2. Aliases are stored in `.openspec/workspace.yaml`.
3. Absolute paths are stored in `.openspec/local.yaml`.
4. `workspace doctor` verifies they still resolve.

### 3. Create A Coordinated Change

1. User creates a change inside the workspace.
2. The change records the repo targets it affects.
3. Proposal, design, coordination tasks, and central per-target planning artifacts are authored in the workspace.

### 4. Plan Centrally

The workspace change should centralize:

- proposal
- design
- rollout / coordination tasks
- affected repos
- draft shared-behavior notes
- per-target draft tasks
- per-target draft delta specs

### 5. Materialize To Repo

When execution should begin in one repo:

1. user or agent invokes `openspec apply --change <id> --repo <alias>`
2. OpenSpec copies or materializes the selected target’s tasks/deltas into that repo’s local change
3. The repo-local change uses the same change ID as the workspace change
4. Successful materialization transfers execution authority for that target to the repo-local change

### 6. Execute In Repo

Once materialized:

- implementation happens against the repo-local change
- repo-local tasks are updated there
- repo-local delta specs are archived there

### 7. Archive In Repo

Archive remains repo-local because canonical specs remain repo-local.

Independent repo shipping cadence is allowed.

Examples:

- web ships first
- billing ships later
- contracts update lands first or last

### 8. Roll Up Status To Workspace

Status roll-up remains operationally open, but the minimum semantics are now clearer.

The workspace should eventually know:

- which targets have materialized
- which targets are still in planning
- which targets have archived
- whether the overall change is soft-done or manually archived

The remaining open pieces are the exact storage model and command output shape.

## Agent and Tooling Constraints

This was one of the most important practical discoveries in the discussion.

### Hard Constraint

Workspace planning is only real if the agent can actually see the target repos.

If the agent cannot reliably read attached target roots, the workspace is just a notes directory.

### Planning-Only vs Attached-Roots Mode

The model should distinguish:

- planning-only mode
- attached-roots mode for a specific change

Planning-only mode:

- no repo roots attached
- safe for general brainstorming

Attached-roots mode:

- only the change’s targeted repos are attached
- canonical spec read-through works because the agent can read those repo paths directly

### Tool Support

Current understanding from the discussion:

- Claude Code has the strongest clean multi-root story for the POC
- Codex has a better launch-time write-capable multi-root story than Copilot
- Copilot CLI is currently the weakest option for one-shot attach-at-launch behavior

Therefore:

- Claude should be the clean demo path
- Codex can be considered secondary if easy
- Copilot should be considered partial/manual support for the POC

### Consequence For Apply

Because agent multi-root write behavior varies by tool, `openspec apply --change --repo` as a CLI materialization step is the safest POC default.

That avoids requiring every tool to directly write into every repo during the first demo.

## Design Decisions and Rationale

### 1. Persistent Workspace, Not Feature-Scoped Workspace

Decision:

- workspace is persistent
- changes inside it are feature-scoped

Why:

- feels more like a project board
- avoids “restart the world” every time cross-repo work appears
- keeps planning from the workspace natural

### 2. Keep `change` As The Primitive

Decision:

- no required top-level `initiative` primitive for the POC

Why:

- avoids proliferating top-level concepts
- better aligns with the move toward reuse and unification
- keeps user-facing language simpler

### 3. Central Planning, Local Materialization

Decision:

- planning artifacts stay in workspace
- execution artifacts are materialized into repos

Why:

- gives users one planning surface
- preserves repo-local execution semantics
- avoids forcing workspace to own canonical specs or archive

### 4. Canonical Specs Stay In Owner Repos

Decision:

- canonical specs never move into workspace

Why:

- preserves ownership clarity
- keeps archive honest
- avoids duplicated sources of truth

### 5. Draft Shared Behavior May Live In Workspace Temporarily

Decision:

- if cross-repo behavior has no clear owner yet, workspace may hold a draft

Why:

- ownership often becomes clear only after exploration
- workspace is a good place for temporary coordination material

### 6. Methodology And Topology Stay Separate

Decision:

- do not split methodology families by single vs multi-repo

Why:

- avoids a methodology x topology matrix
- preserves long-term conceptual cleanliness
- aligns with first-principles reasoning

### 7. Do Not Commit Absolute Paths

Decision:

- split stable config and local paths overlay

Why:

- machine-specific paths do not belong in shared state
- this is cheap to do now and painful to migrate later

### 8. Repos And Modules Stay Separate For Now

Decision:

- no repo/module unification in this POC

Why:

- they represent different concerns
- unifying them now would entangle workspace work with module-namespace work

### 9. Change-Scoped Attachment, Not Attach-All

Decision:

- `workspace open --change <id>` attaches only target repos

Why:

- attaching all repos does not scale
- change-scoped attachment matches user intent
- keeps the session focused

### 10. CLI Materialization Is Safer Than Agent-Only Cross-Repo Writing

Decision:

- prefer OpenSpec CLI materialization for the POC

Why:

- consistent across agents
- less sensitive to tool-specific multi-root write limitations
- still lets agents participate in planning and execution without overloading the initial scope

### 11. Reuse The Existing Methodology Schema

Decision:

- workspace changes keep using the existing methodology schema name, such as `spec-driven`
- topology is expressed through workspace/change metadata and command behavior
- any short-term internal shim should be treated as temporary implementation detail, not a user-visible schema split

Why:

- avoids maintaining a separate workspace schema
- preserves the long-term methodology model
- keeps the POC close to the eventual steady state

### 12. Reuse Change IDs Across Materialization

Decision:

- materialized repo-local changes reuse the workspace change ID by default

Why:

- the feature should keep one identity across planning and execution
- status roll-up and traceability are simpler
- target-specific IDs add noise without solving a current problem

### 13. Authority Transfers Per Target At Materialization

Decision:

- workspace-authored target drafts are authoritative until successful `apply --change <id> --repo <alias>`
- after that point, the repo-local change is the execution truth for that target

Why:

- gives the workflow a crisp handoff point
- avoids dual-authority ambiguity
- keeps sync-back optional rather than required

### 14. Manual Archive Defines Hard Done

Decision:

- a workspace change becomes soft-done when all known coordination and target tasks are complete
- a workspace change becomes fully done only when the user explicitly archives it

Why:

- archive should remain a deliberate lifecycle event
- users still need a visible “basically finished” state before manual cleanup
- different repos can complete on different cadences without collapsing the final archive step

### 15. Dedicated Workspaces Should Not Nest An `openspec/` Root

Decision:

- dedicated workspaces store visible planning artifacts at the workspace root
- workspace metadata lives under `.openspec/`
- target repos continue to use `openspec/`

Why:

- the workspace itself is already an OpenSpec home
- this avoids path confusion between `openspec/` and `.openspec/`
- it cleanly separates workspace conventions from project-repo conventions

## Alternatives Considered

### Feature-Scoped Workspace

Idea:

- create one workspace per feature like `add-3ds`

Why not chosen:

- feels disposable
- awkward for a project-board-like coordination home
- creates restart friction

### Separate `initiative` Primitive

Idea:

- introduce an explicit initiative-level object distinct from change

Why not chosen for the POC:

- added conceptual overhead
- user-facing primitive proliferation
- the POC can move forward with `change` as the main planning object

### Repo-Local-Only Planning

Idea:

- keep every task, delta, and plan inside each repo only

Why not chosen:

- fragmented planning surface
- poor UX for cross-repo reasoning
- loses the “everything in one place” benefit users want during planning

### Central-Only Forever

Idea:

- keep all tasks/deltas in workspace permanently and execute directly from there

Why not chosen:

- archive semantics become awkward
- canonical ownership becomes blurry
- repo-local execution reality still appears eventually

### Separate Coordination Schema Family

Idea:

- introduce a coordination-specific methodology family distinct from `spec-driven`

Why not chosen as the current direction:

- risks coupling topology to methodology
- leads toward a schema matrix
- better to keep methodology stable and handle topology separately

Note:

- the current `spec-driven` implementation may still require evolution
- rejecting a schema-family split does not mean rejecting implementation changes

### Commit Raw Absolute Paths In Shared Config

Idea:

- store `/Users/me/...` paths in workspace config

Why not chosen:

- breaks on other machines
- unsuitable for future sharing
- easy to avoid now

### Attach All Workspace Repos By Default

Idea:

- opening a workspace automatically attaches every registered repo

Why not chosen:

- does not scale
- creates noisy sessions
- change-scoped attachment is more intentional

## POC Requirements

The following requirements should be considered part of the POC contract unless explicitly revised later.

### Workspace Requirements

- There must be a managed workspace location.
- The POC should not require arbitrary user-chosen workspace paths as the default path.
- `workspace create` should reuse existing OpenSpec setup logic rather than inventing a parallel initialization system.
- Workspace should be a dedicated coordination root; it does not need an inner `openspec/` directory.
- Workspace metadata should live under `.openspec/`, with committed and local files side by side.

### Repo Registry Requirements

- Workspace must support explicit repo registration by alias.
- Repo registration must validate that the target repo exists and has `openspec/`.
- Repo aliases must be stably stored.
- Repo absolute paths must be stored in `.openspec/local.yaml` or equivalent gitignored local overlay.
- `workspace doctor` must verify repo resolution.

### Change Requirements

- A workspace change must declare explicit target repos.
- Unknown targets must fail fast.
- Targets should be user-authored for the POC.
- The agent may suggest targets but should not mutate them automatically.
- Workspace changes should reuse the same methodology schema names as single-repo changes.
- Materialized repo-local changes should reuse the workspace change ID by default.

### Planning Requirements

- The workspace must centralize proposal and design.
- The workspace must centralize coordination tasks.
- The workspace may centralize per-target tasks and per-target delta drafts.
- The workspace may hold draft shared-behavior notes where ownership is not yet clear.

### Execution Requirements

- Per-target tasks and deltas must be materializable into repo-local changes.
- Materialization should create repo-local execution bundles.
- After materialization, repo-local execution should proceed without requiring workspace to be the execution source of truth.
- Successful materialization must transfer authority for that target from workspace draft artifacts to the repo-local change.
- The materialization contract must eventually define overwrite and conflict behavior explicitly.

### Canonical Ownership Requirements

- Canonical specs must remain in owner repos.
- Shared draft behavior in workspace must not be mistaken for canonical ownership.

### Tooling Requirements

- The POC must define at least one agent/tool path that can honestly read targeted repos.
- The POC must distinguish planning-only mode from attached-roots mode.
- The POC should not market Copilot CLI as the primary clean demo path.

## Open Questions

These issues remain open after the latest review.

### 1. Is Materialization One-Way?

Open question:

- once a repo-local change diverges during execution, is there any sync-back to workspace?

Current lean:

- workspace is the planning truth until materialization
- repo-local change becomes execution truth after materialization

But the exact sync-back rules remain open.

### 2. What Is The Exact Materialization Contract?

Open question:

- does materialization create a repo-local change once and never touch it again?
- or can the workspace re-materialize if planning changes?
- if re-materialization is allowed, what gets overwritten and what is protected?
- how are conflicts reported?

### 3. How Should Workspace Status Roll Up Work?

Needed eventually:

- planning
- materialized
- in progress
- soft-done
- archived

Decided at the semantic level:

- soft-done means all known coordination and target tasks are complete
- archived means the user has manually archived the workspace change

Still not decided:

- exact storage location
- exact command output shape

### 4. Do Repo-Local Changes Need Reverse Links?

Open question:

- should a materialized repo-local change keep a backlink to the workspace change for status roll-up and traceability?

### 5. How Are Shared Drafts Promoted?

Open question:

- when shared cross-repo behavior starts in workspace draft form, what exact command or flow promotes it into a canonical owner repo?

### 6. Are Repo-Local Execution Artifacts Always Required?

The current lean is yes for execution and archive.

Still open:

- whether some future tools could execute directly from central artifacts without requiring a materialized local bundle

### 7. Should Workspace Support User-Chosen Paths Later?

The current POC direction favors a managed location.

User-chosen workspace paths are deferred.

### 8. Which Existing Exploration Docs Need To Be Marked Superseded?

The discussion strongly suggests that some feature-scoped coordination-workspace framing should be considered outdated.

Likely candidates:

- `openspec/explorations/workspace-user-journeys.md`
- parts of `openspec/explorations/workspace-ux-simplification.md`

## Implementation Phases

### Phase 1: Workspace Root and Repo Registry

- managed workspace root
- dedicated workspace layout without nested `openspec/`
- workspace create
- workspace add-repo
- workspace doctor
- `.openspec/workspace.yaml` + `.openspec/local.yaml`

### Phase 2: Target-Aware Workspace Changes

- workspace changes with explicit targets
- central proposal and design
- coordination tasks
- central per-target task/delta partitioning

### Phase 3: Materialization For Execution

- `apply --change --repo`
- create repo-local execution bundle
- reuse workspace change ID in the target repo
- begin normal repo-local implementation flow

### Later Phases

- status roll-up
- shared / team-committed workspace semantics
- stable remote project IDs
- possible workspace open helpers across more agent types
- better shared-contract promotion flow

## Worked Example: Add 3DS

### Context

Feature:

- add 3D Secure support for card payments

Repos:

- `web-client`
- `billing-service`
- `contracts`

Workspace:

- `client-dev-workspace`

Change:

- `add-3ds`

### Central Workspace Artifacts

```text
client-dev-workspace/
  .openspec/
    workspace.yaml
    local.yaml
  changes/
    add-3ds/
      .openspec.yaml
      proposal.md
      design.md
      tasks/
        coordination.md
      targets/
        contracts/
          tasks.md
          specs/
            payments/
              3ds-contract/
                spec.md
        billing-service/
          tasks.md
          specs/
            payments/
              authorization/
                spec.md
        web-client/
          tasks.md
          specs/
            checkout/
              card-payment/
                spec.md
      notes/
        3ds-draft-notes.md
```

What belongs here:

- Why 3DS is needed
- end-to-end design decisions
- rollout sequencing
- cross-repo risks and coordination tasks
- per-target planning artifacts
- temporary shared-behavior drafts

### Materialized Repo-Local Execution Bundle

If `web-client` is materialized:

```text
web-client/
  openspec/
    changes/
      add-3ds/
        .openspec.yaml
        tasks.md
        specs/
          checkout/
            card-payment/
              spec.md
```

If `billing-service` is materialized:

```text
billing-service/
  openspec/
    changes/
      add-3ds/
        .openspec.yaml
        tasks.md
        specs/
          payments/
            authorization/
              spec.md
```

### Canonical Shared Contract

The canonical 3DS contract belongs in the owner repo:

```text
contracts/
  openspec/
    specs/
      payments/
        3ds-contract/
          spec.md
```

If ownership is not yet known, the shared behavior can remain as:

```text
client-dev-workspace/changes/add-3ds/notes/3ds-draft-notes.md
```

until it is promoted into the correct owner repo.

## Appendix: Discussion Notes

The following tensions were central to the discussion and should be preserved for future readers.

### Tension 1: Centralized Planning vs Repo Ownership

Users want one place to plan.

Repos need to remain the owners of:

- code changes
- canonical specs
- archive
- execution truth

This tension directly produced the central-planning / local-materialization model.

### Tension 2: Should There Be An `initiative` Primitive?

The discussion pushed back on whether an initiative-level artifact was actually needed for the POC.

The outcome was:

- not required for the POC
- `change` remains the main planning primitive

### Tension 3: Should Repo-Local Changes Be The Primary Planning Surface?

Early discussion considered keeping planning distributed across repos.

This was rejected because it does not satisfy the “everything in one place during planning” goal.

### Tension 4: Should Coordination Mean A Separate Schema Family?

The discussion initially moved toward a special coordination schema.

It then stepped back and separated:

- methodology
- topology

The outcome was:

- do not split methodology families by topology
- accept that current implementation details may still need to change

### Tension 5: Should Workspace Hold Canonical Specs?

The answer remained no.

Workspace may hold:

- summaries
- drafts
- planning notes

But canonical specs remain repo-owned.

### Tension 6: Can Copilot Be The Main POC Demo Path?

The discussion found that Copilot CLI is weaker than Claude/Codex for this problem.

Outcome:

- do not make Copilot the primary POC story
