# Workspace User Journeys

## Purpose

This document describes the exact user experience for OpenSpec across:

1. Single-repo projects
2. Monorepos
3. Large monorepos that behave like many repos
4. True multi-repo initiatives

It is intentionally UX-first. The goal is to define:

- Where the user starts
- What commands they run
- What the agent sees
- Where artifacts are stored
- How OpenSpec decides which specs to read
- How OpenSpec behaves when roots are missing, ambiguous, or partially available

This is a proposed UX model, not an implementation spec.

---

## The Core Mental Model

Users should not need one mental model for repos and a separate mental model for monorepos.

OpenSpec should operate on **scopes**.

A scope is an owned planning and implementation boundary. Depending on the codebase, a scope may be:

- an entire repo
- a package or app inside a monorepo
- a service inside a monorepo
- a shared contracts area
- another explicitly owned domain

The user experience should be:

- Pick the thing you want to change
- Confirm which scopes are involved
- OpenSpec reads only the relevant specs
- OpenSpec stores each artifact in the owning place
- If the work spans multiple owning places, OpenSpec creates a neutral coordination workspace

### Durable Objects

There are three different durable objects:

1. **Spec**
   A canonical behavior contract. Always stored in the owning scope.

2. **Change**
   A repo-local or scope-local planning artifact. Stored with the owner of the implementation/spec delta.

3. **Initiative**
   A cross-scope coordination artifact. Only needed when work spans multiple owning roots. Stored in a neutral coordination workspace.

The key rule is:

> Canonical specs never move into the coordination workspace.

The workspace coordinates. Owner roots remain canonical.

### Cross-Boundary Specs

Some behaviors are true across multiple scopes, apps, or repos:

- checkout behavior shared by web, iOS, Android, and backend
- auth/session rules shared by app clients and API services
- billing rules shared by invoices, payments, and reporting
- privacy or audit guarantees shared across many systems

These are not just "references between local specs." They are first-class shared contracts.

OpenSpec should model them explicitly as:

1. **Canonical shared contract**
   A spec that defines what must be true across boundaries.

2. **Local implementation specs**
   Per-scope specs describing how each owner satisfies that contract locally.

3. **Initiative**
   A change or project to update the contract and its implementations together.

The first-principles rule is:

> A cross-boundary spec may have many consumers, but it must still have one canonical owner.

If there is no owner yet, the shared behavior can live temporarily as an initiative note during exploration, but OpenSpec should not promote it into a canonical spec until ownership is explicit.

---

## UX Principles

### 1. Same top-level workflow everywhere

Users should still recognize the existing OpenSpec workflow:

- `openspec init`
- `openspec update`
- `/opsx:explore`
- `/opsx:propose`
- `/opsx:apply`
- `/opsx:archive`

The new behavior is that OpenSpec may ask:

- "Which scope does this affect?"
- "Does this span multiple owning roots?"
- "Should I create a coordination workspace?"

### 2. No required upfront workspace registration

Users should not have to pre-register all repos or modules just in case.

OpenSpec should support:

- ad hoc discovery
- one-time local linking
- optional saved workspaces later

### 3. Cross-root planning must have a neutral home

If a change spans multiple repos, the planning artifact should not be forced into one repo.

Instead, OpenSpec should create a neutral coordination workspace for the initiative.

### 4. Canonical storage follows ownership

- Shared contract spec lives in the contract-owning scope
- Web-specific spec lives in the web-owning scope
- iOS-specific spec lives in the iOS-owning scope
- Repo-local code tasks live in the repo-local change

### 5. References are informational

Cross-scope or cross-repo `references` should initially be documentation-only.

OpenSpec may surface them to users and agents, but should not require them to resolve or validate across roots in the first version.

### 6. Shared contracts need explicit ownership

When the user describes behavior that spans multiple boundaries, OpenSpec should help them decide whether they are creating:

- a local spec
- a shared contract
- an initiative note that is not yet canonical

If the work is a real long-lived contract, OpenSpec should prompt for a canonical owner rather than burying it in whichever repo the user happened to be standing in.

### 7. Do not force "shared ownership" as implicit co-ownership

OpenSpec should help teams create **shared contract ownership**, not ambiguous co-ownership.

That means:

- one scope or repo owns the canonical shared contract
- other scopes consume and reference it
- coordination workspace can summarize it
- ownership and review routes stay legible

### 8. Use the current repo only as a starting point, not as truth

When a user starts in `web-client` and describes a checkout behavior spanning web, iOS, Android, and backend, OpenSpec should treat the current cwd as a clue about likely consumers, not as proof that `web-client` should own the shared contract.

---

## Terms

### Project

A single OpenSpec root where canonical specs and changes can live.

In practice a project may be:

- a repo root with `openspec/`
- a monorepo root with one `openspec/`
- a nested owned scope if OpenSpec later supports nested roots

### Scope

A logical boundary inside or across projects. Scopes are what users pick during planning.

Examples:

- `repo`
- `contracts/checkout`
- `apps/web`
- `services/billing`
- `mobile/ios`

### Coordination Workspace

A neutral directory used only for cross-root coordination. It stores initiative-level planning data and agent workspace instructions.

Example:

```text
~/work/openspec-workspaces/add-3ds/
  .openspec-workspace/
    workspace.yaml
    initiative.md
    links.yaml
    agents/
      claude.md
      codex.md
```

This coordination workspace may exist in two modes:

1. **Personal coordination workspace**
   A local directory used by one person for ad hoc or exploratory cross-root planning.

2. **Shared coordination workspace**
   A committed coordination repo or shared workspace used by a team or multiple teams.

The UX should support both without changing the core mental model.

### Owning Root

The repo or scope that canonically owns a spec, codebase area, or repo-local change.

### Shared Contract Owner

The scope or repo that canonically owns a cross-boundary spec.

This may be:

