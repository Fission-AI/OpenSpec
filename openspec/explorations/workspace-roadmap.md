# Workspace Roadmap

## Purpose

This document proposes a lightweight roadmap for workspace, monorepo, and multi-repo support in OpenSpec.

It assumes:

- single-repo is the current default experience
- monorepo pain is already real
- multi-repo coordination is not hypothetical
- large engineering organizations already need this

This roadmap is intentionally staged.

The goal is not to build the full conceptual system at once.

The goal is to ship the smallest credible version of cross-boundary support while preserving a path to a stronger long-term model.

---

## Product Principle

> Prefer the smallest feature set that solves real cross-boundary work without blocking the likely long-term direction.

This means:

- do not overbuild governance before usage proves it
- do not underbuild coordination if real teams already need it
- do not add complexity to the single-repo path unless it clearly pays for itself

---

## What We Believe Now

Based on the current exploration work, several things look increasingly clear.

### 1. Nested spec organization is needed

OpenSpec needs a better way to organize:

- shared contracts
- local implementation specs
- multi-area behavior inside one root

### 2. Informational references are low-risk and useful

References help agents and humans navigate related specs without requiring OpenSpec to build a dependency graph system on day one.

### 3. Initiatives plus linked per-repo changes are the right primitive

For true multi-repo work, the likely durable primitive is:

- one initiative as the shared planning object
- one linked change per owning repo as the execution artifact
- stable identifiers connecting them

### 4. Cross-repo work needs a neutral planning location

For multi-repo work, a single repo is not an honest home for the whole planning artifact.

Some form of coordination workspace or coordination repo is needed for the initiative-level plan.

### 5. Team-shared coordination is a real requirement

This is not just a solo-user thought experiment.

Real teams and large engineering orgs already need a way to coordinate multi-repo work.

### 6. The risk is shipping too much at once

Even though the need is real, the full model has many moving parts:

- nested spec paths
- shared contracts
- linked changes
- cross-root planning
- partial repo resolution
- agent capability differences
- team-shared coordination state

The roadmap should sequence these carefully.

---

## Phase 1: Better Structure Inside One Root

### Goal

Reduce pain in single-repo and monorepo setups without introducing coordination machinery yet.

### Ship

1. Nested spec paths within one `openspec/` root
2. Informational `references` in specs
3. Better filtering of relevant spec paths during planning
4. Better handling of multi-area changes inside one root

### User value

- monorepo users can organize shared and local specs more naturally
- large roots become less noisy
- shared contracts inside one root become easier to model

### Do not ship yet

- coordination workspaces
- linked multi-repo changes
- team-shared coordination repos
- sponsor/owner workflow machinery

### Success criteria

- users can model large monorepos without flattening everything at the top level
- users can represent shared contracts inside one root
- planning context gets smaller and more relevant

---

## Phase 2: Thin Cross-Repo Coordination

### Goal

Support real multi-repo planning demand with the thinnest credible coordination layer.

### Ship

1. Initiative artifacts for shared planning in a neutral coordination workspace or coordination repo
2. Linked per-repo changes using stable project identifiers
3. Explicit repo linking via project IDs
4. Resolution through:
   - explicit input
   - git remote matching
5. Partial-resolution support
6. Basic agent handoff instructions for coordinated planning

### User value

- users have an honest place to stand for multi-repo work
- cross-repo plans are no longer buried in one repo
- shared planning and repo-local execution are clearly separated
- ownership stays with the real repos
- agents can be told what roots matter

### Key constraints

This phase should remain thin.

Avoid:

- dependency validation across repos
- rich governance flows
- too many new abstractions in the CLI
- heavyweight local/shared state semantics

### v1 shape

This phase should feel like:

- local planning by default
- upgrade to a coordinated initiative when needed
- initiative-level planning in the coordination workspace
- linked repo-local changes underneath

Not like:

- a whole second product mode with many admin concepts

### Success criteria

- teams can coordinate multi-repo changes without inventing ad hoc spreadsheets or naming conventions
- users understand where planning lives and where implementation lives
- agents can plan across roots in a way that is operationally usable

---

## Phase 3: Team-Shared Coordination Hardening

