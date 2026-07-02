## Context

The upstream layer (roadmap → requirements → changes) has no home in
OpenSpec. The design constraint: give it one without OpenSpec modeling the
team's workflow — every team's is different.

## Goals / Non-Goals

**Goals:** the thinnest possible wrapper; any artifact shape; one repo or
many; one skill.

**Non-Goals:** typed upstream artifacts, relationship taxonomies, sync
machinery, auto-discovery of unregistered repos.

## Decisions

**1. Destination first; ordered folders when wanted.** The plan is whatever
destination artifact the user already has — one file is valid. Numbered
folders opt into a linear sequence by convention alone ("where am I" carries
the workflow); reconfiguring is renaming folders. Rejected: a schema for the
plan (types the artifacts — the thing users want to keep freeform). If
checking is ever wanted, stages can later map onto the existing schema
machinery.

**2. Changes reference upward.** `plan: local | <store-id>` in change
metadata; rollup scans for it. Rejected: a downward manifest — a central file
invites merge conflicts and goes stale when someone forgets it. The store is
the parent/global level; repos are children pointing up, so there is no
local-vs-store precedence question left to arbitrate.

**3. One explore-style skill.** The translation judgment (decompose into
self-contained items, flag merge/split calls, filter input against the
vision, write one-page artifacts) lives in the `openspec-plan` skill prompt,
not in code. Rejected: per-stage commands or role-based skills — navigation
derives from what is on disk, so anyone can pick the work up.

## Risks / Trade-offs

- [Scan cost across registered repos] → registries are small; scan is
  per-invocation and read-only.
- [`plan:` values are unvalidated against real stores] → rollup simply finds
  nothing for a bad value; the skill and `list --plan` make that visible.

## Migration Plan

Additive only. Legacy `initiative:` metadata remains readable; nothing else
existed to migrate.

## Open Questions

None blocking. Naming ("plan") is the simplest word we had; cheap to change
while beta.