- an existing shared contracts area inside a monorepo
- an existing backend/API contract owner
- a dedicated contracts repo
- a new shared scope created as part of the planning flow

This should not be an accidental consequence of where the user started the agent.

---

## Recommended File Shapes

### Single repo

```text
repo/
  openspec/
    specs/
    changes/
    config.yaml
```

### Monorepo

```text
monorepo/
  openspec/
    specs/
    changes/
    config.yaml
  apps/
    web/
    admin/
  services/
    billing/
  packages/
    contracts/
```

Optional scope markers:

```text
monorepo/
  apps/web/openspec.scope.yaml
  services/billing/openspec.scope.yaml
  packages/contracts/openspec.scope.yaml
```

### Multi-repo with coordination workspace

```text
~/work/
  contracts/
    openspec/
  web-client/
    openspec/
  ios-client/
    openspec/
  openspec-workspaces/
    add-3ds/
      .openspec-workspace/
        workspace.yaml
        initiative.md
        links.yaml
        agents/
          claude.md
          codex.md
```

---

## Discovery Model

OpenSpec needs to answer two separate questions:

1. What scopes are involved?
2. Where are they on disk right now?

These are not the same problem.

### Scope discovery

OpenSpec discovers candidate scopes from:

- the current repo root
- `openspec/specs/**`
- optional scope marker files
- previous initiative metadata
- explicit user selection

### Root resolution

For multi-repo work, durable identifiers should not be raw paths.

Stable project identifiers should look like:

- `github.com/Fission-AI/web-client`
- `github.com/Fission-AI/contracts`

User shorthand may be accepted:

- `Fission-AI/web-client`
- `fission/web-client`

OpenSpec resolves these to local paths using this order:

1. explicit path passed for this run
2. saved local OpenSpec registry
3. local git remote scanning
4. user prompt

Relative paths like `../web-client` may be used as temporary hints for a single run, but should not be the durable identifier.

### Shared manifest vs local overlay

For team use, OpenSpec should separate:

1. **Shared coordination state**
   Stable information that can be committed and shared with teammates.

2. **Local resolution state**
   Machine-specific path mappings and local availability.

#### Shared coordination state should include

- initiative ID and summary
- stable project identifiers
- selected scopes
- linked repo-local change IDs
- ownership metadata
- rollout or sequencing notes
- unresolved-but-known participating projects

#### Local resolution state should include

- local filesystem paths for project identifiers
- local repo availability
- local preferred clone among multiple matches
- machine-specific agent attachment hints

This separation is critical for a cohesive team story.

Without it, coordination workspaces become either:

- too local to share, or
- polluted with machine-specific paths that break for teammates

---

## Team Collaboration Model

This section describes how the same UX should scale from one person to a large org.

### Smallest unit: one user, one machine

The user may create a local coordination workspace and keep everything local.

This is fine for:

- one-off cross-repo exploration
- private planning before sharing
- trying out a multi-repo idea

### Team unit: shared initiative

Once cross-repo work becomes collaborative, the coordination workspace should be shareable and committed.

That means:

- initiative metadata is committed
- ownership decisions are committed
- linked changes are committed
- local paths are not committed

### Cross-team unit: sponsored initiative

When work spans teams, the initiative needs a clear coordination owner even if specs and code remain distributed.

This is not the same as canonical spec ownership.

There are now two distinct responsibilities:

1. **Shared contract owner**
   Owns the canonical cross-boundary spec.

2. **Initiative sponsor/driver**
   Owns the coordination process for the current change.

These may be the same team, but they do not have to be.

Examples:

- Platform team sponsors rollout, auth team owns canonical auth contract
- Payments team sponsors initiative, contracts repo owns canonical checkout contract
- Mobile platform team sponsors app-wide migration, backend team owns API contract

### What we should tell teams

OpenSpec should communicate this clearly:

> If the work is collaborative, treat the coordination workspace as a lightweight shared planning repo or committed workspace. Commit stable initiative metadata there, and keep machine-specific repo path mappings local.

This gives a clean answer to:

- how do we share the cross-repo plan?
- how do teammates open the same initiative?
- how do people with different local clone layouts work on the same initiative?

---

## Ownership Decision Model

This section answers a key product question:

> How should a team or agent decide where a shared cross-boundary spec belongs?

### First-principles heuristic

OpenSpec should help teams choose the owner that can most credibly do all of the following:

1. define the guarantee
2. review and approve changes to that guarantee
3. communicate the guarantee to consumers
4. absorb the coordination cost when the guarantee changes

The owner is not necessarily:

- the team that started the change
- the frontend team
- the backend team
- the repo with the most code

The owner is the boundary where the contract is most stable and most authoritative.

### Ownership decision questions

When OpenSpec detects a likely shared contract, it should ask or infer from these questions:

1. Is this behavior meant to be true across multiple scopes for the long term?
2. Is it an external contract, an internal product rule, or an implementation detail?
3. Which team or scope can approve changes to this contract?
4. Which owner would consumers naturally look to as the source of truth?
5. Does a shared contract area already exist?
6. Will this contract likely outlive the current initiative?

### Recommended outcomes

#### Outcome A: Existing owner already exists

Example:

- `packages/contracts/checkout` already exists in a monorepo
- `contracts` repo already exists in multi-repo environment

OpenSpec should default to that existing owner.

#### Outcome B: Shared contract belongs in an existing domain owner

Example:

- an API request/response contract belongs with the API/backend owner
- a shared auth token contract belongs with the auth platform owner

OpenSpec should suggest that existing domain owner if there is no dedicated shared area.

#### Outcome C: A new shared contract scope should be created

Example:

- checkout behavior is shared across several clients and services
- no existing shared owner exists
- this will likely recur and needs long-term governance

OpenSpec should help create a new shared contract scope.

#### Outcome D: Keep it as initiative-only for now