### Goal

Make coordinated planning work cleanly across teammates and teams.

### Ship

1. Shared coordination repo/workspace support as a first-class pattern
2. Clear split between:
   - committed shared initiative state
   - local machine-specific path resolution
3. Lightweight relinking / repair flows
4. Better onboarding for teammates joining an initiative
5. Better agent instruction generation for shared workspaces

### User value

- teams can share a stable cross-repo initiative
- each teammate can map project IDs to their own local clones
- new participants can join without reverse-engineering how the initiative is set up

### Important constraint

The local side of this model should stay as thin as possible.

The ideal local layer is:

- regenerable
- non-authoritative
- not semantically important beyond path resolution

### Success criteria

- team-shared coordination works without local path leakage into committed state
- joining an initiative feels lightweight
- maintenance cost stays acceptable

---

## Phase 4: Shared Contract and Governance Maturity

### Goal

Support organizations that need stronger contract ownership and more formal cross-boundary planning.

### Ship only if demand justifies it

1. Guided shared contract ownership flows
2. Promotion of initiative-only draft behavior into canonical shared contracts
3. Stronger role visibility:
   - canonical shared contract owner
   - initiative sponsor/driver
4. Optional linting or policy checks
5. Optional validation around missing owners or unresolved references

### User value

- larger orgs can create durable shared contracts cleanly
- governance becomes explicit where needed
- cross-team ownership becomes easier to understand

### Important constraint

This should not become mandatory for normal users.

These features should remain:

- opt-in
- advanced
- proportional to org complexity

### Success criteria

- shared-contract workflows solve real org-scale problems without making normal planning feel bureaucratic

---

## What Should Not Be Delayed

Because demand is already real, some things should not be treated as purely future work.

### Should happen soon

- nested spec paths
- references
- initiative artifact + linked change primitive
- stable project identifiers
- thin coordination layer for multi-repo planning

### Can wait

- rich ownership workflows
- strong dependency semantics
- broad policy and governance features
- too much agent-specific machinery

---

## UX Guardrails Across All Phases

No matter the phase, the UX should follow these rules.

### 1. Default local

Users should start where they already are.

### 2. Escalate only when necessary

Coordinated planning should appear as an upgrade path, not the default mode.

### 3. Keep advanced concepts mostly implicit

Only expose concepts like shared owners, sponsor roles, overlays, and manifests when the user truly needs to decide something.

### 4. Canonical storage follows ownership

Specs and repo-local changes stay with the owning root.

### 5. Shared coordination is not canonical spec storage

Coordination data helps planning, but does not replace the source of truth.

### 6. Hidden local state must stay thin

If OpenSpec uses local path caches or machine-specific mappings, they should be:

- repairable
- replaceable
- non-authoritative

---

## Likely Deliverable Sequence

If this roadmap were translated into actual change proposals, the sequence would likely be:

1. nested spec paths + references
2. monorepo scope filtering and multi-area planning improvements
3. initiative artifact for shared planning
4. linked change metadata across repos
5. thin coordination workspace / repo for multi-repo planning
6. team-shared coordination hardening
7. optional shared contract maturity features

---

## Open Risks

### 1. Coordination may still be too heavy in v1

Even a thin coordination layer may feel like too much if the handoff is clumsy.

### 2. Hidden local state may become more important than intended

If path resolution or local repo linking becomes semantically important, the system will become harder to trust and debug.

### 3. Monorepo and multi-repo may diverge unintentionally

The product should resist evolving two completely separate mental models.

### 4. Agent capability differences may distort the design

The UX should not assume every coding agent handles multi-root planning equally well.

### 5. Team-scale needs may pressure early governance

Large orgs may quickly ask for ownership, permissions, and review structures. That should not force all users into heavyweight flows.

---

## Summary

The roadmap should not be:

- "wait on multi-repo until later"

Because the demand is already real.

It also should not be:

- "build the full workspace model now"

Because the complexity surface is too large.

The right roadmap is:

1. improve structure inside one root
2. ship a thin but real coordination layer for multi-repo work
3. harden team-shared coordination
4. add more formal shared contract and governance support only as justified
