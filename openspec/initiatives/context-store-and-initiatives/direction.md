# Context Store And Initiatives Direction

This document captures the suggested direction from the workspace/initiative
discussion. The main shift is that "workspace" should not be the durable shared
planning object. The durable shared object is a synced context store, and
initiatives are one opinionated collection inside it.

## Core Model

```text
Context Store
  = synced shared content container

Collection
  = mounted content system inside a store

Initiatives
  = first major collection for cross-team implementation context

Workspace
  = local working view over context stores and repos

Change
  = repo/team-owned implementation plan
```

The clean rule:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Locked Product Boundary

The workspace-to-initiative pivot is now the product boundary for future
coordination work:

- A workspace is a regenerable, machine-local working view. It maps context
  stores, initiatives, projects, repos, and folders to paths the current user can
  open.
- A context store is the durable synced container for shared files.
- An initiative is the durable coordination object for cross-team or cross-repo
  implementation context.
- A repo-local change remains the implementation plan owned by the repo or team
  doing the work.

This supersedes the older model where a workspace-level `changes/` tree owned
the canonical shared plan for cross-repo work. Existing workspace-planning
behavior can remain as beta or legacy infrastructure, but it should not steer
new lifecycle design.

Workspace roadmap disposition:

- Keep setup, link, relink, list, open, update, and doctor.
- Keep linked repos and folders visible for exploration before a change exists.
- Keep workspace-local agent guidance as local view setup, refreshed by
  `workspace update`.
- Defer workspace apply, verify, and archive until initiatives can link to
  repo-owned OpenSpec changes.
- Defer branch/worktree orchestration, multi-repo apply, strong cross-repo
  validation, and dependency graph enforcement.

## Agent-First UX

The primary user experience for initiatives is expected to be agent-driven:

```text
Using initiative billing-launch, explore the API work and create a proposal.
```

The user should not need to know every command. OpenSpec should expose small,
structured CLI primitives that an agent can use to:

- find the intended initiative across registered context stores
- read canonical initiative files from the context store
- create or link a repo-local OpenSpec change
- use workspace state for local repo and folder views
- respect edit boundaries instead of treating every opened folder as editable

The CLI is therefore the agent's tool surface, not the whole user workflow.
Prefer explicit, machine-readable commands such as `initiative show --json`,
`new change --initiative ...`, and workspace local-view commands over broad
interactive flows as the first slice.

Canonical initiative context should stay in the context store. Repo-local
changes should reference the initiative rather than checking in copied snapshots
of initiative prose. If an agent needs a compact context pack, OpenSpec can
generate that as command output from the live initiative context.

## Context Store

A context store is the shared/synced folder of files. It is content-agnostic.
It should not know what an initiative is.

Example:

```text
acme-context/
  initiatives/
  decisions/
  api-catalog/
  playbooks/
```

The first backend should be Git:

```text
create/update/delete files
  -> commit
  -> push
  -> other users pull
  -> local views update
```

But the application should talk to a store abstraction, not directly to Git, so
the backend can later become a cloud database.

## Backend

A backend provides persistence and sync for a context store.

Examples:

- `git` backend: local clone, pull, commit, push, watch
- `cloud` backend: database records, subscriptions, hosted sync
- `memory` backend: tests and local prototypes

The backend should expose generic file/object operations:

```text
read
write
delete
list
sync
watch
```

It should not contain initiative-specific behavior.

## Collections

A collection is a mounted content system inside a context store. It is
plugin-like, but "collection" is the user-facing term.

Each collection owns:

- a folder namespace
- a content model
- templates
- validation/rules
- optional agent guidance
- optional UI views

Example:

```text
context-store/
  initiatives/      # Initiative collection
  decisions/        # Decision collection
  api-catalog/      # API catalog collection
```

Core should enforce that a collection only writes inside its mount.

## Initiative Collection

The initiative collection is the first enterprise-oriented collection.

An initiative is shared, agent-consumable implementation context for a
coordinated outcome. It can span teams, repos, services, APIs, contracts, and
capabilities.

Default shape:

```text
initiatives/
  launch-billing-flow/
    initiative.yaml
    requirements.md
    design.md
    contracts/
    decisions.md
    questions.md
    tasks.md
```

This describes the runtime initiative collection shape in context stores. This
roadmap folder may still contain legacy `.initiative.yaml` progress metadata
while the initiative itself is being used to manage the migration; that legacy
tracker is not the model new context-store initiatives should copy.

The default structure should be opinionated for the enterprise design
partnership, but the collection system should allow other structures later.

## Initiative Responsibilities

Initiatives should own implementation-relevant shared context:

- product/program intent
- accepted requirements
- high-level technical coordination
- capability and ownership maps
- API/event/schema contracts
- dependency assumptions
- decisions and open questions
- workspace-readable context for repo-local implementation work

Initiatives should not try to become all of Jira or Confluence. The focused
positioning is:

```text
OpenSpec stores agreed implementation context.
Jira tracks work.
Confluence stores broad prose.
GitHub/GitLab store code.
```

## Initiative And Change Scope

An initiative can span one or many OpenSpec changes.

Those changes may live:

- in the same repo as the initiative
- in different repos
- in multiple context stores or OpenSpec roots later