Example:

- the team is still exploring
- the boundary is unclear
- no one can yet answer who should own the canonical guarantee

OpenSpec should allow the behavior to remain in initiative notes temporarily and explicitly mark it as non-canonical until ownership is chosen.

### What OpenSpec should suggest by default

#### For monorepos

Default suggestion order:

1. existing shared contract scope inside the monorepo
2. existing domain/platform owner
3. create a new shared scope inside the monorepo
4. keep as initiative-only until clarified

#### For multi-repo environments

Default suggestion order:

1. existing contracts/shared-specs repo
2. existing domain/platform repo that already owns the stable contract
3. create a dedicated shared contracts repo or scope
4. keep as initiative-only until clarified

### What OpenSpec should not do

OpenSpec should not:

- silently assign ownership to the repo where the user started
- duplicate the canonical shared spec across all consumers
- call something canonical when no owner was chosen
- force teams into a central admin setup before they can plan

---

## Shared Contract Creation UX

When the user describes a likely cross-boundary behavior, OpenSpec should treat this as a first-class planning moment.

### Detection cues

Signals that a shared contract may be needed:

- request mentions multiple platforms or repos
- request mentions "shared", "common", "contract", "same behavior", "consistent across"
- selected scopes include clients plus backend
- no existing spec cleanly owns the described behavior

### Prompt shape

During `/opsx:propose` or `/opsx:explore`, OpenSpec should ask something like:

```text
This looks like behavior shared across multiple scopes:
- web
- iOS
- Android
- backend

What kind of artifact is this?
- A local change within one scope
- A shared contract that multiple scopes must follow
- An initiative note for now; ownership is not clear yet
```

If the user chooses shared contract:

```text
Where should the canonical shared contract live?
- Existing shared contracts scope
- Existing domain owner
- Create a new shared contract scope
- Decide later and keep this initiative-only for now
```

### Creating a new shared contract scope

If the user chooses "create a new shared contract scope," OpenSpec should guide them.

#### Monorepo

Prompt feel:

```text
Suggested new shared scopes:
- openspec/specs/contracts/checkout
- openspec/specs/shared/checkout
- packages/contracts/checkout

Who should own review for this contract?
```

OpenSpec then:

1. creates the canonical shared spec in the chosen shared scope
2. records selected consumers
3. generates local references in consumer changes/specs if appropriate

#### Multi-repo

Prompt feel:

```text
No shared contract owner exists yet.

Choose where the canonical contract should live:
- Create it in an existing contracts repo
- Create a new shared contracts repo later; keep initiative-only for now
- Assign it to an existing domain owner repo
```

OpenSpec should avoid auto-creating a brand-new repo. It can scaffold the plan and record the decision, but repo creation may be organizationally sensitive and usually belongs outside the CLI.

### Temporary initiative-only mode

If ownership is unclear, OpenSpec should support:

- storing the shared behavior in the initiative workspace as a draft note
- marking it explicitly as non-canonical
- reminding users to promote it into a canonical shared contract before long-term adoption

This is important because many teams discover the need for a shared contract while exploring, before they know how to govern it.

---

## Cohesive UX Across Team Size

The product should feel like one system, not three separate features.

### The invariant workflow

No matter the setting, the user experience should always reduce to this:

1. Start where you are
2. Describe the work
3. Confirm the affected scopes
4. Let OpenSpec determine whether this is:
   - local only
   - multi-scope in one root
   - cross-root coordination
5. OpenSpec creates artifacts in the right places
6. OpenSpec tells the user where to continue planning and where to implement

### What changes by scale

#### Solo / single repo

- entry point: repo root
- shareability: not relevant
- local-only storage is fine

#### Solo / ad hoc multi-repo

- entry point: local coordination workspace
- shareability: optional
- local path mappings are sufficient

#### Team / collaborative multi-repo

- entry point: shared coordination repo/workspace
- shareability: required
- stable manifest committed, local paths private

#### Large org / cross-team initiative

- entry point: shared coordination repo/workspace
- sponsor/driver is explicit
- shared contract ownership is explicit
- some participating teams may only resolve a subset of roots locally

### What should remain consistent

These things should not change with org size:

- canonical specs live with owners
- local code changes live with owners
- shared contracts need one canonical owner
- coordination data is not the canonical spec source
- local machine paths are never the durable identifier
- implementation may still happen root-by-root even if planning is coordinated

If these invariants hold, the UX remains coherent across solo, team, and org-wide usage.

---

## Agent Access Model

Cross-root UX only works if the agent can actually see the relevant roots.

OpenSpec should support three agent capability levels.

### Level 1: Strong multi-root support

The tool can explicitly attach multiple directories to one session.

Desired UX:

- User opens the coordination workspace
- OpenSpec tells the user exactly which roots to attach
- Agent reads from all attached roots

### Level 2: Single cwd but filesystem access to linked roots

The tool runs from one working directory but can still read sibling absolute paths if the environment permits it.

Desired UX:

- User opens the coordination workspace
- OpenSpec writes agent-readable absolute paths into the workspace instructions
- Agent can read those roots directly

### Level 3: Practically single-root

The tool can only reliably operate within one repo at a time.

Desired UX:

- Coordination workspace is used for planning only
- OpenSpec guides the user into repo-local implementation sessions afterward
- `/opsx:apply` runs in each repo separately

This must be treated as a first-class case, not a fallback afterthought.

---

## Current OpenSpec Flow To Preserve

Today the flow is:

1. User enters a repo
2. User runs `openspec init`
3. User opens an agent in that repo
4. User runs `/opsx:explore` or `/opsx:propose`
5. OpenSpec stores changes in `openspec/changes/<change>/`
6. `/opsx:apply` implements within that repo

That should remain the exact feel for single-repo work.

The only extension is:

