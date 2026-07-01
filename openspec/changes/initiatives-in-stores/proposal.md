## Why

A team's biggest work is never one change — it is an *initiative*: a brief, the
artifacts the team works from (personas, decisions, whatever they use), and the
changes that carry it out. OpenSpec has no shared home for that today, so it
lives in someone's head or a stray doc.

Stores (beta) give planning its own repo. And OpenSpec already lets a team
**define its own artifact types** in a schema — something Kiro, Spec-Kit, and
GSD do not. Put those two together and OpenSpec can do what none of them can:
**a shared initiative, with your own artifacts, read by every repo.**

The blocker is that artifact discovery is not store-aware. `openspec schemas`,
`openspec templates`, and `openspec view` look only at the current repo. So a
repo that *references* a store cannot see the store's initiatives or custom
artifact types, and there is no rule for what happens when a local initiative
and a store initiative share a name. This change closes that gap.

## What Changes

### 1. Store-aware artifact and schema discovery

Make discovery follow references. When a repo references a store, its custom
artifact types and initiatives become discoverable from that repo:

- `openspec schemas --store <id>` lists a store's schemas (today it is cwd-only).
- Referenced stores' schemas and initiatives appear in `openspec context` and in
  the agent instruction block, each with a one-line summary and a fetch command.

### 2. Initiative precedence: canonical vs. shadow

Define the rule the owner asked about — a local initiative vs. a store one of the
same name:

- The **store initiative is canonical.** A local initiative with the same id is a
  **shadow** — you keep working locally, but OpenSpec tells you it shadows the
  canonical one, so nothing diverges silently.
- This reuses the shadowing model OpenSpec already applies to schemas (project
  shadows user shadows package), surfaced the same way `openspec schema which`
  surfaces it.

### 3. Initiative as a first-class, checkable grouping

An initiative is a folder with a brief and the changes it groups. Give it just
enough structure to be checked and rolled up — no revival of the old
heavyweight initiative command groups.

- `openspec list --initiatives [--store <id>]` lists initiatives and rolls up the
  live status of the changes each one groups.

## Capabilities

### New Capabilities
- `store-aware-artifacts`: discover and resolve a store's schemas, artifact
  types, and initiatives from a repo that references it, with a defined
  canonical-vs-shadow precedence rule.

### Modified Capabilities
None.

## Impact

- Affected commands: `schemas`, `context`, `instructions`, `list` (additive
  `--store` / `--initiatives` behavior; existing behavior unchanged).
- Affected core: artifact-graph resolver (accept a store root), root-selection
  (initiative precedence).
- No breaking changes. Everything degrades to today's cwd-only behavior when no
  store is referenced.