The initiative stores shared coordination context. Workspace views can associate
that context with local repos and repo-owned changes without making the
initiative store machine-local checkout links.

This keeps grouping separate from storage:

```text
Initiative = shared grouping/context
Change     = execution artifact
Workspace  = local opened view of initiative + repos
```

## Workspace

A workspace is a local working view, not the source of truth.

It can map context stores and project identifiers to local paths, configure an
opener, and launch coding agents with the right folders visible.

A workspace can open an initiative by resolving:

- the initiative's context store
- locally selected repo-local changes
- local checkout paths for participating repos

The durable workspace record should stay tiny and private. It records this
runtime's local view choices, not generated agent files or shared initiative
content.

```text
getGlobalDataDir()/workspaces/<workspace-name>/
  workspace.yaml
```

The workspace name is the local identity. The workspace record can optionally
store a selected context store and initiative, plus stable link names to local
paths and opener preferences. Initiative references are data inside the record,
not path segments.

Opening a workspace materializes opener-specific runtime files at the managed
workspace root. Those files can contain generated agent guidance, skills,
and editor workspace files. Machine-readable context is returned by JSON command
output. These are regenerated local support, not source of truth.

```text
private local view record
  -> generated runtime files
  -> opener-specific launch
  -> initiative context + selected local repos/folders
```

Workspaces should be regenerable and runtime-specific. They should not be the
canonical home for initiative content, checked-in collaboration state, branches,
worktrees, clones, or implementation progress.

## Repo Changes

Repo-local changes remain the team-owned implementation plan.

An engineering team should be able to pull relevant initiative context into a
repo and create a linked OpenSpec change.

Example:

```text
repo/
  openspec/
    changes/
      add-billing-api/
        .openspec.yaml
        proposal.md
        design.md
        specs/
        tasks.md
```

The local change should reference the initiative in metadata, for example:

```yaml
initiative:
  store: platform
  id: billing-launch
```

This metadata is durable repo context and should be checked in. It should not
contain machine-local paths. Agents should read the initiative's canonical files
from the registered context store when they need the shared context.

## Relationship Between Concepts

```text
Context Store
  contains Collections

Collection
  defines structure/rules for a mounted folder

Initiative Collection
  defines initiatives/

Initiative
  coordinates one shared outcome

Workspace
  opens local views of context stores and repos

Repo Change
  implements one team's/repo's part of an initiative
```

End-to-end flow:

```text
Product/program/architect creates initiative
  -> initiative syncs through context store
  -> engineers open local workspace
  -> repo team pulls relevant initiative context
  -> repo team creates linked OpenSpec change
  -> repo team implements locally
  -> workspace view surfaces local progress alongside initiative context
```

## Local API Direction

The app should use dependency injection:

```ts
const store = createStore({
  id: "acme-context",
  backend: gitBackend({
    remote: "git@github.com:acme/context.git",
    localPath: "~/.openspec/stores/acme-context",
    autoSync: true,
  }),
  collections: [
    initiativeCollection({ mount: "initiatives" }),
  ],
});
```

Usage:

```ts
const initiatives = store.collection("initiatives");

await initiatives.create({ id: "launch-billing-flow" });
await initiatives.update("launch-billing-flow", patch);
await store.sync();
```

Important separation:

```text
Git backend knows Git.
Store knows sync/lifecycle/events.
Collection knows content structure.
Initiative collection knows initiatives.
```

## UI Direction

The UI should be content-agnostic at the core:

- browse folders/files
- edit Markdown/YAML
- preview content
- search
- show diffs/history
- sync status

Collections can add richer views:

- initiative status view
- contract table
- owner/dependency graph
- linked repo-change view

The UI should work no matter which collections are mounted.

## Open Questions

- What is the first concrete context store command surface?
- Should stores be called `context`, `store`, or something more product-facing?
- Where should enterprise context stores live by default: customer GitHub,
  OpenSpec-managed Git, or later hosted cloud?
- How do non-technical users edit Git-backed content without feeling Git?
- What is the minimum viable auto-sync behavior before conflict handling gets
  painful?
- How does an initiative contract graduate into a canonical owner repo contract?
- How should linked repo changes report status back into an initiative without
  becoming Jira?
- How should monorepos map capabilities, folders, and repo-local changes?
- What should the first repo-change linking command be called?
- Which initiative progress/status signals are useful after linked changes
  exist?

## Suggested Next Direction

After the initial store, collection, and initiative create/list foundations,
build the next slices in this order:

1. Reconcile the Initiative MVP around create/list, validation, templates, and
   explicit deferral of read/update/delete policy.
2. Add minimal context-store UX for setup, registration, listing, and doctoring.
3. Add agent-first initiative discovery with `initiative show --json` and
   registered-store lookup.
4. Add repo-local change metadata and an agent-friendly create/link flow for
   `--initiative`.
5. Reject standalone `initiative resolve`; local path mapping belongs to
   workspaces, not initiative commands.
6. Let workspaces open initiative-aware local views once show/link semantics
   exist.
7. Add local-to-initiative escalation UX.
8. Harden team-shared coordination, sync, conflict guidance, and progress
   status after real usage shapes those needs.