- if OpenSpec detects a cross-root initiative, it explicitly upgrades the workflow into a coordination workspace flow

---

## Journey 1: Single Repo, Standard OpenSpec Project

### Starting state

The user has one repo:

```text
~/work/acme-app/
```

They enter the repo:

```bash
cd ~/work/acme-app
```

They initialize OpenSpec:

```bash
openspec init
```

OpenSpec creates:

```text
openspec/
  specs/
  changes/
  config.yaml
```

They open Claude, Codex, Cursor, or another agent inside this repo.

### Planning

The user types:

```text
/opsx:propose add-dark-mode
```

OpenSpec should:

1. detect a single local project
2. detect a single default scope: the repo
3. create one repo-local change
4. read only local project config and local specs
5. generate local planning artifacts

Output feel:

```text
Created openspec/changes/add-dark-mode/
Using scope: repo

Generated:
- proposal.md
- specs/ui/spec.md
- design.md
- tasks.md

Ready for implementation with /opsx:apply
```

### Implementation

The user types:

```text
/opsx:apply
```

OpenSpec reads:

- proposal
- specs
- design
- tasks

Only from this repo.

### Archival

The user types:

```text
/opsx:archive
```

OpenSpec archives the change in this repo, as today.

### Storage outcome

- Spec deltas stored in this repo
- Canonical specs stored in this repo
- Tasks and design stored in this repo
- No workspace concept surfaced

### Edge cases

- Multiple active changes in repo: prompt user to select one
- Missing spec directories: proceed if allowed by current schema behavior
- User runs from subdirectory: OpenSpec should either walk up or clearly tell them to run from repo root

---

## Journey 2: Monorepo, Small Team, One Obvious Scope

### Starting state

The user has:

```text
~/work/platform/
```

Inside:

```text
platform/
  openspec/
  apps/web/
  services/api/
  packages/ui/
```

The user enters the monorepo root and runs their agent there.

### Planning

The user types:

```text
/opsx:propose add-invoice-filtering
```

OpenSpec detects this is still one project root, but there are multiple candidate scopes.

If the user’s request clearly mentions one area, OpenSpec may infer:

- `apps/web`

Otherwise it asks:

```text
Which scope does this change affect?
- apps/web
- services/api
- packages/ui
- shared/contracts
```

The user picks `apps/web`.

### Expected behavior

OpenSpec should:

1. create a single monorepo-local change under `openspec/changes/add-invoice-filtering/`
2. tag that change with `apps/web`
3. read specs relevant to `apps/web`
4. avoid pulling unrelated monorepo areas into context

### Storage outcome

- One change in monorepo root
- Scope selection recorded in change metadata
- Delta specs only generated for the selected area

### Why this matters

The user should not feel like they are using a different product because they happen to be in a monorepo.

---

## Journey 3: Monorepo, Cross-Scope Change

### Starting state

Same monorepo:

```text
platform/
  openspec/
  apps/web/
  services/api/
  packages/contracts/
```

### Planning

The user types:

```text
/opsx:propose add-3ds-checkout
```

OpenSpec detects likely affected scopes:

- `packages/contracts`
- `services/api`
- `apps/web`

It asks:

```text
This appears to affect multiple scopes.
Which scopes should be included?
[x] packages/contracts
[x] services/api
[x] apps/web
[ ] apps/admin
[ ] packages/ui
```

### Expected behavior

OpenSpec creates:

```text
platform/openspec/changes/add-3ds-checkout/
```

The change includes scope metadata listing all three selected scopes.

OpenSpec reads:

- shared contract specs
- API specs for billing/checkout
- web checkout specs

OpenSpec ignores unrelated specs by default.

### Implementation

The user runs:

```text
/opsx:apply
```

OpenSpec should:

1. show that multiple scopes are affected
2. sequence tasks accordingly
3. update one shared task artifact if the monorepo is still treated as one owning root

### Storage outcome

- One change at monorepo root
- Delta specs for multiple scope paths
- All canonical specs remain inside the monorepo

### Important note

This is still not a coordination workspace case, because there is still one owning project root.

---

## Journey 4: Large Monorepo That Behaves Like Many Repos

### Why this journey exists

Some monorepos are operationally equivalent to multi-repo systems:

- different teams own different areas
- different release cadences
- many developers should not edit each other’s planning setup
- cross-team work is exceptional

This means OpenSpec cannot assume:

- one monorepo root automatically equals one planning unit

### Starting state

```text
platform/
  openspec/
  apps/web/
  apps/mobile/
  services/billing/
  services/orders/
  packages/contracts/
```

Optional scope markers exist:

```text
apps/web/openspec.scope.yaml
apps/mobile/openspec.scope.yaml
services/billing/openspec.scope.yaml
packages/contracts/openspec.scope.yaml
```

### Planning a local team change

The web team enters the monorepo root, or a repo-aware subtool enters the web area.

The user types:

```text
/opsx:propose add-checkout-loading-state
```

OpenSpec detects this is limited to `apps/web`.

The user should experience this exactly like a single-scope change.

### Planning a cross-team monorepo initiative

The user types:

```text
/opsx:propose add-3ds
```

OpenSpec detects:

- `packages/contracts`
- `services/billing`
- `apps/web`
- possibly `apps/mobile`

At this point OpenSpec must make a product decision.

#### Recommended behavior

If all affected scopes live under one owning root and the user is comfortable with one monorepo-local change, keep using one root-level change.

If the monorepo is configured or inferred to behave like many owned sub-projects, offer to upgrade to a **coordination-style monorepo initiative**.

Prompt feel:

```text
This monorepo has multiple independently owned scopes.

How would you like to plan this work?
- One monorepo change
- Coordination initiative with linked scope changes
```

### Coordination-style monorepo initiative

If the user chooses the coordination flow, OpenSpec creates:

1. a neutral initiative workspace
2. linked scope-local changes inside the monorepo root or scope-owned folders

This is the same conceptual flow as multi-repo, but all roots happen to be inside one VCS root.

### Why this matters

This prevents the UX from hardcoding "monorepo is always simpler."

That assumption fails for exactly the enterprise-style teams this feature is for.

---

## Journey 5: Multi-Repo Work Started From Inside One Repo

### Starting state

The user is in:

```text
~/work/web-client
```

They already use OpenSpec there.

They open Claude in `web-client` and type:

```text
/opsx:propose add-3ds
```

During exploration or proposal generation, it becomes clear that the work also affects:

- `contracts`
- `billing-service`
- `ios-client`

### Critical UX requirement

At this point OpenSpec should not silently create one cross-repo change inside `web-client`.

That would be misleading, because:

- the initiative is not owned by `web-client`
- the agent does not yet have the other roots
- canonical specs belong in other repos

### Expected OpenSpec behavior

OpenSpec interrupts the default single-repo flow and says:

```text
This work spans multiple owning roots:
- github.com/Fission-AI/contracts
- github.com/Fission-AI/billing-service
- github.com/Fission-AI/web-client
- github.com/Fission-AI/ios-client

For cross-repo work, OpenSpec recommends creating a coordination workspace.

Suggested location:
~/work/openspec-workspaces/add-3ds

Create it now?
```

If the user agrees, OpenSpec creates the workspace.

If the user wants another location, they can choose it.

### Coordination workspace creation

Proposed CLI feel:

```bash
openspec workspace create add-3ds --at ~/work/openspec-workspaces/add-3ds
```

OpenSpec writes:

```text
~/work/openspec-workspaces/add-3ds/
  .openspec-workspace/
    workspace.yaml
    initiative.md
    links.yaml
    agents/
      claude.md
      codex.md
```

### Repo resolution

OpenSpec now resolves local paths for:

- `github.com/Fission-AI/contracts`
- `github.com/Fission-AI/billing-service`
- `github.com/Fission-AI/web-client`
- `github.com/Fission-AI/ios-client`

Using:

1. known local registry
2. git remote scanning
3. user confirmation if needed

### Agent handoff

OpenSpec then tells the user:

```text
Next step:
1. Open your coding agent in ~/work/openspec-workspaces/add-3ds
2. Attach these roots if your tool supports multi-root:
   - /Users/me/work/contracts
   - /Users/me/work/billing-service
   - /Users/me/work/web-client
   - /Users/me/work/ios-client

OpenSpec has generated workspace instructions at:
.openspec-workspace/agents/claude.md
```

### Planning from the workspace

The user now starts the agent in the coordination workspace and runs:

```text
/opsx:propose add-3ds
```

Or OpenSpec may have already scaffolded the initiative and tell the agent to continue it.

### Storage outcome

The coordination workspace stores the **initiative-level planning object**:

- proposal.md
- design.md
- initiative summary
- cross-repo scope map
- ownership, milestones, risks, and dependencies
- links to repo-local changes
- agent workspace instructions

Each repo stores its own execution change:

- `contracts/openspec/changes/add-3ds-contract/`
- `billing-service/openspec/changes/add-3ds-billing/`
- `web-client/openspec/changes/add-3ds-web/`
- `ios-client/openspec/changes/add-3ds-ios/`

Those repo-local changes are where repo-specific tasks, delta specs, and local implementation state live.

### Why this matters

This gives the user a truthful answer to:

- Where should I stand?
- Where does the change live?
- How does the agent see the other repos?

The answer is:

- stand in the coordination workspace for cross-repo planning
- keep canonical changes/specs in their owners

---

## Journey 6: Multi-Repo Work Started From a Neutral Place

### Starting state

The user already knows the work is cross-repo.

They start in a neutral directory:

```bash
cd ~/work
```

They run:

```bash
openspec workspace create add-3ds --at ~/work/openspec-workspaces/add-3ds
```

Or a future higher-level shortcut:

```bash
openspec initiative new add-3ds
```

### OpenSpec prompts

OpenSpec asks:

```text
Which repos or scopes are involved?
```

The user enters:

- `github.com/Fission-AI/contracts`
- `github.com/Fission-AI/billing-service`
- `github.com/Fission-AI/web-client`
- `github.com/Fission-AI/ios-client`

OpenSpec resolves local clones and writes the workspace files.

### Agent setup

The user opens the coordination workspace in their agent.

OpenSpec-generated agent instructions contain:

- initiative summary
- available roots
- ownership map
- guidance that canonical spec edits must be written back to owning roots

### Planning behavior

When the user runs:

```text
/opsx:explore
```

or

```text
/opsx:propose add-3ds
```

the agent reads:

- workspace initiative metadata
- relevant specs from attached roots
- only for selected repos/scopes

### Storage outcome

Same as Journey 5, but the user never had to start from one repo first.

### Why this journey matters

Some users will intentionally want the initiative to live outside any single repo from the start.

OpenSpec should support that directly.

---

## Journey 6A: Team-Shared Multi-Repo Initiative

### Starting state

A team knows the work spans multiple repos and will involve multiple people over several days or weeks.

They create or choose a shared coordination repo, for example:

```text
~/work/openspec-initiatives/
```

Or a team-owned repo such as:

```text
github.com/Fission-AI/initiatives
```

Inside it, OpenSpec creates:

```text
initiatives/
  add-3ds/
    .openspec-workspace/
      workspace.yaml
      initiative.md
      links.yaml
      agents/
        claude.md
        codex.md
```

### What gets committed

The team commits:

- initiative summary
- stable project IDs
- selected scopes
- ownership decisions
- linked repo-local change IDs
- rollout and status notes

### What stays local

Each teammate keeps local path mappings outside the shared repo, for example in OpenSpec local config/data:

- `github.com/Fission-AI/contracts` -> `/Users/alice/src/contracts`
- `github.com/Fission-AI/contracts` -> `/home/bob/work/contracts`

### Teammate workflow

Each teammate:

1. clones or pulls the shared coordination repo
2. runs something like `openspec workspace doctor` or `openspec workspace sync`
3. resolves any missing project IDs to local clones
4. opens their agent from the shared coordination workspace

### Agent startup behavior

OpenSpec generates agent instructions using:

- committed shared manifest
- local path overlay

This means every teammate sees the same initiative structure, but with their own valid filesystem paths.

### Why this matters

This is the team-scale version of "enter the coordination workspace."

Without this distinction, the phrase sounds cohesive for one person but falls apart for shared planning.

---

## Journey 6B: Cross-Team Initiative With Explicit Sponsor

### Starting state

The work spans:

- platform/shared contracts
- backend services
- multiple clients
- multiple teams

### Expected setup

OpenSpec should support the initiative being created in a shared coordination repo owned by the sponsoring or driving team.

That sponsor is responsible for:

- opening the initiative
- linking participating projects
- tracking initiative status
- keeping ownership decisions visible

But the sponsor does not automatically own:

- all specs
- all implementation changes
- the canonical shared contract

### Example

- Payments team sponsors `add-3ds`
- Contracts repo owns canonical checkout contract
- Web team owns web implementation change
- iOS team owns iOS implementation change
- Billing team owns backend implementation change

### User experience

When another team member opens the shared coordination workspace, OpenSpec should make this explicit:

```text
Initiative sponsor:
- payments-platform

Canonical shared contract owner:
- contracts

Participating owners:
- billing-service
- web-client
- ios-client
```

### Why this matters

Without this, "shared ownership" becomes ambiguous and teams do not know whether they are reading:

- a sponsor-owned plan
- a canonical contract
- or just another team’s local interpretation

---

## Journey 7: Multi-Repo Planning When Only Some Repos Are Cloned

### Starting state

The user wants to plan work affecting:

- contracts
- billing-service
- web-client
- ios-client

But only has these locally:

- contracts
- web-client

### Expected behavior

OpenSpec should still allow planning.

It creates the coordination workspace and records:

- resolved roots for `contracts` and `web-client`
- unresolved status for `billing-service` and `ios-client`

Prompt feel:

```text
Resolved locally:
- contracts
- web-client

Not currently available locally:
- billing-service
- ios-client

Planning can continue with partial context.
Implementation in unresolved roots will remain pending until linked.
```

### Agent behavior

The agent should:

- use resolved repos for concrete planning
- mention unresolved repos explicitly
- avoid pretending it read their specs
- generate pending placeholders in initiative tracking if needed

### Storage outcome

The coordination workspace may contain unresolved links such as:

```yaml
projects:
  - id: github.com/Fission-AI/contracts
    path: /Users/me/work/contracts
    status: resolved
  - id: github.com/Fission-AI/billing-service
    status: unresolved
  - id: github.com/Fission-AI/web-client
    path: /Users/me/work/web-client
    status: resolved
  - id: github.com/Fission-AI/ios-client
    status: unresolved
```

### Why this matters

This keeps planning useful even when the environment is incomplete.

Blocking planning here would make the feature brittle.

This also matters for large teams, because not every teammate will have every participating repo cloned or accessible.

---

## Journey 8: How Specs Are Read During Planning

This is one of the most important behavioral rules.

OpenSpec should never blindly read all specs from all roots.

### Single repo

Read:

- local project config
- local specs relevant to the selected scope
- local change history only if helpful

Do not read:

- unrelated local specs by default

### Monorepo

Read:

- root project config
- specs for the selected scopes
- shared contract specs if selected or referenced

Do not read:

- unrelated apps/services/packages

### Multi-repo

Read:

- initiative metadata from coordination workspace
- specs in resolved attached roots
- only the selected scopes within those roots
- informational references if the user or agent explicitly chooses to open them

Do not read:

- specs from unresolved roots
- every spec in every repo
- referenced specs automatically if that would explode context

### Informational references

References should appear like:

```text
Related references:
- github.com/Fission-AI/contracts: openspec/specs/checkout/spec.md
- github.com/Fission-AI/web-client: openspec/specs/checkout/web/spec.md
```

The agent can use them as navigation hints.

They are not validation blockers.

### Shared contract read order

When a selected change involves a shared contract, OpenSpec should prefer this read order:

1. initiative metadata, if present
2. canonical shared contract
3. selected consumer/local specs
4. repo-local change artifacts

This matters because the shared contract defines the boundary-level truths, while local specs describe how each consumer satisfies them.

---

## Journey 9: How Artifacts Are Stored

This must stay simple and deterministic.

### Rule 1: Canonical specs live with owners

Examples:

- Checkout contract spec lives in `contracts`
- Web checkout behavior lives in `web-client`
- iOS behavior lives in `ios-client`

### Rule 2: Repo-local changes live with repo owners

Examples:

- `contracts/openspec/changes/add-3ds-contract/`
- `web-client/openspec/changes/add-3ds-web/`

These changes are the execution artifacts for each owning repo. They should carry repo-specific tasks, delta specs, and local implementation state.

### Rule 3: Initiative-level planning lives in the coordination workspace

Examples:

- proposal.md
- design.md
- initiative summary
- rollout sequencing
- cross-repo assumptions
- ownership, milestones, risks, and dependencies
- links between repo-local changes

### Rule 4: Workspace never becomes canonical spec storage

The coordination workspace may reference specs and summarize them.

It should not become a second spec source of truth.

### Rule 5: Shared contracts are canonical only after ownership is explicit

If a cross-boundary behavior has not yet been assigned a canonical owner, OpenSpec should store it as initiative-level draft material rather than pretending it is already a canonical spec.

### Rule 6: Shared coordination workspaces store stable collaboration data, not local machine state

If a coordination workspace is committed for team use, it should contain:

- stable project IDs
- linked changes
- ownership and initiative metadata

It should not contain:

- `/Users/...` paths
- `C:\\...` paths
- machine-specific attached-root state

That information belongs in local overlay data.

---

## Journey 10: `/opsx:apply` In Cross-Root Work

Implementation UX must remain honest about tool limits.

### Case A: Agent can work across roots

The user is in the coordination workspace.

They run:

```text
/opsx:apply
```

OpenSpec responds:

```text
This initiative has linked changes in:
- contracts
- billing-service
- web-client
- ios-client

Choose apply mode:
- Apply one linked change
- Apply in suggested sequence
```

Recommended default:

- apply one linked change at a time

This keeps task state and implementation context manageable.

### Case B: Agent is practically single-root

The user is in the coordination workspace and runs:

```text
/opsx:apply
```

OpenSpec should say:

```text
This initiative spans multiple repos.
Implementation must be run per repo in your current tool.

Next suggested step:
- open /Users/me/work/contracts and run /opsx:apply add-3ds-contract
```

### Why this matters

Cross-repo planning and cross-repo implementation are not the same capability.

The UX must not assume all agents can do both well.

---

## Journey 10A: Creating A Shared Contract In A Monorepo

### Starting state

The user is in a monorepo with:

```text
platform/
  openspec/
  apps/web/
  apps/ios/
  apps/android/
  services/billing/
```

There is no existing canonical `checkout` shared contract.

### User request

The user types:

```text
/opsx:propose add-3ds-checkout
```

The agent discovers the request spans:

- web
- iOS
- Android
- billing backend

### Expected prompt

```text
This looks like a cross-boundary behavior shared by multiple scopes.

Should OpenSpec treat this as:
- A shared contract
- Independent local changes only
- An initiative note for now
```

The user chooses shared contract.

OpenSpec then asks:

```text
Where should the canonical shared contract live?
- openspec/specs/contracts/checkout
- openspec/specs/shared/checkout
- keep it initiative-only for now
```

### Expected storage result

OpenSpec creates:

- canonical shared contract in chosen shared scope
- repo-local change under monorepo root
- local delta specs for selected consumer scopes as needed

### Why this matters

This keeps one source of truth for the cross-boundary behavior, instead of smearing the same logic across web, iOS, Android, and backend specs.

---

## Journey 10B: Creating A Shared Contract In A Multi-Repo Environment

### Starting state

The user is planning a checkout initiative involving:

- `contracts`
- `web-client`
- `ios-client`
- `android-client`
- `billing-service`

There is no existing shared checkout contract.

### Planning flow

The user creates or enters a coordination workspace.

They run:

```text
/opsx:propose add-3ds
```

OpenSpec detects this likely requires a shared contract.

### Expected prompt

```text
No canonical shared contract owner was found for this behavior.

Choose how to proceed:
- Create the canonical contract in an existing contracts repo
- Assign the contract to an existing domain owner repo
- Keep it as initiative-only for now
```

If the user selects an existing contracts repo, OpenSpec:

1. creates a repo-local change in that repo for the shared contract
2. links consumer repo changes to it
3. records references from consumers to the canonical contract

If the user keeps it initiative-only, OpenSpec:

1. stores the draft cross-boundary behavior in initiative notes
2. marks it as non-canonical
3. warns that long-term consumer behavior should not depend on this until promoted into an owned shared contract

### Why this matters

This avoids a bad default where whichever app team starts the change accidentally becomes the long-term owner of a cross-org contract.

---

## Journey 11: Archiving Cross-Root Work

### Single repo or simple monorepo

Same as today:

```text
/opsx:archive
```

### Multi-repo initiative

The user in the coordination workspace runs:

```text
/opsx:archive
```

OpenSpec checks linked repo changes:

- archived
- ready to archive
- still active
- unresolved

Prompt feel:

```text
Initiative: add-3ds

Linked change status:
- contracts/add-3ds-contract: complete
- billing-service/add-3ds-billing: complete
- web-client/add-3ds-web: active
- ios-client/add-3ds-ios: unresolved

Archive options:
- Archive completed linked changes only
- Mark initiative partially complete
- Wait until all linked changes are done
```

### Recommended behavior

Allow partial completion states.

Cross-repo work often lands asynchronously.

---

## Setup Journeys

The setup path needs to feel lightweight.

## Journey 12: Day-Zero Setup For A Single Repo User

### Steps

1. `cd repo`
2. `openspec init`
3. open agent in repo
4. run `/opsx:propose`

No workspace concepts shown.

---

## Journey 13: Day-Zero Setup For A Monorepo Team

### Steps

1. `cd monorepo`
2. `openspec init`
3. optionally add scope markers for major owned areas
4. run `openspec update`
5. open agent in monorepo root

During planning, OpenSpec asks for scope selection when needed.

No separate workspace admin step is required.

---

## Journey 14: Day-Zero Setup For A Multi-Repo Team

### Steps

1. each repo independently runs `openspec init`
2. user creates a coordination workspace only when cross-repo work arises
3. user links repo IDs to local clones as needed
4. user opens the agent in the coordination workspace for planning

This is important:

The system should not require a platform team to pre-register every repo before any real work can begin.

---

## Agent Instruction Requirements

When OpenSpec creates a coordination workspace, it should generate agent-facing files.

Minimum contents:

1. initiative summary
2. selected scopes
3. owning roots and resolved paths
4. unresolved roots
5. storage rules
6. implementation limitations for the current tool if known

### Example `claude.md`

```md
You are working on initiative `add-3ds`.

Resolved roots:
- /Users/me/work/contracts
- /Users/me/work/web-client

Unresolved roots:
- github.com/Fission-AI/billing-service
- github.com/Fission-AI/ios-client

Ownership:
- contracts owns shared checkout contract
- web-client owns web checkout behavior

Rules:
- Canonical specs must be edited in owning roots
- Initiative-level notes live in this coordination workspace
- Cross-repo references are informational only
```

This file should be generated for any supported agent integration that benefits from deterministic startup context.

---

## Scenarios Summary

### Happy paths

1. Single repo, one change
2. Monorepo, one scope
3. Monorepo, multiple scopes
4. Large monorepo, coordination-style initiative
5. Multi-repo, all roots locally available
6. Multi-repo, partial local availability

### Important transitions

1. Single repo request escalates into multi-repo
2. Monorepo request escalates into coordination-style planning
3. Planning workspace hands off to repo-local implementation
4. Partial cross-repo completion at archive time
5. Initiative-only shared behavior gets promoted into a canonical shared contract

---

## Edge Cases

### 1. User starts in the "wrong" repo

Example:

- User starts in `web-client`
- Work actually spans `contracts`, `web-client`, `ios-client`

Expected behavior:

- OpenSpec recommends creating a coordination workspace
- It does not bury the whole initiative inside `web-client`

### 2. User wants the initiative stored elsewhere

Expected behavior:

- allow explicit path selection
- remember recent workspace locations if useful

### 3. Two local clones match the same repo identifier

Expected behavior:

- prompt user to choose one
- optionally save preferred mapping locally

### 4. Repo identifier cannot be resolved

Expected behavior:

- store as unresolved
- allow planning to continue
- block implementation for that root only

### 5. Monorepo has no explicit scope metadata

Expected behavior:

- infer likely scopes from structure and specs
- let the user confirm
- offer to save the selection model later

### 6. Scope selection is too broad

Expected behavior:

- warn user that many scopes will be pulled into planning
- suggest narrowing

### 7. Shared contract ownership is ambiguous

Expected behavior:

- require one canonical owner
- other scopes/repos can reference it, not co-own it implicitly

### 7A. No existing shared owner makes sense

Expected behavior:

- let the team keep the behavior as initiative-only temporarily
- explicitly mark it as draft and non-canonical
- prompt for promotion later if it starts behaving like a long-lived contract

### 8. Agent cannot truly work across roots

Expected behavior:

- use coordination workspace for planning only
- guide user into per-root apply flows

### 9. Workspace goes stale

Examples:

- repo moved on disk
- repo renamed
- remote URL changed

Expected behavior:

- `openspec workspace doctor` or equivalent relinks roots
- initiative metadata remains stable because identifiers are durable, paths are not

### 10. One repo is archived or intentionally deferred

Expected behavior:

- initiative can remain partially complete
- not every linked root must land simultaneously

### 11. Users do not want admin-managed setup in giant monorepos

Expected behavior:

- scope discovery should be local and incremental
- setup should not require one central team to define everything first

### 12. Users want ad hoc multi-repo work only once

Expected behavior:

- allow a one-off coordination workspace
- do not force long-lived workspace management

### 13. Teams want to share a coordination workspace

Expected behavior:

- support a committed shared coordination repo or workspace
- keep machine-specific resolution data local
- let each teammate resolve project IDs independently

### 14. Cross-team initiatives need different ownership roles

Expected behavior:

- distinguish initiative sponsor from canonical shared contract owner
- make both visible in workspace metadata and agent instructions

---

## Product Decisions This UX Implies

If OpenSpec adopts these journeys, several design conclusions follow.

### 1. Multi-repo planning needs a first-class coordination workspace

Without this, OpenSpec has no honest answer to where the user should stand or where the cross-repo initiative should live.

### 2. Repo-local changes and canonical specs should stay in owners

Without this, OpenSpec creates duplicate or misleading sources of truth.

### 3. Large monorepos cannot be treated as always-simple single roots

OpenSpec must support both:

- one-root monorepo changes
- coordination-style monorepo initiatives

### 4. Discovery and resolution are different systems

OpenSpec must separately handle:

- identifying scopes
- resolving local paths for durable project identifiers

### 5. Agent startup context needs explicit generation

Cross-root planning only works reliably if OpenSpec writes deterministic workspace context for the agent.

### 6. References should stay informational in v1

If OpenSpec validates cross-root references by default, it has effectively shipped a dependency graph system.

That should be a later, optional capability.

### 7. Shared contract creation needs a guided ownership flow

Without this, teams will either:

- duplicate shared behavior across repos
- assign ownership accidentally
- or avoid creating cross-boundary specs altogether

OpenSpec should help users choose among:

- existing shared owner
- existing domain owner
- new shared contract scope
- initiative-only draft mode

### 8. Shared coordination needs a two-layer storage model

To support teams and orgs cleanly, OpenSpec should distinguish:

- committed shared initiative metadata
- local machine-specific path resolution

Without that split, the UX will either:

- fail to scale beyond one user, or
- leak machine-specific state into shared artifacts

---

## Open Questions

These journeys intentionally leave some implementation choices open.

1. Should a coordination workspace always be user-visible on disk, or may it optionally live in global OpenSpec data directories?
2. Should monorepo coordination-style initiatives reuse the same workspace concept as multi-repo, or use a lighter in-repo variant?
3. Should OpenSpec support nested `openspec/` roots, or keep one root and model scopes separately?
4. What is the minimum metadata required to represent selected scopes and linked changes?
5. What is the exact format split between committed shared workspace state and local overlay state?
6. Which agents should receive generated workspace instructions, and in what format?
7. What exact CLI surface should create and manage coordination workspaces?

---

## Recommended Next Step

Convert these journeys into a concrete design proposal covering:

1. coordination workspace file format
2. scope metadata shape
3. repo identifier and local resolution model
4. linked change model
5. shared manifest vs local overlay model
6. CLI commands for create, attach, doctor, sync, and archive flows
7. agent instruction generation for supported tools
